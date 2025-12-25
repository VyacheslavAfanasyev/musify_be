import { Controller, Get, Inject, HttpException, HttpStatus } from '@nestjs/common';
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
  async getAuthHello() {
    try {
      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'getHello' }, {}) as unknown as Observable<any>,
      );
      return result;
    } catch (error) {
      console.error('Error connecting to auth service:', error);
      throw new HttpException(
        `Auth service unavailable: ${error.message || 'Connection failed'}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
