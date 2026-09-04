import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from './lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(@InjectRepository(Lead) private leadRepo: Repository<Lead>) {}

  create(dto: CreateLeadDto) {
    const lead = this.leadRepo.create(dto);
    return this.leadRepo.save(lead);
  }

  findAll(status?: LeadStatus, search?: string) {
    const qb = this.leadRepo
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.car', 'car')
      .leftJoinAndSelect('car.make', 'make');

    if (status) qb.andWhere('lead.status = :status', { status });
    if (search) {
      qb.andWhere(
        '(lead.name ILIKE :s OR lead.email ILIKE :s OR lead.phone ILIKE :s OR lead.message ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    return qb.orderBy('lead.createdAt', 'DESC').getMany();
  }

  async findOne(id: number) {
    const lead = await this.leadRepo.findOne({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(id: number, dto: UpdateLeadDto) {
    const lead = await this.findOne(id);
    Object.assign(lead, dto);
    return this.leadRepo.save(lead);
  }

  async remove(id: number) {
    const lead = await this.findOne(id);
    return this.leadRepo.remove(lead);
  }

  /** Counts per status, used by the admin dashboard and the leads pipeline. */
  async getStats() {
    const rows = await this.leadRepo
      .createQueryBuilder('lead')
      .select('lead.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('lead.status')
      .getRawMany<{ status: LeadStatus; count: string }>();

    const byStatus = Object.values(LeadStatus).reduce(
      (acc, s) => ({ ...acc, [s]: 0 }),
      {} as Record<LeadStatus, number>,
    );
    rows.forEach((r) => (byStatus[r.status] = parseInt(r.count, 10)));

    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    return { total, ...byStatus };
  }
}
