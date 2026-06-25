"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MakesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const make_entity_1 = require("./make.entity");
const makes_service_1 = require("./makes.service");
const makes_controller_1 = require("./makes.controller");
let MakesModule = class MakesModule {
};
exports.MakesModule = MakesModule;
exports.MakesModule = MakesModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([make_entity_1.Make])],
        controllers: [makes_controller_1.MakesController],
        providers: [makes_service_1.MakesService],
        exports: [makes_service_1.MakesService],
    })
], MakesModule);
//# sourceMappingURL=makes.module.js.map