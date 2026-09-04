import {
  IsString, IsOptional, IsEmail, IsEnum, IsNumber, IsDateString, MaxLength, MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LeadType } from '../lead.entity';

export class CreateLeadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @IsString()
  @MinLength(7, { message: 'Please provide a valid contact number' })
  @MaxLength(30)
  phone: string;

  @IsOptional()
  @IsEnum(LeadType)
  type?: LeadType;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  carId?: number;

  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeInVehicle?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budget?: number;
}
