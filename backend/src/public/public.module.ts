import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Make } from '../makes/make.entity';
import { Car } from '../cars/car.entity';
import { PublicController } from './public.controller';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [TypeOrmModule.forFeature([Make, Car]), LeadsModule],
  controllers: [PublicController],
})
export class PublicModule {}
