import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
export declare class CustomersController {
    private svc;
    constructor(svc: CustomersService);
    findAll(): Promise<import("./customer.entity").Customer[]>;
    findOne(id: number): Promise<import("./customer.entity").Customer>;
    create(dto: CreateCustomerDto): Promise<import("./customer.entity").Customer>;
    update(id: number, dto: Partial<CreateCustomerDto>): Promise<import("./customer.entity").Customer>;
    remove(id: number): Promise<import("./customer.entity").Customer>;
}
