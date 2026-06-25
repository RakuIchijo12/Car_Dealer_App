import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Make } from './make.entity';
import { MakesService } from './makes.service';
import { MakesController } from './makes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Make])],
  controllers: [MakesController],
  providers: [MakesService],
  exports: [MakesService],
})
export class MakesModule {}
