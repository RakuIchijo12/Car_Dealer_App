import { Car } from '../cars/car.entity';
export declare class Make {
    id: number;
    name: string;
    logo: string;
    createdAt: Date;
    cars: Car[];
}
