import {
  IsString, IsNumber, IsEnum, IsOptional, IsBoolean, Min, Max, MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BodyType, CarStatus, FuelType, Transmission } from '../car.entity';

/** Multipart form fields arrive as strings, hence the Type/Transform decorators. */
export class CreateCarDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  makeId?: number;

  @IsString()
  @MaxLength(120)
  model: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 2)
  year: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
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
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @IsOptional()
  @IsEnum(CarStatus)
  status?: CarStatus;

  @IsOptional()
  @IsEnum(BodyType)
  bodyType?: BodyType;

  @IsOptional()
  @IsEnum(Transmission)
  transmission?: Transmission;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(30)
  seats?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  engine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  driveTrain?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(9)
  plateEnding?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  vin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  featured?: boolean;

  /** Accepts a comma-separated string from multipart, or a real array from JSON. */
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.split(',').map((v) => v.trim()).filter(Boolean)
      : value,
  )
  features?: string[];
}
