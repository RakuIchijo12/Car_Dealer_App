import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Make } from '../makes/make.entity';
import { Car, CarStatus } from '../cars/car.entity';

@Controller('public')
export class PublicController {
  constructor(
    @InjectRepository(Make) private makeRepo: Repository<Make>,
    @InjectRepository(Car) private carRepo: Repository<Car>,
  ) {}

  @Get('makes')
  getMakes() {
    return this.makeRepo.find({ order: { name: 'ASC' } });
  }

  @Get('cars')
  async getCars(@Query('makeId') makeId?: string, @Query('search') search?: string) {
    const qb = this.carRepo
      .createQueryBuilder('car')
      .leftJoinAndSelect('car.make', 'make')
      .where('car.status = :status', { status: CarStatus.AVAILABLE });

    if (makeId) qb.andWhere('car.makeId = :makeId', { makeId: +makeId });
    if (search) qb.andWhere('(car.model ILIKE :s OR make.name ILIKE :s)', { s: `%${search}%` });

    qb.orderBy('car.createdAt', 'DESC');
    return qb.getMany();
  }

  @Get('cars/by-make')
  async getCarsByMake() {
    const makes = await this.makeRepo.find({ order: { name: 'ASC' } });
    const result = await Promise.all(
      makes.map(async (make) => {
        const cars = await this.carRepo.find({
          where: { makeId: make.id, status: CarStatus.AVAILABLE },
          order: { year: 'DESC' },
          take: 6,
        });
        return { ...make, cars };
      }),
    );
    return result.filter((m) => m.cars.length > 0);
  }
}
