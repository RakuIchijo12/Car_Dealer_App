import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../users/user.entity';
import { Car } from '../cars/car.entity';
import { Make } from '../makes/make.entity';
import { Customer } from '../customers/customer.entity';
import { Lead } from '../leads/lead.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('POSTGRES_HOST') ?? 'localhost';
        const needsSsl = host.includes('neon.tech') || config.get('PGSSLMODE') === 'require';
        return {
          type: 'postgres' as const,
          host,
          port: +(config.get<number>('POSTGRES_PORT') ?? 5432),
          username: config.get<string>('POSTGRES_USER'),
          password: config.get<string>('POSTGRES_PASSWORD'),
          database: config.get<string>('POSTGRES_DB'),
          entities: [User, Car, Make, Customer, Lead],
          synchronize: true,
          ssl: needsSsl ? { rejectUnauthorized: false } : false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
