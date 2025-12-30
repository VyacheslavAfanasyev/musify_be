import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
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

@Injectable()
export class AppService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  getHello(): string {
    return 'Hello World from GATEAWAY!';
  }

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

  async getAuthHello(): Promise<string> {
    return this.sendToAuthService<string, Record<string, never>>(
      'getHello',
      {},
    );
  }

  async register(registerDto: ICreateUserDto): Promise<IRegisterResponse> {
    return this.sendToAuthService<IRegisterResponse, ICreateUserDto>(
      'register',
      registerDto,
    );
  }

  async login(loginDto: ILoginDto): Promise<ILoginResponse> {
    return this.sendToAuthService<ILoginResponse, ILoginDto>('login', loginDto);
  }

  async refresh(refreshTokenDto: IRefreshTokenDto): Promise<IRefreshResponse> {
    return this.sendToAuthService<IRefreshResponse, IRefreshTokenDto>(
      'refresh',
      refreshTokenDto,
    );
  }

  async changePassword(
    changePasswordDto: IChangePasswordDto,
  ): Promise<IBaseResponse> {
    return this.sendToAuthService<IBaseResponse, IChangePasswordDto>(
      'changePassword',
      changePasswordDto,
    );
  }
}
