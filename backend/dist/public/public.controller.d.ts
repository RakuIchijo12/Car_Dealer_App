import { Repository } from 'typeorm';
import { Make } from '../makes/make.entity';
import { Car } from '../cars/car.entity';
export declare class PublicController {
    private makeRepo;
    private carRepo;
    constructor(makeRepo: Repository<Make>, carRepo: Repository<Car>);
    getMakes(): Promise<Make[]>;
    getCars(makeId?: string, search?: string): Promise<Car[]>;
    getCarsByMake(): Promise<{
        cars: Car[];
        id: number;
        name: string;
        logo: string;
        createdAt: Date;
    }[]>;
}
