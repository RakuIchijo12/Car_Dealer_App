import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { unlink, rm, mkdir, rename } from 'fs/promises';
import { join, extname } from 'path';
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
  sortBy?: 'year' | 'price' | 'mileage' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}

const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads');
const SPIN_DIR = join(UPLOADS_DIR, 'spin');

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
      qb.andWhere('(car.model ILIKE :search OR car.vin ILIKE :search OR make.name ILIKE :search)', {
        search: '%' + filters.search + '%',
      });
    }

    const allowedSorts = ['year', 'price', 'mileage', 'createdAt'];
    const sortField = allowedSorts.includes(filters.sortBy ?? '')
      ? (filters.sortBy as string)
      : 'createdAt';
    const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy('car.' + sortField, sortOrder);

    return qb.getMany();
  }

  async findOne(id: number) {
    const car = await this.carRepo.findOne({ where: { id }, relations: { make: true } });
    if (!car) throw new NotFoundException('Car not found');
    return car;
  }

  async create(dto: CreateCarDto, photo?: string, gallery: string[] = []) {
    const car = this.carRepo.create({
      ...dto,
      photo,
      images: gallery.length ? gallery : undefined,
    });
    return this.carRepo.save(car);
  }

  async update(id: number, dto: UpdateCarDto, photo?: string, gallery: string[] = []) {
    const car = await this.findOne(id);
    const previousPhoto = car.photo;

    Object.assign(car, dto);
    if (photo) car.photo = photo;
    if (gallery.length) car.images = [...(car.images ?? []), ...gallery];

    const saved = await this.carRepo.save(car);

    // Replacing the cover photo orphans the old file — clean it up.
    if (photo && previousPhoto && previousPhoto !== photo) {
      await this.deleteUpload(previousPhoto);
    }
    return saved;
  }

  async remove(id: number) {
    const car = await this.findOne(id);
    const files = [car.photo, ...(car.images ?? [])].filter(Boolean) as string[];
    const removed = await this.carRepo.remove(car);
    await Promise.all(files.map((f) => this.deleteUpload(f)));
    await rm(join(SPIN_DIR, String(id)), { recursive: true, force: true }).catch(() => undefined);
    return removed;
  }

  async removeImage(id: number, filename: string) {
    const car = await this.findOne(id);
    if (car.photo === filename) car.photo = null as unknown as string;
    car.images = (car.images ?? []).filter((i) => i !== filename);
    const saved = await this.carRepo.save(car);
    await this.deleteUpload(filename);
    return saved;
  }

  /**
   * Replaces a vehicle's 360 turntable with an uploaded sequence.
   * Files arrive in the order the operator selected them, which is the order
   * they were shot walking around the car.
   */
  async setSpin(id: number, files: Express.Multer.File[]) {
    const car = await this.findOne(id);
    const dir = join(SPIN_DIR, String(id));

    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    await mkdir(dir, { recursive: true });

    for (let i = 0; i < files.length; i++) {
      const name = String(i).padStart(3, '0') + extname(files[i].originalname).toLowerCase();
      await rename(files[i].path, join(dir, name));
    }

    car.spinFrames = files.length;
    return this.carRepo.save(car);
  }

  async clearSpin(id: number) {
    const car = await this.findOne(id);
    await rm(join(SPIN_DIR, String(id)), { recursive: true, force: true }).catch(() => undefined);
    car.spinFrames = 0;
    return this.carRepo.save(car);
  }

  async setStatus(id: number, status: CarStatus) {
    const car = await this.findOne(id);
    car.status = status;
    return this.carRepo.save(car);
  }

  markAsSold(id: number) {
    return this.setStatus(id, CarStatus.SOLD);
  }

  async toggleFeatured(id: number) {
    const car = await this.findOne(id);
    car.featured = !car.featured;
    return this.carRepo.save(car);
  }

  /** Everything the admin dashboard renders, in one round trip. */
  async getStats() {
    const [total, available, sold, reserved] = await Promise.all([
      this.carRepo.count(),
      this.carRepo.count({ where: { status: CarStatus.AVAILABLE } }),
      this.carRepo.count({ where: { status: CarStatus.SOLD } }),
      this.carRepo.count({ where: { status: CarStatus.RESERVED } }),
    ]);

    const makesRaw = await this.carRepo
      .createQueryBuilder('car')
      .select('COUNT(DISTINCT car.makeId)', 'count')
      .getRawOne<{ count: string }>();

    const valueRaw = await this.carRepo
      .createQueryBuilder('car')
      .select('COALESCE(SUM(car.price), 0)', 'sum')
      .addSelect('COALESCE(AVG(car.price), 0)', 'avg')
      .where('car.status != :sold', { sold: CarStatus.SOLD })
      .getRawOne<{ sum: string; avg: string }>();

    const soldValueRaw = await this.carRepo
      .createQueryBuilder('car')
      .select('COALESCE(SUM(car.price), 0)', 'sum')
      .where('car.status = :sold', { sold: CarStatus.SOLD })
      .getRawOne<{ sum: string }>();

    const byMake = await this.carRepo
      .createQueryBuilder('car')
      .leftJoin('car.make', 'make')
      .select('make.name', 'name')
      .addSelect('COUNT(*)', 'count')
      .groupBy('make.name')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<{ name: string | null; count: string }>();

    const byBodyType = await this.carRepo
      .createQueryBuilder('car')
      .select('car.bodyType', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('car.bodyType IS NOT NULL')
      .groupBy('car.bodyType')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<{ name: string; count: string }>();

    const mostViewed = await this.carRepo.find({
      order: { views: 'DESC' },
      take: 5,
      relations: { make: true },
    });

    return {
      total,
      available,
      sold,
      reserved,
      totalMakes: parseInt(makesRaw?.count ?? '0', 10) || 0,
      inventoryValue: Number(valueRaw?.sum ?? 0),
      averagePrice: Number(valueRaw?.avg ?? 0),
      soldValue: Number(soldValueRaw?.sum ?? 0),
      byMake: byMake
        .filter((m) => m.name)
        .map((m) => ({ name: m.name as string, count: parseInt(m.count, 10) })),
      byBodyType: byBodyType.map((b) => ({ name: b.name, count: parseInt(b.count, 10) })),
      mostViewed,
    };
  }

  getRecent(limit = 5) {
    return this.carRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: { make: true },
    });
  }

  /** Best-effort file removal; a missing file must not fail the request. */
  private async deleteUpload(filename: string) {
    try {
      await unlink(join(UPLOADS_DIR, filename));
    } catch {
      /* already gone */
    }
  }
}
