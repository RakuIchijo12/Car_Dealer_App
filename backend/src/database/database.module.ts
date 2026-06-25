import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../users/user.entity';
import { Car } from '../cars/car.entity';
import { Make } from '../makes/make.entity';
import { Customer } from '../customers/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('POSTGRES_HOST'),
        port: +(config.get<number>('POSTGRES_PORT') ?? 5432),
        username: config.get('POSTGRES_USER'),
        password: config.get('POSTGRES_PASSWORD'),
        database: config.get('POSTGRES_DB'),
        entities: [User, Car, Make, Customer],
        synchronize: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
