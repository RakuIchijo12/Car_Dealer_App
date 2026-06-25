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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Car = exports.CarStatus = void 0;
const typeorm_1 = require("typeorm");
const make_entity_1 = require("../makes/make.entity");
var CarStatus;
(function (CarStatus) {
    CarStatus["AVAILABLE"] = "available";
    CarStatus["SOLD"] = "sold";
    CarStatus["RESERVED"] = "reserved";
})(CarStatus || (exports.CarStatus = CarStatus = {}));
let Car = class Car {
    id;
    make;
    makeId;
    model;
    year;
    color;
    mileage;
    price;
    status;
    vin;
    description;
    photo;
    createdAt;
    updatedAt;
};
exports.Car = Car;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Car.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => make_entity_1.Make, (make) => make.cars, { eager: true, nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'makeId' }),
    __metadata("design:type", make_entity_1.Make)
], Car.prototype, "make", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Car.prototype, "makeId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Car.prototype, "model", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Car.prototype, "year", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Car.prototype, "color", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Car.prototype, "mileage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Car.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: CarStatus, default: CarStatus.AVAILABLE }),
    __metadata("design:type", String)
], Car.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Car.prototype, "vin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Car.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Car.prototype, "photo", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Car.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Car.prototype, "updatedAt", void 0);
exports.Car = Car = __decorate([
    (0, typeorm_1.Entity)('cars')
], Car);
//# sourceMappingURL=car.entity.js.map