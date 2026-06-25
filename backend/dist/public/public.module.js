"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const make_entity_1 = require("../makes/make.entity");
const car_entity_1 = require("../cars/car.entity");
const public_controller_1 = require("./public.controller");
let PublicModule = class PublicModule {
};
exports.PublicModule = PublicModule;
exports.PublicModule = PublicModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([make_entity_1.Make, car_entity_1.Car])],
        controllers: [public_controller_1.PublicController],
    })
], PublicModule);
//# sourceMappingURL=public.module.js.map