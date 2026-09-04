import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LeadStatus } from '../lead.entity';

export class UpdateLeadDto {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
