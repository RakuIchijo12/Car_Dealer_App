import {
  Controller, Get, Post, Body, Param, Query, ParseIntPipe, UseGuards, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Make } from '../makes/make.entity';
import { Car, CarStatus } from '../cars/car.entity';
import { LeadsService } from '../leads/leads.service';
import { CreateLeadDto } from '../leads/dto/create-lead.dto';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

/** Everything the storefront needs — unauthenticated, read-only apart from enquiries. */
@Controller('public')
export class PublicController {
  constructor(
    @InjectRepository(Make) private makeRepo: Repository<Make>,
    @InjectRepository(Car) private carRepo: Repository<Car>,
    private leadsService: LeadsService,
  ) {}

  /** Brands with a live count of listed units, so the UI never shows an empty brand. */
  @Get('makes')
  async getMakes() {
    const makes = await this.makeRepo.find({ order: { name: 'ASC' } });
    const counts = await this.carRepo
      .createQueryBuilder('car')
      .select('car.makeId', 'makeId')
      .addSelect('COUNT(*)', 'count')
      .where('car.status != :sold', { sold: CarStatus.SOLD })
      .groupBy('car.makeId')
      .getRawMany<{ makeId: number; count: string }>();

    const countMap = new Map(counts.map((c) => [Number(c.makeId), parseInt(c.count, 10)]));
    return makes.map((m) => ({ ...m, carCount: countMap.get(m.id) ?? 0 }));
  }

  /** Headline numbers for the hero strip. */
  @Get('stats')
  async getStats() {
    const [available, reserved, sold, makes] = await Promise.all([
      this.carRepo.count({ where: { status: CarStatus.AVAILABLE } }),
      this.carRepo.count({ where: { status: CarStatus.RESERVED } }),
      this.carRepo.count({ where: { status: CarStatus.SOLD } }),
      this.makeRepo.count(),
    ]);
    return { available, reserved, sold, makes, total: available + reserved + sold };
  }

  @Get('featured')
  getFeatured(@Query('limit') limit?: string) {
    return this.carRepo.find({
      where: { status: CarStatus.AVAILABLE },
      order: { featured: 'DESC', createdAt: 'DESC' },
      take: limit ? Math.min(+limit, 24) : 6,
      relations: { make: true },
    });
  }

