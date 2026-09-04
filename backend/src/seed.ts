import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { User, UserRole } from './users/user.entity';
import { Make } from './makes/make.entity';
import { Car, CarStatus, BodyType, Transmission, FuelType } from './cars/car.entity';
import { Lead, LeadStatus, LeadType } from './leads/lead.entity';

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const UA = 'VeloraMotors-Seed/2.0 (educational, non-commercial)';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Try each Wikipedia article in turn until one yields an image. */
async function downloadPhoto(articles: string[], filename: string): Promise<string | null> {
  const filePath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1024) return filename;

  for (const article of articles) {
    try {
      const url =
        'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(article);
      const { data } = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': UA } });

      const imageUrl = data?.originalimage?.source || data?.thumbnail?.source;
      if (!imageUrl) {
        await sleep(600);
        continue;
      }

      const img = await axios.get<ArrayBuffer>(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 25000,
        headers: { 'User-Agent': UA },
      });

      fs.writeFileSync(filePath, Buffer.from(img.data));
      return filename;
    } catch (e: any) {
      const code = e?.response?.status ?? 'net';
      await sleep(code === 429 ? 6000 : 1200);
    }
  }
  return null;
}

const PH_MAKES = ['Toyota', 'Mitsubishi', 'Honda', 'Hyundai', 'Nissan', 'Suzuki', 'Ford', 'Kia'];

interface SeedCar {
  make: string;
  model: string;
  year: number;
  color: string;
  mileage: number;
  price: number;
  originalPrice?: number;
  status: CarStatus;
  bodyType: BodyType;
  transmission: Transmission;
  fuelType: FuelType;
  seats: number;
  engine: string;
  driveTrain: string;
  featured?: boolean;
  features: string[];
  wiki: string[];
  desc: string;
}

const F = {
  base: ['Airbags', 'ABS with EBD', 'Power Steering', 'Power Windows', 'Central Locking'],
  comfort: ['Automatic Climate Control', 'Push-Start Button', 'Keyless Entry', 'Cruise Control'],
  tech: ['Touchscreen Infotainment', 'Apple CarPlay', 'Android Auto', 'Reverse Camera'],
  safety: ['Stability Control', 'Hill-Start Assist', 'Parking Sensors', 'ISOFIX Anchors'],
  premium: ['Leather Seats', 'Sunroof', 'Premium Sound System', '360° Camera'],
};

