import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Car, CarStatus } from './car.entity';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';

export interface CarFilters {
  makeId?: number;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  status?: CarStatus;
  search?: string;
  sortBy?: 'year' | 'price' | 'mileage';
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class CarsService {
  constructor(@InjectRepository(Car) private carRepo: Repository<Car>) {}

  async findAll(filters: CarFilters = {}) {
    const qb = this.carRepo.createQueryBuilder('car').leftJoinAndSelect('car.make', 'make');

    if (filters.makeId) qb.andWhere('car.makeId = :makeId', { makeId: filters.makeId });
    if (filters.status) qb.andWhere('car.status = :status', { status: filters.status });
    if (filters.yearMin) qb.andWhere('car.year >= :yearMin', { yearMin: filters.yearMin });
    if (filters.yearMax) qb.andWhere('car.year <= :yearMax', { yearMax: filters.yearMax });
    if (filters.priceMin) qb.andWhere('car.price >= :priceMin', { priceMin: filters.priceMin });
    if (filters.priceMax) qb.andWhere('car.price <= :priceMax', { priceMax: filters.priceMax });
    if (filters.search) {
      qb.andWhere('(car.model ILIKE :search OR car.vin ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'DESC';
    qb.orderBy(`car.${sortField}`, sortOrder);

    return qb.getMany();
  }

  async findOne(id: number) {
    const car = await this.carRepo.findOne({ where: { id }, relations: { make: true } });
    if (!car) throw new NotFoundException('Car not found');
    return car;
  }

  async create(dto: CreateCarDto, photoPath?: string) {
    const car = this.carRepo.create({ ...dto, photo: photoPath });
    return this.carRepo.save(car);
  }

  async update(id: number, dto: UpdateCarDto, photoPath?: string) {
    const car = await this.findOne(id);
    Object.assign(car, dto);
    if (photoPath) car.photo = photoPath;
    return this.carRepo.save(car);
  }

  async remove(id: number) {
    const car = await this.findOne(id);
    return this.carRepo.remove(car);
  }

  async markAsSold(id: number) {
    const car = await this.findOne(id);
    car.status = CarStatus.SOLD;
    return this.carRepo.save(car);
  }

  async getStats() {
    const total = await this.carRepo.count();
    const available = await this.carRepo.count({ where: { status: CarStatus.AVAILABLE } });
    const sold = await this.carRepo.count({ where: { status: CarStatus.SOLD } });
    const reserved = await this.carRepo.count({ where: { status: CarStatus.RESERVED } });
    const makes = await this.carRepo
      .createQueryBuilder('car')
      .select('COUNT(DISTINCT car.makeId)', 'count')
      .getRawOne();

    return { total, available, sold, reserved, totalMakes: parseInt(makes.count) || 0 };
  }

  async getRecent(limit = 5) {
    return this.carRepo.find({ order: { createdAt: 'DESC' }, take: limit, relations: { make: true } });
  }
}
