import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import type { ICreateUserDto } from '@app/shared';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: 'getHello' })
  getHello(): string {
    return this.authService.getHello();
  }

  @MessagePattern({ cmd: 'register' })
  async register(@Payload() createUserDto: ICreateUserDto) {
    return await this.authService.register(createUserDto);
  }

  @MessagePattern({ cmd: 'getUserByEmail' })
  async getUserByEmail(@Payload() email: string) {
    return await this.authService.getUserByEmail(email);
  }

  @MessagePattern({ cmd: 'getUserById' })
  async getUserById(@Payload() id: string) {
    return await this.authService.getUserById(id);
  }
}
