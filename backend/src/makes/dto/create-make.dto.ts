import { IsString, IsOptional } from 'class-validator';

export class CreateMakeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  logo?: string;
}
