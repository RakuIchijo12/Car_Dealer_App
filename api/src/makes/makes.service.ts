import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Make } from './make.entity';
import { CreateMakeDto } from './dto/create-make.dto';
import { UpdateMakeDto } from './dto/update-make.dto';

@Injectable()
export class MakesService {
  constructor(@InjectRepository(Make) private makeRepo: Repository<Make>) {}

  findAll() { return this.makeRepo.find({ order: { name: 'ASC' } }); }

  async findOne(id: number) {
    const make = await this.makeRepo.findOne({ where: { id } });
    if (!make) throw new NotFoundException('Make not found');
    return make;
  }

  async create(dto: CreateMakeDto) {
    const existing = await this.makeRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Make already exists');
    const make = this.makeRepo.create(dto);
    return this.makeRepo.save(make);
  }

  async update(id: number, dto: UpdateMakeDto) {
    const make = await this.findOne(id);
    Object.assign(make, dto);
    return this.makeRepo.save(make);
  }

  async remove(id: number) {
    const make = await this.findOne(id);
    return this.makeRepo.remove(make);
  }
}
