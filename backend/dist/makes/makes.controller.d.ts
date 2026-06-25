import { MakesService } from './makes.service';
import { CreateMakeDto } from './dto/create-make.dto';
import { UpdateMakeDto } from './dto/update-make.dto';
export declare class MakesController {
    private makesService;
    constructor(makesService: MakesService);
    findAll(): Promise<import("./make.entity").Make[]>;
    findOne(id: number): Promise<import("./make.entity").Make>;
    create(dto: CreateMakeDto): Promise<import("./make.entity").Make>;
    update(id: number, dto: UpdateMakeDto): Promise<import("./make.entity").Make>;
    remove(id: number): Promise<import("./make.entity").Make>;
}
