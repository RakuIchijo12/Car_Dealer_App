import { Make } from '../makes/make.entity';
export declare enum CarStatus {
    AVAILABLE = "available",
    SOLD = "sold",
    RESERVED = "reserved"
}
export declare class Car {
    id: number;
    make: Make;
    makeId: number;
    model: string;
    year: number;
    color: string;
    mileage: number;
    price: number;
    status: CarStatus;
    vin: string;
    description: string;
    photo: string;
    createdAt: Date;
    updatedAt: Date;
}
