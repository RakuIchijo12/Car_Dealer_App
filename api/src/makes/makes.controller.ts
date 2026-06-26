import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MakesService } from './makes.service';
import { CreateMakeDto } from './dto/create-make.dto';
import { UpdateMakeDto } from './dto/update-make.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('makes')
export class MakesController {
  constructor(private makesService: MakesService) {}

  @Get() findAll() { return this.makesService.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.makesService.findOne(id); }
  @Post() create(@Body() dto: CreateMakeDto) { return this.makesService.create(dto); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMakeDto) {
    return this.makesService.update(id, dto);
  }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.makesService.remove(id); }
}
