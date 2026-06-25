import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile, ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CarsService, CarFilters } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CarStatus } from './car.entity';

const photoStorage = diskStorage({
  destination: './uploads',
  filename: (_, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `car-${unique}${extname(file.originalname)}`);
  },
});

@UseGuards(JwtAuthGuard)
@Controller('cars')
export class CarsController {
  constructor(private carsService: CarsService) {}

  @Get()
  findAll(
    @Query('makeId') makeId?: string,
    @Query('status') status?: CarStatus,
    @Query('yearMin') yearMin?: string,
    @Query('yearMax') yearMax?: string,
    @Query('priceMin') priceMin?: string,
    @Query('priceMax') priceMax?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'year' | 'price' | 'mileage',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const filters: CarFilters = {
      makeId: makeId ? +makeId : undefined,
      status,
      yearMin: yearMin ? +yearMin : undefined,
      yearMax: yearMax ? +yearMax : undefined,
      priceMin: priceMin ? +priceMin : undefined,
      priceMax: priceMax ? +priceMax : undefined,
      search,
      sortBy,
      sortOrder,
    };
    return this.carsService.findAll(filters);
  }

  @Get('stats')
  getStats() {
    return this.carsService.getStats();
  }

  @Get('recent')
  getRecent() {
    return this.carsService.getRecent();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.findOne(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('photo', { storage: photoStorage }))
  create(@Body() dto: CreateCarDto, @UploadedFile() file?: Express.Multer.File) {
    return this.carsService.create(dto, file?.filename);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('photo', { storage: photoStorage }))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCarDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.carsService.update(id, dto, file?.filename);
  }

  @Patch(':id/sell')
  markAsSold(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.markAsSold(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.carsService.remove(id);
  }
}
