import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import type {
  IChangePasswordDto,
  ICreateUserDto,
  ILoginDto,
  IRefreshTokenDto,
} from '@app/shared';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('auth/hello')
  getAuthHello(): Promise<string> {
    return this.appService.getAuthHello();
  }

  @Post('auth/register')
  register(@Body() registerDto: ICreateUserDto) {
    return this.appService.register(registerDto);
  }

  @Post('auth/login')
  login(@Body() loginDto: ILoginDto) {
    return this.appService.login(loginDto);
  }

  @Post('auth/refresh')
  refresh(@Body() refreshTokenDto: IRefreshTokenDto) {
    return this.appService.refresh(refreshTokenDto);
  }

  @Post('auth/change_pass')
  changePassword(@Body() changePasswordDto: IChangePasswordDto) {
    return this.appService.changePassword(changePasswordDto);
  }
}
