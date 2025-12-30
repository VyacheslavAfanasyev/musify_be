import { Controller, Get, Inject, Post, Body } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { AppService } from './app.service';
import type { ICreateUserDto, ILoginDto, IRefreshTokenDto } from '@app/shared';

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
    return this.sendToAuthService<
      { success: true; user: unknown } | { success: false; error: string },
      ICreateUserDto
    >('register', registerDto);
  }

  @Post('auth/login')
  login(@Body() loginDto: ILoginDto) {
    return this.sendToAuthService<
      | {
          success: true;
          user: unknown;
          accessToken: string;
          refreshToken: string;
        }
      | { success: false; error: string },
      ILoginDto
    >('login', loginDto);
  }

  @Post('auth/refresh')
  refresh(@Body() refreshTokenDto: IRefreshTokenDto) {
    return this.sendToAuthService<
      | {
          success: true;
          user: unknown;
          accessToken: string;
          refreshToken: string;
        }
      | { success: false; error: string },
      IRefreshTokenDto
    >('refresh', refreshTokenDto);
  }
}
