import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CarsModule } from './cars/cars.module';
import { MakesModule } from './makes/makes.module';
import { CustomersModule } from './customers/customers.module';
import { PublicModule } from './public/public.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    CarsModule,
    MakesModule,
    CustomersModule,
    PublicModule,
  ],
})
export class AppModule {}
