import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
export declare class CustomersService {
    private repo;
    constructor(repo: Repository<Customer>);
    findAll(): Promise<Customer[]>;
    findOne(id: number): Promise<Customer>;
    create(dto: CreateCustomerDto): Promise<Customer>;
    update(id: number, dto: Partial<CreateCustomerDto>): Promise<Customer>;
    remove(id: number): Promise<Customer>;
}
