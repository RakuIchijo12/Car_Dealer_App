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
exports.CarsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const cars_service_1 = require("./cars.service");
const create_car_dto_1 = require("./dto/create-car.dto");
const update_car_dto_1 = require("./dto/update-car.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const car_entity_1 = require("./car.entity");
const photoStorage = (0, multer_1.diskStorage)({
    destination: './uploads',
    filename: (_, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `car-${unique}${(0, path_1.extname)(file.originalname)}`);
    },
});
let CarsController = class CarsController {
    carsService;
    constructor(carsService) {
        this.carsService = carsService;
    }
    findAll(makeId, status, yearMin, yearMax, priceMin, priceMax, search, sortBy, sortOrder) {
        const filters = {
            makeId: makeId ? +makeId : undefined,
            status,
            yearMin: yearMin ? +yearMin : undefined,
            yearMax: yearMax ? +yearMax : undefined,
            priceMin: priceMin ? +priceMin : undefined,
            priceMax: priceMax ? +priceMax : undefined,
            search,
            sortBy,
            sortOrder,
        };
        return this.carsService.findAll(filters);
    }
    getStats() {
        return this.carsService.getStats();
    }
    getRecent() {
        return this.carsService.getRecent();
    }
    findOne(id) {
        return this.carsService.findOne(id);
    }
    create(dto, file) {
        return this.carsService.create(dto, file?.filename);
    }
    update(id, dto, file) {
        return this.carsService.update(id, dto, file?.filename);
    }
    markAsSold(id) {
        return this.carsService.markAsSold(id);
    }
    remove(id) {
        return this.carsService.remove(id);
    }
};
exports.CarsController = CarsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('makeId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('yearMin')),
    __param(3, (0, common_1.Query)('yearMax')),
    __param(4, (0, common_1.Query)('priceMin')),
    __param(5, (0, common_1.Query)('priceMax')),
    __param(6, (0, common_1.Query)('search')),
    __param(7, (0, common_1.Query)('sortBy')),
    __param(8, (0, common_1.Query)('sortOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], CarsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CarsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('recent'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CarsController.prototype, "getRecent", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CarsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo', { storage: photoStorage })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_car_dto_1.CreateCarDto, Object]),
    __metadata("design:returntype", void 0)
], CarsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo', { storage: photoStorage })),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_car_dto_1.UpdateCarDto, Object]),
    __metadata("design:returntype", void 0)
], CarsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/sell'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CarsController.prototype, "markAsSold", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CarsController.prototype, "remove", null);
exports.CarsController = CarsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('cars'),
    __metadata("design:paramtypes", [cars_service_1.CarsService])
], CarsController);
//# sourceMappingURL=cars.controller.js.map