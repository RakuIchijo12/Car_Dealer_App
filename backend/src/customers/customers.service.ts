import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(@InjectRepository(Customer) private repo: Repository<Customer>) {}

  findAll() { return this.repo.find({ order: { createdAt: 'DESC' } }); }

  async findOne(id: number) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  create(dto: CreateCustomerDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: Partial<CreateCustomerDto>) {
    const c = await this.findOne(id);
    Object.assign(c, dto);
    return this.repo.save(c);
  }

  async remove(id: number) {
    const c = await this.findOne(id);
    return this.repo.remove(c);
  }
}
