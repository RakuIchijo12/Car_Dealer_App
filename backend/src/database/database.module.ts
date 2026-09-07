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
        const isProd = config.get('NODE_ENV') === 'production';

        return {
          type: 'postgres' as const,
          host,
          port: +(config.get<number>('POSTGRES_PORT') ?? 5432),
          username: config.get<string>('POSTGRES_USER'),
          password: config.get<string>('POSTGRES_PASSWORD'),
          database: config.get<string>('POSTGRES_DB'),
          entities: [User, Car, Make, Customer, Lead],
          // Schema auto-migration is a local convenience only. Letting it run in
          // production means every cold start can ALTER live tables, so it is
          // opt-in there via DB_SYNC=true for the one-off initial deploy.
          synchronize: isProd ? config.get('DB_SYNC') === 'true' : true,
          ssl: needsSsl ? { rejectUnauthorized: false } : false,
          // Each serverless instance gets its own pool, so keep them small —
          // Postgres connection limits are per-cluster, not per-instance.
          ...(isProd ? { poolSize: 3, extra: { max: 3, idleTimeoutMillis: 10_000 } } : {}),
        };
      },
    }),
  ],
})
export class DatabaseModule {}
