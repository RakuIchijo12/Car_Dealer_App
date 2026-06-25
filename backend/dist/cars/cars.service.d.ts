import { Repository } from 'typeorm';
import { Car, CarStatus } from './car.entity';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
export interface CarFilters {
    makeId?: number;
    yearMin?: number;
    yearMax?: number;
    priceMin?: number;
    priceMax?: number;
    status?: CarStatus;
    search?: string;
    sortBy?: 'year' | 'price' | 'mileage';
    sortOrder?: 'ASC' | 'DESC';
}
export declare class CarsService {
    private carRepo;
    constructor(carRepo: Repository<Car>);
    findAll(filters?: CarFilters): Promise<Car[]>;
    findOne(id: number): Promise<Car>;
    create(dto: CreateCarDto, photoPath?: string): Promise<Car>;
    update(id: number, dto: UpdateCarDto, photoPath?: string): Promise<Car>;
    remove(id: number): Promise<Car>;
    markAsSold(id: number): Promise<Car>;
    getStats(): Promise<{
        total: number;
        available: number;
        sold: number;
        reserved: number;
        totalMakes: number;
    }>;
    getRecent(limit?: number): Promise<Car[]>;
}