const PH_CARS: SeedCar[] = [
  // ── Toyota ──────────────────────────────────────────────────────────────────
  { make: 'Toyota', model: 'Vios', year: 2023, color: 'Silver', mileage: 8000, price: 898000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.SEDAN, transmission: Transmission.CVT, fuelType: FuelType.GASOLINE, seats: 5, engine: '1.3L 4-Cylinder', driveTrain: 'FWD', featured: true,
    features: [...F.base, ...F.tech, 'Fabric Seats'], wiki: ['Toyota_Vios', 'Toyota_Belta'],
    desc: 'Toyota Vios 1.3 XLE CVT. Fuel-efficient city sedan, perfect for Metro Manila and Davao traffic. Casa-maintained with complete service records.' },
  { make: 'Toyota', model: 'Innova', year: 2022, color: 'Pearl White', mileage: 22000, price: 1450000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.MPV, transmission: Transmission.AUTOMATIC, fuelType: FuelType.DIESEL, seats: 7, engine: '2.8L Turbo Diesel', driveTrain: 'RWD', featured: true,
    features: [...F.base, ...F.comfort, ...F.tech, 'Captain Seats'], wiki: ['Toyota_Innova', 'Toyota_Kijang_Innova'],
    desc: 'Toyota Innova 2.8 V Diesel AT. The definitive Philippine family MPV — 7 seats, diesel torque and legendary resale value.' },
  { make: 'Toyota', model: 'Fortuner', year: 2023, color: 'Attitude Black', mileage: 5000, price: 2050000, status: CarStatus.RESERVED,
    bodyType: BodyType.SUV, transmission: Transmission.AUTOMATIC, fuelType: FuelType.DIESEL, seats: 7, engine: '2.8L Turbo Diesel', driveTrain: '4x4',
    features: [...F.base, ...F.comfort, ...F.tech, ...F.premium], wiki: ['Toyota_Fortuner', 'Toyota_SW4'],
    desc: 'Toyota Fortuner 2.8 LTD Diesel 4x4 AT. Range-topping trim with leather, power tailgate and full 4x4 hardware. Provincial-trip ready.' },
  { make: 'Toyota', model: 'Hilux', year: 2022, color: 'Magnetic Gray', mileage: 35000, price: 1320000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.PICKUP, transmission: Transmission.AUTOMATIC, fuelType: FuelType.DIESEL, seats: 5, engine: '2.8L Turbo Diesel', driveTrain: '4x4',
    features: [...F.base, ...F.tech, ...F.safety, 'Bed Liner', 'Tow Bar'], wiki: ['Toyota_Hilux', 'Toyota_Hilux_(eighth_generation)'],
    desc: 'Toyota Hilux Conquest 2.8 4x4 AT. The best-selling pickup in its class — work-ready, weekend-capable.' },
  { make: 'Toyota', model: 'Wigo', year: 2023, color: 'Red Mica', mileage: 3000, price: 598000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.HATCHBACK, transmission: Transmission.AUTOMATIC, fuelType: FuelType.GASOLINE, seats: 5, engine: '1.0L 3-Cylinder', driveTrain: 'FWD',
    features: [...F.base, 'Touchscreen Infotainment', 'Reverse Camera'], wiki: ['Toyota_Agya', 'Toyota_Wigo'],
    desc: 'Toyota Wigo 1.0 G AT. Lowest cost of ownership in the line-up — ideal first car or city runabout.' },
  { make: 'Toyota', model: 'Rush', year: 2022, color: 'Super White', mileage: 18000, price: 1100000, status: CarStatus.SOLD,
    bodyType: BodyType.SUV, transmission: Transmission.AUTOMATIC, fuelType: FuelType.GASOLINE, seats: 7, engine: '1.5L 4-Cylinder', driveTrain: 'RWD',
    features: [...F.base, ...F.tech, 'Roof Rails'], wiki: ['Toyota_Rush', 'Toyota_Terios'],
    desc: 'Toyota Rush 1.5 G AT. Compact 7-seater with SUV ground clearance — flood-season favourite.' },

  // ── Mitsubishi ──────────────────────────────────────────────────────────────
  { make: 'Mitsubishi', model: 'Montero Sport', year: 2023, color: 'Jet Black Mica', mileage: 7000, price: 1985000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.SUV, transmission: Transmission.AUTOMATIC, fuelType: FuelType.DIESEL, seats: 7, engine: '2.4L MIVEC Diesel', driveTrain: '4WD', featured: true,
    features: [...F.base, ...F.comfort, ...F.tech, ...F.premium], wiki: ['Mitsubishi_Pajero_Sport', 'Mitsubishi_Montero_Sport'],
    desc: 'Mitsubishi Montero Sport GT 4WD. Top-of-the-line with leather seats, power tailgate and Rockford Fosgate audio.' },
  { make: 'Mitsubishi', model: 'Strada', year: 2022, color: 'Titanium Silver', mileage: 28000, price: 1180000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.PICKUP, transmission: Transmission.MANUAL, fuelType: FuelType.DIESEL, seats: 5, engine: '2.4L MIVEC Diesel', driveTrain: '4x2',
    features: [...F.base, 'Touchscreen Infotainment', 'Bed Liner'], wiki: ['Mitsubishi_Triton', 'Mitsubishi_L200'],
    desc: 'Mitsubishi Strada GLX Plus 4x2 MT. Honest workhorse pickup — low running costs, huge payload.' },
  { make: 'Mitsubishi', model: 'Xpander', year: 2023, color: 'Sterling Silver', mileage: 9000, price: 1135000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.MPV, transmission: Transmission.AUTOMATIC, fuelType: FuelType.GASOLINE, seats: 7, engine: '1.5L MIVEC', driveTrain: 'FWD',
    features: [...F.base, ...F.tech, ...F.safety], wiki: ['Mitsubishi_Xpander'],
    desc: 'Mitsubishi Xpander GLS Sport AT. Bold styling, 7 seats and class-leading ground clearance.' },
  { make: 'Mitsubishi', model: 'Mirage G4', year: 2022, color: 'Plasma Blue', mileage: 15000, price: 728000, status: CarStatus.RESERVED,
    bodyType: BodyType.SEDAN, transmission: Transmission.CVT, fuelType: FuelType.GASOLINE, seats: 5, engine: '1.2L MIVEC', driveTrain: 'FWD',
    features: [...F.base, 'Touchscreen Infotainment', 'Reverse Camera'], wiki: ['Mitsubishi_Attrage', 'Mitsubishi_Mirage_G4'],
    desc: 'Mitsubishi Mirage G4 GLS CVT. One of the most fuel-efficient sedans on the market — a first-time-buyer favourite.' },
  { make: 'Mitsubishi', model: 'Outlander', year: 2023, color: 'Diamond White Pearl', mileage: 4000, price: 2350000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.SUV, transmission: Transmission.CVT, fuelType: FuelType.GASOLINE, seats: 7, engine: '2.5L MIVEC', driveTrain: 'AWD',
    features: [...F.base, ...F.comfort, ...F.tech, ...F.premium], wiki: ['Mitsubishi_Outlander'],
    desc: 'Mitsubishi Outlander GT S-AWC. Premium 7-seater with Super All-Wheel Control and a genuinely upmarket cabin.' },

  // ── Honda ───────────────────────────────────────────────────────────────────
  { make: 'Honda', model: 'Civic', year: 2023, color: 'Lunar Silver Metallic', mileage: 6000, price: 1398000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.SEDAN, transmission: Transmission.CVT, fuelType: FuelType.GASOLINE, seats: 5, engine: '1.5L VTEC Turbo', driveTrain: 'FWD', featured: true,
    features: [...F.base, ...F.comfort, ...F.tech, ...F.safety, 'Honda Sensing'], wiki: ['Honda_Civic', 'Honda_Civic_(eleventh_generation)'],
    desc: 'Honda Civic 1.5 RS Turbo CVT. Sharp handling, turbo punch and the full Honda Sensing safety suite.' },
  { make: 'Honda', model: 'City', year: 2022, color: 'Meteoroid Gray Metallic', mileage: 19000, price: 998000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.SEDAN, transmission: Transmission.CVT, fuelType: FuelType.GASOLINE, seats: 5, engine: '1.5L i-VTEC', driveTrain: 'FWD',
    features: [...F.base, ...F.tech, 'Cruise Control'], wiki: ['Honda_City'],
    desc: 'Honda City 1.5 V CVT. Cavernous boot, refined CVT and rock-solid resale — the sensible subcompact pick.' },
  { make: 'Honda', model: 'BR-V', year: 2023, color: 'Ignite Red Metallic', mileage: 8500, price: 1218000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.SUV, transmission: Transmission.CVT, fuelType: FuelType.GASOLINE, seats: 7, engine: '1.5L i-VTEC', driveTrain: 'FWD',
    features: [...F.base, ...F.tech, ...F.safety, 'Honda Sensing'], wiki: ['Honda_BR-V'],
    desc: 'Honda BR-V 1.5 V CVT. Seven seats with Honda Sensing as standard — rare at this price point.' },
  { make: 'Honda', model: 'CR-V', year: 2022, color: 'Platinum White Pearl', mileage: 25000, price: 1998000, status: CarStatus.SOLD,
    bodyType: BodyType.CROSSOVER, transmission: Transmission.AUTOMATIC, fuelType: FuelType.DIESEL, seats: 7, engine: '1.6L i-DTEC Diesel', driveTrain: 'FWD',
    features: [...F.base, ...F.comfort, ...F.tech, ...F.premium], wiki: ['Honda_CR-V'],
    desc: 'Honda CR-V 1.6 S i-DTEC AT. Diesel economy in a genuinely premium 7-seat crossover.' },

  // ── Hyundai ─────────────────────────────────────────────────────────────────
  { make: 'Hyundai', model: 'Tucson', year: 2023, color: 'Phantom Black', mileage: 10000, price: 1778000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.SUV, transmission: Transmission.AUTOMATIC, fuelType: FuelType.DIESEL, seats: 5, engine: '2.0L CRDi Diesel', driveTrain: 'FWD',
    features: [...F.base, ...F.comfort, ...F.tech, ...F.safety], wiki: ['Hyundai_Tucson'],
    desc: 'Hyundai Tucson 2.0 CRDi AT. Striking parametric design with SmartSense driver assistance.' },
  { make: 'Hyundai', model: 'Stargazer', year: 2023, color: 'Abyss Black Pearl', mileage: 5000, price: 1098000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.MPV, transmission: Transmission.CVT, fuelType: FuelType.GASOLINE, seats: 7, engine: '1.5L Smartstream', driveTrain: 'FWD',
    features: [...F.base, ...F.tech, ...F.safety], wiki: ['Hyundai_Stargazer', 'Hyundai_Ioniq'],
    desc: 'Hyundai Stargazer 1.5 GLS+ AT. Futuristic 7-seater MPV engineered specifically for Southeast Asia.' },
  { make: 'Hyundai', model: 'Accent', year: 2022, color: 'Fiery Red', mileage: 21000, price: 888000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.SEDAN, transmission: Transmission.AUTOMATIC, fuelType: FuelType.GASOLINE, seats: 5, engine: '1.4L MPi', driveTrain: 'FWD',
    features: [...F.base, ...F.tech], wiki: ['Hyundai_Accent'],
    desc: 'Hyundai Accent 1.4 GL AT. Roomy, affordable and a proven earner for ride-hailing operators.' },
  { make: 'Hyundai', model: 'Creta', year: 2023, color: 'Atlas White', mileage: 7500, price: 1278000, status: CarStatus.RESERVED,
    bodyType: BodyType.SUV, transmission: Transmission.CVT, fuelType: FuelType.GASOLINE, seats: 5, engine: '1.5L Smartstream', driveTrain: 'FWD',
    features: [...F.base, ...F.comfort, ...F.tech, 'Sunroof', 'Premium Sound System'], wiki: ['Hyundai_Creta', 'Hyundai_ix25'],
    desc: 'Hyundai Creta 1.5 GLS IVT. Panoramic sunroof, Bose audio and a properly plush interior.' },

  // ── Nissan ──────────────────────────────────────────────────────────────────
  { make: 'Nissan', model: 'Navara', year: 2022, color: 'Storm White', mileage: 30000, price: 1348000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.PICKUP, transmission: Transmission.AUTOMATIC, fuelType: FuelType.DIESEL, seats: 5, engine: '2.5L Turbo Diesel', driveTrain: '4x2',
    features: [...F.base, ...F.tech, '360° Camera', 'Bed Liner'], wiki: ['Nissan_Navara', 'Nissan_NP300'],
    desc: 'Nissan Navara EL Calibre 4x2 AT. Multi-link rear suspension makes it the most car-like pickup to drive.' },
  { make: 'Nissan', model: 'Terra', year: 2023, color: 'Dark Metal Gray', mileage: 12000, price: 1828000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.SUV, transmission: Transmission.AUTOMATIC, fuelType: FuelType.DIESEL, seats: 7, engine: '2.5L Turbo Diesel', driveTrain: '4x4',
    features: [...F.base, ...F.comfort, ...F.tech, ...F.premium], wiki: ['Nissan_Terra', 'Nissan_Patrol'],
    desc: 'Nissan Terra VL 4x4 AT. Body-on-frame toughness with a surprisingly refined 7-seat cabin.' },
  { make: 'Nissan', model: 'Almera', year: 2022, color: 'Blade Silver', mileage: 17000, price: 848000, status: CarStatus.SOLD,
    bodyType: BodyType.SEDAN, transmission: Transmission.CVT, fuelType: FuelType.GASOLINE, seats: 5, engine: '1.0L Turbo', driveTrain: 'FWD',
    features: [...F.base, ...F.tech, ...F.safety], wiki: ['Nissan_Almera', 'Nissan_Versa'],
    desc: 'Nissan Almera 1.0 VL Turbo CVT. Turbocharged efficiency with segment-beating standard kit.' },

  // ── Suzuki ──────────────────────────────────────────────────────────────────
  { make: 'Suzuki', model: 'Ertiga', year: 2023, color: 'Pearl Arctic White', mileage: 9000, price: 948000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.MPV, transmission: Transmission.AUTOMATIC, fuelType: FuelType.GASOLINE, seats: 7, engine: '1.5L K15B', driveTrain: 'FWD',
    features: [...F.base, ...F.tech], wiki: ['Suzuki_Ertiga'],
    desc: 'Suzuki Ertiga GL AT. The value 7-seater — light on fuel, light on maintenance.' },
  { make: 'Suzuki', model: 'XL7', year: 2023, color: 'Grandeur Gray', mileage: 11000, price: 1058000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.CROSSOVER, transmission: Transmission.AUTOMATIC, fuelType: FuelType.GASOLINE, seats: 7, engine: '1.5L K15B', driveTrain: 'FWD',
    features: [...F.base, ...F.tech, 'Roof Rails'], wiki: ['Suzuki_XL7', 'Suzuki_Ertiga'],
    desc: 'Suzuki XL7 GL AT. Ertiga practicality with raised ride height and rugged crossover styling.' },
  { make: 'Suzuki', model: 'Swift', year: 2022, color: 'Fire Red', mileage: 14000, price: 788000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.HATCHBACK, transmission: Transmission.CVT, fuelType: FuelType.GASOLINE, seats: 5, engine: '1.2L DualJet', driveTrain: 'FWD',
    features: [...F.base, ...F.tech], wiki: ['Suzuki_Swift'],
    desc: 'Suzuki Swift GL CVT. Featherweight chassis makes it genuinely fun in city traffic.' },

  // ── Ford ────────────────────────────────────────────────────────────────────
  { make: 'Ford', model: 'Ranger', year: 2023, color: 'Absolute Black', mileage: 8000, price: 1598000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.PICKUP, transmission: Transmission.AUTOMATIC, fuelType: FuelType.DIESEL, seats: 5, engine: '2.0L Bi-Turbo Diesel', driveTrain: '4x4', featured: true,
    features: [...F.base, ...F.comfort, ...F.tech, ...F.safety, 'Pro Power Onboard'], wiki: ['Ford_Ranger_(2011)', 'Ford_Ranger'],
    desc: 'Ford Ranger Wildtrak 2.0 Bi-Turbo 4x4 AT. Next-gen platform with SYNC 4, a portrait screen and Pro Power Onboard.' },
  { make: 'Ford', model: 'Everest', year: 2023, color: 'Meteor Gray', mileage: 6000, price: 2398000, status: CarStatus.RESERVED,
    bodyType: BodyType.SUV, transmission: Transmission.AUTOMATIC, fuelType: FuelType.DIESEL, seats: 7, engine: '2.0L Bi-Turbo Diesel', driveTrain: '4x4',
    features: [...F.base, ...F.comfort, ...F.tech, ...F.premium], wiki: ['Ford_Everest'],
    desc: 'Ford Everest Titanium+ 4x4 AT. 12-inch portrait display, quilted leather and serious off-road hardware.' },
  { make: 'Ford', model: 'Territory', year: 2022, color: 'Blazer Blue', mileage: 20000, price: 1198000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.CROSSOVER, transmission: Transmission.CVT, fuelType: FuelType.GASOLINE, seats: 5, engine: '1.5L EcoBoost Turbo', driveTrain: 'FWD',
    features: [...F.base, ...F.comfort, ...F.tech, 'Sunroof'], wiki: ['Ford_Territory_(2018)', 'Ford_Kuga', 'Ford_Escape'],
    desc: 'Ford Territory Titanium AT. Big-car equipment levels — panoramic roof, SYNC 3 and Co-Pilot360.' },

  // ── Kia ─────────────────────────────────────────────────────────────────────
  { make: 'Kia', model: 'Carnival', year: 2023, color: 'Snow White Pearl', mileage: 7000, price: 2498000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.VAN, transmission: Transmission.AUTOMATIC, fuelType: FuelType.DIESEL, seats: 8, engine: '2.2L CRDi Diesel', driveTrain: 'FWD',
    features: [...F.base, ...F.comfort, ...F.tech, ...F.premium, 'Power Sliding Doors'], wiki: ['Kia_Carnival', 'Kia_Sedona'],
    desc: 'Kia Carnival 2.2 CRDi EX AT. Lounge-grade second row, power sliding doors and limousine space.' },
  { make: 'Kia', model: 'Sportage', year: 2023, color: 'Interstellar Gray', mileage: 9000, price: 1698000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.SUV, transmission: Transmission.AUTOMATIC, fuelType: FuelType.GASOLINE, seats: 5, engine: '2.0L Smartstream', driveTrain: 'FWD',
    features: [...F.base, ...F.comfort, ...F.tech, ...F.safety], wiki: ['Kia_Sportage'],
    desc: 'Kia Sportage 2.0 EX AT. Panoramic curved display and boundary-pushing design inside and out.' },
  { make: 'Kia', model: 'Seltos', year: 2022, color: 'Glacier White Pearl', mileage: 16000, price: 1298000, status: CarStatus.AVAILABLE,
    bodyType: BodyType.SUV, transmission: Transmission.AUTOMATIC, fuelType: FuelType.GASOLINE, seats: 5, engine: '1.6L MPi', driveTrain: 'FWD',
    features: [...F.base, ...F.comfort, ...F.tech, 'Premium Sound System'], wiki: ['Kia_Seltos', 'Kia_Stonic'],
    desc: 'Kia Seltos 1.6 EX AT. Bold compact SUV with Bose audio, smart key and a well-built cabin.' },
];

