"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const car_entity_1 = require("./car.entity");
let CarsService = class CarsService {
    carRepo;
    constructor(carRepo) {
        this.carRepo = carRepo;
    }
    async findAll(filters = {}) {
        const qb = this.carRepo.createQueryBuilder('car').leftJoinAndSelect('car.make', 'make');
        if (filters.makeId)
            qb.andWhere('car.makeId = :makeId', { makeId: filters.makeId });
        if (filters.status)
            qb.andWhere('car.status = :status', { status: filters.status });
        if (filters.yearMin)
            qb.andWhere('car.year >= :yearMin', { yearMin: filters.yearMin });
        if (filters.yearMax)
            qb.andWhere('car.year <= :yearMax', { yearMax: filters.yearMax });
        if (filters.priceMin)
            qb.andWhere('car.price >= :priceMin', { priceMin: filters.priceMin });
        if (filters.priceMax)
            qb.andWhere('car.price <= :priceMax', { priceMax: filters.priceMax });
        if (filters.search) {
            qb.andWhere('(car.model ILIKE :search OR car.vin ILIKE :search)', {
                search: `%${filters.search}%`,
            });
        }
        const sortField = filters.sortBy || 'createdAt';
        const sortOrder = filters.sortOrder || 'DESC';
        qb.orderBy(`car.${sortField}`, sortOrder);
        return qb.getMany();
    }
    async findOne(id) {
        const car = await this.carRepo.findOne({ where: { id }, relations: { make: true } });
        if (!car)
            throw new common_1.NotFoundException('Car not found');
        return car;
    }
    async create(dto, photoPath) {
        const car = this.carRepo.create({ ...dto, photo: photoPath });
        return this.carRepo.save(car);
    }
    async update(id, dto, photoPath) {
        const car = await this.findOne(id);
        Object.assign(car, dto);
        if (photoPath)
            car.photo = photoPath;
        return this.carRepo.save(car);
    }
    async remove(id) {
        const car = await this.findOne(id);
        return this.carRepo.remove(car);
    }
    async markAsSold(id) {
        const car = await this.findOne(id);
        car.status = car_entity_1.CarStatus.SOLD;
        return this.carRepo.save(car);
    }
    async getStats() {
        const total = await this.carRepo.count();
        const available = await this.carRepo.count({ where: { status: car_entity_1.CarStatus.AVAILABLE } });
        const sold = await this.carRepo.count({ where: { status: car_entity_1.CarStatus.SOLD } });
        const reserved = await this.carRepo.count({ where: { status: car_entity_1.CarStatus.RESERVED } });
        const makes = await this.carRepo
            .createQueryBuilder('car')
            .select('COUNT(DISTINCT car.makeId)', 'count')
            .getRawOne();
        return { total, available, sold, reserved, totalMakes: parseInt(makes.count) || 0 };
    }
    async getRecent(limit = 5) {
        return this.carRepo.find({ order: { createdAt: 'DESC' }, take: limit, relations: { make: true } });
    }
};
exports.CarsService = CarsService;
exports.CarsService = CarsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(car_entity_1.Car)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CarsService);
//# sourceMappingURL=cars.service.js.map