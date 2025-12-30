import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { AppService } from './app.service';
import type {
  IChangePasswordDto,
  ICreateUserDto,
  ILoginDto,
  IRefreshTokenDto,
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
  async register(@Body() registerDto: ICreateUserDto) {
    try {
      return await this.appService.register(registerDto);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      };
    }
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
