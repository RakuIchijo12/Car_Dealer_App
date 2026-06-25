import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { CarStatus } from './car.entity';
export declare class CarsController {
    private carsService;
    constructor(carsService: CarsService);
    findAll(makeId?: string, status?: CarStatus, yearMin?: string, yearMax?: string, priceMin?: string, priceMax?: string, search?: string, sortBy?: 'year' | 'price' | 'mileage', sortOrder?: 'ASC' | 'DESC'): Promise<import("./car.entity").Car[]>;
    getStats(): Promise<{
        total: number;
        available: number;
        sold: number;
        reserved: number;
        totalMakes: number;
    }>;
    getRecent(): Promise<import("./car.entity").Car[]>;
    findOne(id: number): Promise<import("./car.entity").Car>;
    create(dto: CreateCarDto, file?: Express.Multer.File): Promise<import("./car.entity").Car>;
    update(id: number, dto: UpdateCarDto, file?: Express.Multer.File): Promise<import("./car.entity").Car>;
    markAsSold(id: number): Promise<import("./car.entity").Car>;
    remove(id: number): Promise<import("./car.entity").Car>;
}
