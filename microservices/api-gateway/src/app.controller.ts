import {
  Controller,
  Get,
  Inject,
  HttpException,
  HttpStatus,
  Post,
  Body,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { AppService } from './app.service';
import type { ICreateUserDto } from '@app/shared';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('auth/hello')
  async getAuthHello(): Promise<{ message: string }> {
    try {
      const result = await firstValueFrom(
        this.authClient.send<{ message: string }, Record<string, never>>(
          { cmd: 'getHello' },
          {},
        ) as unknown as Observable<{ message: string }>,
      );
      return result;
    } catch (error: unknown) {
      console.error('Error connecting to auth service:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Connection failed';
      throw new HttpException(
        `Auth service unavailable: ${errorMessage}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Post('auth/register')
  register(@Body() registerDto: ICreateUserDto) {
    return firstValueFrom(
      this.authClient.send(
        { cmd: 'register' },
        registerDto,
      ) as unknown as Observable<any>,
    );
  }
}
