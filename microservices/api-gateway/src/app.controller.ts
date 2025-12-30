import { Controller, Get, Inject, Post, Body } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { AppService } from './app.service';
import type {
  IChangePasswordDto,
  ICreateUserDto,
  ILoginDto,
  IRefreshTokenDto,
  IBaseResponse,
  IRegisterResponse,
  ILoginResponse,
  IRefreshResponse,
} from '@app/shared';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  private async sendToAuthService<TResponse, TInput = unknown>(
    cmd: string,
    payload: TInput,
  ): Promise<TResponse> {
    return await firstValueFrom(
      this.authClient.send<TResponse, TInput>(
        { cmd },
        payload,
      ) as unknown as Observable<TResponse>,
    );
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('auth/hello')
  getAuthHello(): Promise<string> {
    return this.sendToAuthService<string, Record<string, never>>(
      'getHello',
      {},
    );
  }

  @Post('auth/register')
  register(@Body() registerDto: ICreateUserDto) {
    return this.sendToAuthService<IRegisterResponse, ICreateUserDto>(
      'register',
      registerDto,
    );
  }

  @Post('auth/login')
  login(@Body() loginDto: ILoginDto) {
    return this.sendToAuthService<ILoginResponse, ILoginDto>('login', loginDto);
  }

  @Post('auth/refresh')
  refresh(@Body() refreshTokenDto: IRefreshTokenDto) {
    return this.sendToAuthService<IRefreshResponse, IRefreshTokenDto>(
      'refresh',
      refreshTokenDto,
    );
  }

  @Post('auth/change_pass')
  changePassword(@Body() changePasswordDto: IChangePasswordDto) {
    return this.sendToAuthService<IBaseResponse, IChangePasswordDto>(
      'changePassword',
      changePasswordDto,
    );
  }
}