const SAMPLE_LEADS = [
  { name: 'Maria Santos', email: 'maria.santos@example.com', phone: '0917 555 0142', type: LeadType.TEST_DRIVE, status: LeadStatus.NEW,
    message: 'Good day! Available po ba this Saturday for a test drive? Interested in the Innova for our family.', model: 'Innova' },
  { name: 'Jomar Reyes', email: 'jomar.reyes@example.com', phone: '0918 555 0277', type: LeadType.FINANCING, status: LeadStatus.CONTACTED,
    message: 'How much is the monthly if I put 20% down over 5 years? I am a BPO employee with 3 years tenure.', model: 'Ranger', budget: 320000 },
  { name: 'Angelica Dela Cruz', email: 'angelica.dc@example.com', phone: '0920 555 0388', type: LeadType.INQUIRY, status: LeadStatus.NEGOTIATING,
    message: 'Is the price negotiable for cash? Can I also see the OR/CR and service history?', model: 'Civic' },
  { name: 'Ronnie Villanueva', email: 'ronnie.v@example.com', phone: '0995 555 0411', type: LeadType.TRADE_IN, status: LeadStatus.NEW,
    message: 'I want to trade in my 2016 Vios AT, around 90,000 km, well maintained. How much can you offer?', model: 'Xpander', tradeInVehicle: '2016 Toyota Vios 1.3 E AT — 90,000 km' },
  { name: 'Grace Lim', email: 'grace.lim@example.com', phone: '0927 555 0533', type: LeadType.INQUIRY, status: LeadStatus.WON,
    message: 'Confirmed for the Montero Sport. Thank you for the smooth transaction!', model: 'Montero Sport' },
  { name: 'Paolo Mendoza', phone: '0936 555 0699', type: LeadType.CONTACT, status: LeadStatus.LOST,
    message: 'Do you have a Hilux 4x2 manual under 1.2M? Found one elsewhere already.' },
];

