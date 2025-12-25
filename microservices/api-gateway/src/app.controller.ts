import {
  Controller,
  Get,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { AppService } from './app.service';

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
}
