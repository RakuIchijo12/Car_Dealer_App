import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) { return this.authService.login(dto); }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req) {
    const { password, ...user } = req.user;
    return user;
  }
}
