import { CarStatus } from '../car.entity';
export declare class CreateCarDto {
    makeId?: number;
    model: string;
    year: number;
    color?: string;
    mileage?: number;
    price: number;
    status?: CarStatus;
    vin?: string;
    description?: string;
}
