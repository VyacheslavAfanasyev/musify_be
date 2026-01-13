import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppService } from './app.service';
import type {
  IChangePasswordDto,
  ICreateUserDto,
  ILoginDto,
  IRefreshTokenDto,
  ILogoutDto,
  IUpdateUserProfileDto,
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
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 запросов в минуту
  register(@Body() registerDto: ICreateUserDto) {
    return this.appService.register(registerDto);
  }

  @Post('auth/login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 запросов в минуту
  login(@Body() loginDto: ILoginDto) {
    return this.appService.login(loginDto);
  }

  @Post('auth/refresh')
  refresh(@Body() refreshTokenDto: IRefreshTokenDto) {
    return this.appService.refresh(refreshTokenDto);
  }

  @Post('auth/logout')
  logout(@Body() logoutDto: ILogoutDto) {
    return this.appService.logout(logoutDto);
  }

  @Post('auth/change_pass')
  changePassword(@Body() changePasswordDto: IChangePasswordDto) {
    return this.appService.changePassword(changePasswordDto);
  }

  @Get('users/hello')
  getUsersHello(): Promise<string> {
    return this.appService.getAuthHello();
  }

  @Get('users/:id/profile')
  getUserProfile(@Param('id') id: string) {
    return this.appService.getUserProfile(id);
  }

  @Get('users/username/:username')
  getUserProfileByUsername(@Param('username') username: string) {
    return this.appService.getUserProfileByUsername(username);
  }

  @Put('users/:id/profile')
  updateUserProfile(
    @Param('id') id: string,
    @Body() updateDto: IUpdateUserProfileDto,
  ) {
    return this.appService.updateUserProfile(id, updateDto);
  }
}
