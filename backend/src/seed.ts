import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './users/user.entity';
import { Make } from './makes/make.entity';
import { Car, CarStatus } from './cars/car.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userRepo: Repository<User> = app.get(getRepositoryToken(User));
  const makeRepo: Repository<Make> = app.get(getRepositoryToken(Make));
  const carRepo: Repository<Car> = app.get(getRepositoryToken(Car));

  // Seed admin user
  const existing = await userRepo.findOne({ where: { email: 'admin@dealeros.com' } });
  if (!existing) {
    await userRepo.save(userRepo.create({
      email: 'admin@dealeros.com',
      password: await bcrypt.hash('admin123', 10),
      name: 'Admin User',
      role: 'admin' as any,
    }));
    console.log('✓ Admin user created: admin@dealeros.com / admin123');
  }

  // Seed makes
  const makesData = [
    { name: 'Toyota' },
    { name: 'Ford' },
    { name: 'BMW' },
  ];
  const makes: Make[] = [];
  for (const m of makesData) {
    let make = await makeRepo.findOne({ where: { name: m.name } });
    if (!make) {
      make = await makeRepo.save(makeRepo.create(m));
      console.log(`✓ Make created: ${m.name}`);
    }
    makes.push(make);
  }

  // Seed cars
  const carsData = [
    { makeIndex: 0, model: 'Camry', year: 2022, color: 'White', mileage: 15000, price: 26000, status: CarStatus.AVAILABLE },
    { makeIndex: 0, model: 'Corolla', year: 2021, color: 'Silver', mileage: 28000, price: 21000, status: CarStatus.SOLD },
    { makeIndex: 0, model: 'RAV4', year: 2023, color: 'Black', mileage: 5000, price: 35000, status: CarStatus.AVAILABLE },
    { makeIndex: 1, model: 'F-150', year: 2022, color: 'Blue', mileage: 20000, price: 42000, status: CarStatus.RESERVED },
    { makeIndex: 1, model: 'Mustang', year: 2021, color: 'Red', mileage: 12000, price: 38000, status: CarStatus.AVAILABLE },
    { makeIndex: 1, model: 'Explorer', year: 2020, color: 'Gray', mileage: 45000, price: 29000, status: CarStatus.SOLD },
    { makeIndex: 2, model: '3 Series', year: 2023, color: 'Black', mileage: 3000, price: 55000, status: CarStatus.AVAILABLE },
    { makeIndex: 2, model: '5 Series', year: 2022, color: 'White', mileage: 18000, price: 68000, status: CarStatus.AVAILABLE },
    { makeIndex: 2, model: 'X5', year: 2021, color: 'Silver', mileage: 32000, price: 72000, status: CarStatus.RESERVED },
    { makeIndex: 0, model: 'Highlander', year: 2023, color: 'Pearl', mileage: 8000, price: 45000, status: CarStatus.AVAILABLE },
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
