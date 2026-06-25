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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const typeorm_1 = require("@nestjs/typeorm");
const bcrypt = __importStar(require("bcrypt"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
const user_entity_1 = require("./users/user.entity");
const make_entity_1 = require("./makes/make.entity");
const car_entity_1 = require("./cars/car.entity");
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function downloadPhoto(wikiArticles, filename) {
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
        console.log(`  ✓ cached`);
        return filename;
    }
    for (const article of wikiArticles) {
        try {
            const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(article)}`;
            const { data } = await axios_1.default.get(url, {
                timeout: 12000,
                headers: { 'User-Agent': 'DealerOS-Seed/1.0 (educational, non-commercial)' },
            });
            const imageUrl = data?.originalimage?.source || data?.thumbnail?.source;
            if (!imageUrl) {
                console.log(`  ⚠ no image: ${article}`);
                await sleep(1500);
                continue;
            }
            const img = await axios_1.default.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 20000,
                headers: { 'User-Agent': 'DealerOS-Seed/1.0 (educational, non-commercial)' },
            });
            fs.writeFileSync(filePath, img.data);
            console.log(`  📷 ${filename} (from ${article})`);
            return filename;
        }
        catch (e) {
            const code = e?.response?.status ?? 'net';
            console.log(`  ✗ ${article} [${code}]`);
            await sleep(code === 429 ? 8000 : 2000);
        }
    }
    return null;
}
const PH_MAKES = ['Toyota', 'Mitsubishi', 'Honda', 'Hyundai', 'Nissan', 'Suzuki', 'Ford', 'Kia'];
const PH_CARS = [
    { make: 'Toyota', model: 'Vios', year: 2023, color: 'Silver', mileage: 8000, price: 898000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Toyota_Vios', 'Toyota_Belta'], desc: 'Toyota Vios 1.3 XLE CVT. Fuel-efficient city sedan, perfect for Metro Manila driving.' },
    { make: 'Toyota', model: 'Innova', year: 2022, color: 'Pearl White', mileage: 22000, price: 1450000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Toyota_Innova', 'Toyota_Kijang_Innova'], desc: 'Toyota Innova 2.8 V Diesel AT. 7-seater family MPV built for Philippine roads.' },
    { make: 'Toyota', model: 'Fortuner', year: 2023, color: 'Attitude Black', mileage: 5000, price: 2050000, status: car_entity_1.CarStatus.RESERVED, wiki: ['Toyota_Fortuner', 'Toyota_SW4'], desc: 'Toyota Fortuner 2.8 LTD Diesel 4x4 AT. Premium SUV, perfect for provincial trips.' },
    { make: 'Toyota', model: 'Hilux', year: 2022, color: 'Magnetic Gray', mileage: 35000, price: 1320000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Toyota_Hilux', 'Toyota_Hilux_(eighth_generation)'], desc: 'Toyota Hilux Conquest 2.8 4x4 AT. Rugged pickup truck, best seller in its class.' },
    { make: 'Toyota', model: 'Wigo', year: 2023, color: 'Red Mica', mileage: 3000, price: 598000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Toyota_Agya', 'Toyota_Wigo'], desc: 'Toyota Wigo 1.0 G AT. Budget-friendly city car with low fuel consumption.' },
    { make: 'Toyota', model: 'Rush', year: 2022, color: 'Super White', mileage: 18000, price: 1100000, status: car_entity_1.CarStatus.SOLD, wiki: ['Toyota_Rush', 'Toyota_Terios'], desc: 'Toyota Rush 1.5 G AT. Compact 7-seater SUV with high ground clearance.' },
    { make: 'Mitsubishi', model: 'Montero Sport', year: 2023, color: 'Jet Black Mica', mileage: 7000, price: 1985000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Mitsubishi_Pajero_Sport', 'Mitsubishi_Montero_Sport'], desc: 'Mitsubishi Montero Sport GT 4WD. Top-of-the-line with leather seats and premium sound.' },
    { make: 'Mitsubishi', model: 'Strada', year: 2022, color: 'Titanium Silver', mileage: 28000, price: 1180000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Mitsubishi_Triton', 'Mitsubishi_L200'], desc: 'Mitsubishi Strada GLX Plus 4x2 MT. Reliable workhorse pickup for businessmen and adventurers.' },
    { make: 'Mitsubishi', model: 'Xpander', year: 2023, color: 'Sterling Silver', mileage: 9000, price: 1135000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Mitsubishi_Xpander'], desc: 'Mitsubishi Xpander GLS Sport AT. Stylish 7-seater MPV with ADAS safety features.' },
    { make: 'Mitsubishi', model: 'Mirage G4', year: 2022, color: 'Plasma Blue', mileage: 15000, price: 728000, status: car_entity_1.CarStatus.RESERVED, wiki: ['Mitsubishi_Attrage', 'Mitsubishi_Mirage_G4'], desc: 'Mitsubishi Mirage G4 GLS CVT. Fuel-efficient compact sedan for first-time buyers.' },
    { make: 'Mitsubishi', model: 'Outlander', year: 2023, color: 'Diamond White Pearl', mileage: 4000, price: 2350000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Mitsubishi_Outlander'], desc: 'Mitsubishi Outlander GT S-AWC. Premium SUV with Super All-Wheel Control.' },
    { make: 'Honda', model: 'Civic', year: 2023, color: 'Lunar Silver Metallic', mileage: 6000, price: 1398000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Honda_Civic', 'Honda_Civic_(eleventh_generation)'], desc: 'Honda Civic 1.5 RS Turbo CVT. Sporty sedan with Honda Sensing safety suite.' },
    { make: 'Honda', model: 'City', year: 2022, color: 'Meteoroid Gray Metallic', mileage: 19000, price: 998000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Honda_City'], desc: 'Honda City 1.5 V CVT. Best-selling subcompact sedan in the Philippines.' },
    { make: 'Honda', model: 'BR-V', year: 2023, color: 'Ignite Red Metallic', mileage: 8500, price: 1218000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Honda_BR-V'], desc: 'Honda BR-V 1.5 V CVT. 7-seater subcompact SUV with Honda Sensing.' },
    { make: 'Honda', model: 'CR-V', year: 2022, color: 'Platinum White Pearl', mileage: 25000, price: 1998000, status: car_entity_1.CarStatus.SOLD, wiki: ['Honda_CR-V'], desc: 'Honda CR-V 1.6 S i-DTEC AT. Diesel crossover with spacious interior.' },
    { make: 'Hyundai', model: 'Tucson', year: 2023, color: 'Phantom Black', mileage: 10000, price: 1778000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Hyundai_Tucson'], desc: 'Hyundai Tucson 2.0 CRDi AT. Stylish midsize SUV with SmartSense safety.' },
    { make: 'Hyundai', model: 'Stargazer', year: 2023, color: 'Abyss Black Pearl', mileage: 5000, price: 1098000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Hyundai_Stargazer', 'Hyundai_Ioniq'], desc: 'Hyundai Stargazer 1.5 GLS+ AT. 7-seater MPV designed for Southeast Asia.' },
    { make: 'Hyundai', model: 'Accent', year: 2022, color: 'Fiery Red', mileage: 21000, price: 888000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Hyundai_Accent'], desc: 'Hyundai Accent 1.4 GL AT. Affordable subcompact sedan, popular for ride-hailing.' },
    { make: 'Hyundai', model: 'Creta', year: 2023, color: 'Atlas White', mileage: 7500, price: 1278000, status: car_entity_1.CarStatus.RESERVED, wiki: ['Hyundai_Creta', 'Hyundai_ix25'], desc: 'Hyundai Creta 1.5 GLS IVT. Compact SUV with panoramic sunroof and Bose audio.' },
    { make: 'Nissan', model: 'Navara', year: 2022, color: 'Storm White', mileage: 30000, price: 1348000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Nissan_Navara', 'Nissan_NP300'], desc: 'Nissan Navara EL Calibre 4x2 AT. Award-winning pickup with around-view monitor.' },
    { make: 'Nissan', model: 'Terra', year: 2023, color: 'Dark Metal Gray', mileage: 12000, price: 1828000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Nissan_Terra', 'Nissan_Patrol'], desc: 'Nissan Terra VL 4x4 AT. Body-on-frame 7-seater SUV, great for off-road.' },
    { make: 'Nissan', model: 'Almera', year: 2022, color: 'Blade Silver', mileage: 17000, price: 848000, status: car_entity_1.CarStatus.SOLD, wiki: ['Nissan_Almera', 'Nissan_Versa'], desc: 'Nissan Almera 1.0 VL Turbo CVT. Subcompact sedan packed with premium features.' },
    { make: 'Suzuki', model: 'Ertiga', year: 2023, color: 'Pearl Arctic White', mileage: 9000, price: 948000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Suzuki_Ertiga'], desc: 'Suzuki Ertiga GL AT. Value 7-seater MPV with low maintenance cost.' },
    { make: 'Suzuki', model: 'XL7', year: 2023, color: 'Grandeur Gray', mileage: 11000, price: 1058000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Suzuki_XL7', 'Suzuki_Ertiga'], desc: 'Suzuki XL7 GL AT. 7-seater crossover MPV with bolder styling.' },
    { make: 'Suzuki', model: 'Swift', year: 2022, color: 'Fire Red', mileage: 14000, price: 788000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Suzuki_Swift'], desc: 'Suzuki Swift GL CVT. Fun hatchback, lightweight and peppy in city traffic.' },
    { make: 'Ford', model: 'Ranger', year: 2023, color: 'Absolute Black', mileage: 8000, price: 1598000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Ford_Ranger_(2011)', 'Ford_Ranger'], desc: 'Ford Ranger Wildtrak 2.0 Bi-Turbo 4x4 AT. Next-gen with SYNC 4 and Pro Power Onboard.' },
    { make: 'Ford', model: 'Everest', year: 2023, color: 'Meteor Gray', mileage: 6000, price: 2398000, status: car_entity_1.CarStatus.RESERVED, wiki: ['Ford_Everest'], desc: 'Ford Everest Titanium+ 4x4 AT. Full-size SUV with 12-inch portrait screen.' },
    { make: 'Ford', model: 'Territory', year: 2022, color: 'Blazer Blue', mileage: 20000, price: 1198000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Ford_Territory_(2018)', 'Ford_Kuga', 'Ford_Escape'], desc: 'Ford Territory Titanium AT. Crossover SUV with SYNC 3 and co-pilot360 safety.' },
    { make: 'Kia', model: 'Carnival', year: 2023, color: 'Snow White Pearl', mileage: 7000, price: 2498000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Kia_Carnival', 'Kia_Sedona'], desc: 'Kia Carnival 2.2 CRDi EX AT. Premium minivan with lounge seating and Bose sound.' },
    { make: 'Kia', model: 'Sportage', year: 2023, color: 'Interstellar Gray', mileage: 9000, price: 1698000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Kia_Sportage'], desc: 'Kia Sportage 2.0 EX AT. Compact SUV with panoramic curved display.' },
    { make: 'Kia', model: 'Seltos', year: 2022, color: 'Glacier White Pearl', mileage: 16000, price: 1298000, status: car_entity_1.CarStatus.AVAILABLE, wiki: ['Kia_Seltos', 'Kia_Stonic'], desc: 'Kia Seltos 1.6 EX AT. Compact SUV with Bose audio and smart key.' },
];
async function seed() {
    if (!fs.existsSync(UPLOADS_DIR))
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, { logger: ['error'] });
    const userRepo = app.get((0, typeorm_1.getRepositoryToken)(user_entity_1.User));
    const makeRepo = app.get((0, typeorm_1.getRepositoryToken)(make_entity_1.Make));
    const carRepo = app.get((0, typeorm_1.getRepositoryToken)(car_entity_1.Car));
    if (!await userRepo.findOne({ where: { email: 'admin@dealeros.com' } })) {
        await userRepo.save(userRepo.create({
            email: 'admin@dealeros.com',
            password: await bcrypt.hash('admin123', 10),
            name: 'Admin User',
            role: 'admin',
        }));
        console.log('✓ Admin: admin@dealeros.com / admin123');
    }
    console.log('\n📦 Makes...');
    const makeMap = new Map();
    for (const name of PH_MAKES) {
        let make = await makeRepo.findOne({ where: { name } });
        if (!make) {
            make = await makeRepo.save(makeRepo.create({ name }));
            console.log(`  ✓ ${name}`);
        }
        makeMap.set(name, make);
    }
    console.log('\n🚗 Cars + photos...');
    const existingCount = await carRepo.count();
    if (existingCount > 0) {
        console.log(`  ℹ️  ${existingCount} cars exist. To reseed: DELETE FROM cars; in psql`);
    }
    else {
        for (const c of PH_CARS) {
            const make = makeMap.get(c.make);
            const filename = `${c.make.toLowerCase()}-${c.model.toLowerCase().replace(/[\s/]+/g, '-')}-${c.year}.jpg`;
            console.log(`\n  ▸ ${c.make} ${c.model} ${c.year}`);
            const photo = await downloadPhoto(c.wiki, filename);
            await carRepo.save(carRepo.create({
                make, makeId: make?.id,
                model: c.model, year: c.year, color: c.color,
                mileage: c.mileage, price: c.price, status: c.status,
                description: c.desc, photo: photo ?? undefined,
            }));
            await sleep(3500);
        }
    }
    await app.close();
    console.log('\n✅ Done!');
}
seed().catch((e) => { console.error(e); process.exit(1); });
//# sourceMappingURL=seed.js.map