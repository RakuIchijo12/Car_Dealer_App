"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const typeorm_1 = require("@nestjs/typeorm");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("./users/user.entity");
const make_entity_1 = require("./makes/make.entity");
const car_entity_1 = require("./cars/car.entity");
async function seed() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const userRepo = app.get((0, typeorm_1.getRepositoryToken)(user_entity_1.User));
    const makeRepo = app.get((0, typeorm_1.getRepositoryToken)(make_entity_1.Make));
    const carRepo = app.get((0, typeorm_1.getRepositoryToken)(car_entity_1.Car));
    const existing = await userRepo.findOne({ where: { email: 'admin@dealeros.com' } });
    if (!existing) {
        await userRepo.save(userRepo.create({
            email: 'admin@dealeros.com',
            password: await bcrypt.hash('admin123', 10),
            name: 'Admin User',
            role: 'admin',
        }));
        console.log('✓ Admin user created: admin@dealeros.com / admin123');
    }
    const makesData = [
        { name: 'Toyota' },
        { name: 'Ford' },
        { name: 'BMW' },
    ];
    const makes = [];
    for (const m of makesData) {
        let make = await makeRepo.findOne({ where: { name: m.name } });
        if (!make) {
            make = await makeRepo.save(makeRepo.create(m));
            console.log(`✓ Make created: ${m.name}`);
        }
        makes.push(make);
    }
    const carsData = [
        { makeIndex: 0, model: 'Camry', year: 2022, color: 'White', mileage: 15000, price: 26000, status: car_entity_1.CarStatus.AVAILABLE },
        { makeIndex: 0, model: 'Corolla', year: 2021, color: 'Silver', mileage: 28000, price: 21000, status: car_entity_1.CarStatus.SOLD },
        { makeIndex: 0, model: 'RAV4', year: 2023, color: 'Black', mileage: 5000, price: 35000, status: car_entity_1.CarStatus.AVAILABLE },
        { makeIndex: 1, model: 'F-150', year: 2022, color: 'Blue', mileage: 20000, price: 42000, status: car_entity_1.CarStatus.RESERVED },
        { makeIndex: 1, model: 'Mustang', year: 2021, color: 'Red', mileage: 12000, price: 38000, status: car_entity_1.CarStatus.AVAILABLE },
        { makeIndex: 1, model: 'Explorer', year: 2020, color: 'Gray', mileage: 45000, price: 29000, status: car_entity_1.CarStatus.SOLD },
        { makeIndex: 2, model: '3 Series', year: 2023, color: 'Black', mileage: 3000, price: 55000, status: car_entity_1.CarStatus.AVAILABLE },
        { makeIndex: 2, model: '5 Series', year: 2022, color: 'White', mileage: 18000, price: 68000, status: car_entity_1.CarStatus.AVAILABLE },
        { makeIndex: 2, model: 'X5', year: 2021, color: 'Silver', mileage: 32000, price: 72000, status: car_entity_1.CarStatus.RESERVED },
        { makeIndex: 0, model: 'Highlander', year: 2023, color: 'Pearl', mileage: 8000, price: 45000, status: car_entity_1.CarStatus.AVAILABLE },
    ];
    const existingCars = await carRepo.count();
    if (existingCars === 0) {
        for (const c of carsData) {
            await carRepo.save(carRepo.create({ ...c, make: makes[c.makeIndex] }));
        }
        console.log(`✓ ${carsData.length} cars seeded`);
    }
    await app.close();
    console.log('Seeding complete!');
}
seed().catch((e) => { console.error(e); process.exit(1); });
//# sourceMappingURL=seed.js.map