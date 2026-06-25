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
exports.PublicController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const make_entity_1 = require("../makes/make.entity");
const car_entity_1 = require("../cars/car.entity");
let PublicController = class PublicController {
    makeRepo;
    carRepo;
    constructor(makeRepo, carRepo) {
        this.makeRepo = makeRepo;
        this.carRepo = carRepo;
    }
    getMakes() {
        return this.makeRepo.find({ order: { name: 'ASC' } });
    }
    async getCars(makeId, search) {
        const qb = this.carRepo
            .createQueryBuilder('car')
            .leftJoinAndSelect('car.make', 'make')
            .where('car.status = :status', { status: car_entity_1.CarStatus.AVAILABLE });
        if (makeId)
            qb.andWhere('car.makeId = :makeId', { makeId: +makeId });
        if (search)
            qb.andWhere('(car.model ILIKE :s OR make.name ILIKE :s)', { s: `%${search}%` });
        qb.orderBy('car.createdAt', 'DESC');
        return qb.getMany();
    }
    async getCarsByMake() {
        const makes = await this.makeRepo.find({ order: { name: 'ASC' } });
        const result = await Promise.all(makes.map(async (make) => {
            const cars = await this.carRepo.find({
                where: { makeId: make.id, status: car_entity_1.CarStatus.AVAILABLE },
                order: { year: 'DESC' },
                take: 6,
            });
            return { ...make, cars };
        }));
        return result.filter((m) => m.cars.length > 0);
    }
};
exports.PublicController = PublicController;
__decorate([
    (0, common_1.Get)('makes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "getMakes", null);
__decorate([
    (0, common_1.Get)('cars'),
    __param(0, (0, common_1.Query)('makeId')),
    __param(1, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "getCars", null);
__decorate([
    (0, common_1.Get)('cars/by-make'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "getCarsByMake", null);
exports.PublicController = PublicController = __decorate([
    (0, common_1.Controller)('public'),
    __param(0, (0, typeorm_1.InjectRepository)(make_entity_1.Make)),
    __param(1, (0, typeorm_1.InjectRepository)(car_entity_1.Car)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], PublicController);
//# sourceMappingURL=public.controller.js.map