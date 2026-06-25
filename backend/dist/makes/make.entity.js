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
exports.Make = void 0;
const typeorm_1 = require("typeorm");
const car_entity_1 = require("../cars/car.entity");
let Make = class Make {
    id;
    name;
    logo;
    createdAt;
    cars;
};
exports.Make = Make;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Make.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Make.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Make.prototype, "logo", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Make.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => car_entity_1.Car, (car) => car.make),
    __metadata("design:type", Array)
], Make.prototype, "cars", void 0);
exports.Make = Make = __decorate([
    (0, typeorm_1.Entity)('makes')
], Make);
//# sourceMappingURL=make.entity.js.map