  /** Paginated, fully filterable inventory — the storefront's main query. */
  @Get('cars')
  async getCars(
    @Query('makeId') makeId?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('bodyType') bodyType?: string,
    @Query('transmission') transmission?: string,
    @Query('fuelType') fuelType?: string,
    @Query('yearMin') yearMin?: string,
    @Query('yearMax') yearMax?: string,
    @Query('priceMin') priceMin?: string,
    @Query('priceMax') priceMax?: string,
    @Query('mileageMax') mileageMax?: string,
    @Query('seats') seats?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const qb = this.carRepo.createQueryBuilder('car').leftJoinAndSelect('car.make', 'make');

    // Sold units stay hidden unless explicitly requested.
    if (status) qb.andWhere('car.status = :status', { status });
    else qb.andWhere('car.status != :sold', { sold: CarStatus.SOLD });

    if (makeId) qb.andWhere('car.makeId = :makeId', { makeId: +makeId });
    if (bodyType) qb.andWhere('car.bodyType = :bodyType', { bodyType });
    if (transmission) qb.andWhere('car.transmission = :transmission', { transmission });
    if (fuelType) qb.andWhere('car.fuelType = :fuelType', { fuelType });
    if (yearMin) qb.andWhere('car.year >= :yearMin', { yearMin: +yearMin });
    if (yearMax) qb.andWhere('car.year <= :yearMax', { yearMax: +yearMax });
    if (priceMin) qb.andWhere('car.price >= :priceMin', { priceMin: +priceMin });
    if (priceMax) qb.andWhere('car.price <= :priceMax', { priceMax: +priceMax });
    if (mileageMax) qb.andWhere('car.mileage <= :mileageMax', { mileageMax: +mileageMax });
    if (seats) qb.andWhere('car.seats >= :seats', { seats: +seats });
    if (search) {
      qb.andWhere('(car.model ILIKE :s OR make.name ILIKE :s OR car.description ILIKE :s)', {
        s: '%' + search + '%',
      });
    }

    const sortMap: Record<string, [string, 'ASC' | 'DESC']> = {
      price_asc: ['car.price', 'ASC'],
      price_desc: ['car.price', 'DESC'],
      year_desc: ['car.year', 'DESC'],
      year_asc: ['car.year', 'ASC'],
      mileage_asc: ['car.mileage', 'ASC'],
      newest: ['car.createdAt', 'DESC'],
    };
    const [field, dir] = sortMap[sort ?? 'newest'] ?? sortMap['newest'];
    qb.orderBy(field, dir);

    const take = Math.min(Math.max(+(limit ?? 12), 1), 48);
    const currentPage = Math.max(+(page ?? 1), 1);
    qb.skip((currentPage - 1) * take).take(take);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page: currentPage,
      limit: take,
      totalPages: Math.max(Math.ceil(total / take), 1),
    };
  }

  /** Price/year bounds so the filter controls match real inventory. */
  @Get('cars/facets')
  async getFacets() {
    const raw = await this.carRepo
      .createQueryBuilder('car')
      .select('MIN(car.price)', 'minPrice')
      .addSelect('MAX(car.price)', 'maxPrice')
      .addSelect('MIN(car.year)', 'minYear')
      .addSelect('MAX(car.year)', 'maxYear')
      .where('car.status != :sold', { sold: CarStatus.SOLD })
      .getRawOne<{ minPrice: string; maxPrice: string; minYear: string; maxYear: string }>();

    const bodyTypes = await this.carRepo
      .createQueryBuilder('car')
      .select('car.bodyType', 'value')
      .addSelect('COUNT(*)', 'count')
      .where('car.status != :sold', { sold: CarStatus.SOLD })
      .andWhere('car.bodyType IS NOT NULL')
      .groupBy('car.bodyType')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<{ value: string; count: string }>();

    return {
      minPrice: Math.floor(Number(raw?.minPrice ?? 0)),
      maxPrice: Math.ceil(Number(raw?.maxPrice ?? 5000000)),
      minYear: Number(raw?.minYear ?? 2015),
      maxYear: Number(raw?.maxYear ?? new Date().getFullYear()),
      bodyTypes: bodyTypes.map((b) => ({ value: b.value, count: parseInt(b.count, 10) })),
    };
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

  @Get('cars/:id')
  async getCar(@Param('id', ParseIntPipe) id: number) {
    const car = await this.carRepo.findOne({ where: { id }, relations: { make: true } });
    if (!car) throw new NotFoundException('Vehicle not found');

    // Fire-and-forget view counter — analytics must never break the page.
    void this.carRepo.increment({ id }, 'views', 1).catch(() => undefined);

    return car;
  }

  /** Same brand first, topped up with other available units in a similar price band. */
  @Get('cars/:id/similar')
  async getSimilar(@Param('id', ParseIntPipe) id: number) {
    const car = await this.carRepo.findOne({ where: { id } });
    if (!car) throw new NotFoundException('Vehicle not found');

    const price = Number(car.price);
    const sameMake = car.makeId
      ? await this.carRepo.find({
          where: { makeId: car.makeId, status: CarStatus.AVAILABLE, id: Not(id) },
          take: 4,
          relations: { make: true },
        })
      : [];

    if (sameMake.length >= 4) return sameMake;

    const seen = [id, ...sameMake.map((c) => c.id)];
    const filler = await this.carRepo
      .createQueryBuilder('car')
      .leftJoinAndSelect('car.make', 'make')
      .where('car.id NOT IN (:...seen)', { seen })
      .andWhere('car.status = :status', { status: CarStatus.AVAILABLE })
      .andWhere('car.price BETWEEN :lo AND :hi', { lo: price * 0.7, hi: price * 1.3 })
      .take(4 - sameMake.length)
      .getMany();

    return [...sameMake, ...filler];
  }

  /** Storefront enquiry / test-drive / trade-in form. */
  @Post('leads')
  @UseGuards(RateLimitGuard)
  async createLead(@Body() dto: CreateLeadDto) {
    const lead = await this.leadsService.create(dto);
    return {
      success: true,
      id: lead.id,
      message: 'Thanks! Our team will reach out to you shortly.',
    };
  }
}
