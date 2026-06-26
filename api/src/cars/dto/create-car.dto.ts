import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CarStatus } from '../car.entity';

export class CreateCarDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  makeId?: number;

  @IsString()
  model: string;

  @Type(() => Number)
  @IsNumber()
  year: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  mileage?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsEnum(CarStatus)
  status?: CarStatus;

  @IsOptional()
  @IsString()
  vin?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
