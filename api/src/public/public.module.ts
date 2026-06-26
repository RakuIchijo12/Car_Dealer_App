import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Make } from '../makes/make.entity';
import { Car } from '../cars/car.entity';
import { PublicController } from './public.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Make, Car])],
  controllers: [PublicController],
})
export class PublicModule {}
