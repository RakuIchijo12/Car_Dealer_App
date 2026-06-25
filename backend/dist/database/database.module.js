"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const user_entity_1 = require("../users/user.entity");
const car_entity_1 = require("../cars/car.entity");
const make_entity_1 = require("../makes/make.entity");
const customer_entity_1 = require("../customers/customer.entity");
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    host: config.get('POSTGRES_HOST'),
                    port: +(config.get('POSTGRES_PORT') ?? 5432),
                    username: config.get('POSTGRES_USER'),
                    password: config.get('POSTGRES_PASSWORD'),
                    database: config.get('POSTGRES_DB'),
                    entities: [user_entity_1.User, car_entity_1.Car, make_entity_1.Make, customer_entity_1.Customer],
                    synchronize: true,
                }),
            }),
        ],
    })
], DatabaseModule);
//# sourceMappingURL=database.module.js.map