async function seed() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const userRepo: Repository<User> = app.get(getRepositoryToken(User));
  const makeRepo: Repository<Make> = app.get(getRepositoryToken(Make));
  const carRepo: Repository<Car> = app.get(getRepositoryToken(Car));
  const leadRepo: Repository<Lead> = app.get(getRepositoryToken(Lead));

  // ── Admin account ───────────────────────────────────────────────────────────
  console.log('\n👤 Admin account...');
  const adminEmail = 'admin@veloramotors.ph';
  let admin = await userRepo.findOne({ where: { email: adminEmail } });
  if (!admin) {
    // Migrate the previous DealerOS account instead of leaving a stale login behind.
    const legacy = await userRepo.findOne({ where: { email: 'admin@dealeros.com' } });
    if (legacy) {
      legacy.email = adminEmail;
      legacy.name = 'Velora Admin';
      legacy.password = await bcrypt.hash('admin123', 10);
      admin = await userRepo.save(legacy);
      console.log('  ↻ migrated admin@dealeros.com → ' + adminEmail);
    } else {
      admin = await userRepo.save(
        userRepo.create({
          email: adminEmail,
          password: await bcrypt.hash('admin123', 10),
          name: 'Velora Admin',
          role: UserRole.ADMIN,
        }),
      );
      console.log('  ✓ created ' + adminEmail);
    }
  }
  console.log('  🔑 ' + adminEmail + ' / admin123');

  // ── Makes ───────────────────────────────────────────────────────────────────
  console.log('\n📦 Brands...');
  const makeMap = new Map<string, Make>();
  for (const name of PH_MAKES) {
    let make = await makeRepo.findOne({ where: { name } });
    if (!make) {
      make = await makeRepo.save(makeRepo.create({ name }));
      console.log('  + ' + name);
    }
    makeMap.set(name, make);
  }
  console.log('  ✓ ' + makeMap.size + ' brands ready');

  // ── Cars: create missing, backfill specs on existing ────────────────────────
  console.log('\n🚗 Vehicles + photos (downloads may take a few minutes)...');
  let created = 0;
  let updated = 0;
  let photos = 0;

  for (const c of PH_CARS) {
    const make = makeMap.get(c.make)!;
    const filename =
      c.make.toLowerCase() + '-' + c.model.toLowerCase().replace(/[\s/]+/g, '-') + '-' + c.year + '.jpg';

    const photo = await downloadPhoto(c.wiki, filename);
    if (photo) photos++;
    process.stdout.write(
      '  ' + (photo ? '📷' : '· ') + ' ' + c.make + ' ' + c.model + ' ' + c.year + '\n',
    );

    const existing = await carRepo.findOne({
      where: { makeId: make.id, model: c.model, year: c.year },
    });

    const specs = {
      makeId: make.id,
      color: c.color,
      mileage: c.mileage,
      price: c.price,
      originalPrice: c.originalPrice,
      status: c.status,
      bodyType: c.bodyType,
      transmission: c.transmission,
      fuelType: c.fuelType,
      seats: c.seats,
      engine: c.engine,
      driveTrain: c.driveTrain,
      plateEnding: (c.model.length + c.year) % 10,
      location: 'Davao City',
      description: c.desc,
      features: c.features,
      featured: c.featured ?? false,
      photo: photo ?? undefined,
    };

    if (existing) {
      Object.assign(existing, specs);
      await carRepo.save(existing);
      updated++;
    } else {
      await carRepo.save(carRepo.create({ ...specs, make, model: c.model, year: c.year }));
      created++;
    }

    await sleep(400);
  }
  console.log(`  ✓ ${created} created, ${updated} updated, ${photos}/${PH_CARS.length} photos on disk`);

  // ── Leads ───────────────────────────────────────────────────────────────────
  console.log('\n📨 Sample enquiries...');
  const leadCount = await leadRepo.count();
  if (leadCount > 0) {
    console.log('  ℹ ' + leadCount + ' leads already present — skipping');
  } else {
    for (const l of SAMPLE_LEADS) {
      const car = l.model
        ? await carRepo.findOne({ where: { model: l.model } })
        : null;
      await leadRepo.save(
        leadRepo.create({
          name: l.name,
          email: l.email,
          phone: l.phone,
          type: l.type,
          status: l.status,
          message: l.message,
          carId: car?.id,
          budget: l.budget,
          tradeInVehicle: l.tradeInVehicle,
        }),
      );
    }
    console.log('  ✓ ' + SAMPLE_LEADS.length + ' sample leads created');
  }

  await app.close();
  console.log('\n✅ Seed complete — Velora Motors is ready.\n');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
