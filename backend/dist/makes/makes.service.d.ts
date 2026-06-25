import { Repository } from 'typeorm';
import { Make } from './make.entity';
import { CreateMakeDto } from './dto/create-make.dto';
import { UpdateMakeDto } from './dto/update-make.dto';
export declare class MakesService {
    private makeRepo;
    constructor(makeRepo: Repository<Make>);
    findAll(): Promise<Make[]>;
    findOne(id: number): Promise<Make>;
    create(dto: CreateMakeDto): Promise<Make>;
    update(id: number, dto: UpdateMakeDto): Promise<Make>;
    remove(id: number): Promise<Make>;
}
