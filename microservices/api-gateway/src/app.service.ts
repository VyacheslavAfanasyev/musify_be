import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  firstValueFrom,
  Observable,
  timeout,
  catchError,
  throwError,
} from 'rxjs';
import type {
  IChangePasswordDto,
  ICreateUserDto,
  ILoginDto,
  IRefreshTokenDto,
  IBaseResponse,
  IRegisterResponse,
  ILoginResponse,
  IRefreshResponse,
  IUpdateUserProfileDto,
} from '@app/shared';

@Injectable()
export class AppService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
  ) {}

  getHello(): string {
    return 'Hello World from GATEAWAY!';
  }

  private async sendToAuthService<TResponse, TInput = unknown>(
    cmd: string,
    payload: TInput,
  ): Promise<TResponse> {
    const observable = this.authClient.send<TResponse, TInput>(
      { cmd },
      payload,
    ) as unknown as Observable<TResponse>;
    return await firstValueFrom(
      observable.pipe(
        timeout(10000), // 10 секунд таймаут
        catchError((error) => {
          if (error.name === 'TimeoutError') {
            return throwError(() => new Error(`Auth Service timeout: ${cmd}`));
          }
          return throwError(() => error);
        }),
      ),
    );
  }

  private async sendToUserService<TResponse, TInput = unknown>(
    cmd: string,
    payload: TInput,
  ): Promise<TResponse> {
    const observable = this.userClient.send<TResponse, TInput>(
      { cmd },
      payload,
    ) as unknown as Observable<TResponse>;
    return await firstValueFrom(
      observable.pipe(
        timeout(10000), // 10 секунд таймаут
        catchError((error) => {
          if (error.name === 'TimeoutError') {
            return throwError(() => new Error(`User Service timeout: ${cmd}`));
          }
          return throwError(() => error);
        }),
      ),
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

  /**
   * Получение полного профиля пользователя
   * Объединяет данные из Auth Service (базовые данные) и User Service (профиль)
   */
  async getUserProfile(userId: string) {
    try {
      // Получаем базовые данные из Auth Service
      const authResult = await this.sendToAuthService<{
        success: boolean;
        user?: { id: string; email: string };
        error?: string;
      }>('getUserById', { id: userId });

      if (!authResult.success || !authResult.user) {
        return {
          success: false,
          error: authResult.error || 'User not found',
        };
      }

      // Получаем профиль из User Service
      const profileResult = await this.sendToUserService<{
        success: boolean;
        profile?: any;
        error?: string;
      }>('getProfileByUserId', { userId });

      if (!profileResult.success || !profileResult.profile) {
        return {
          success: false,
          error: 'User profile not found',
        };
      }

      // Объединяем данные
      const profile = profileResult.profile.toObject
        ? profileResult.profile.toObject()
        : profileResult.profile;

      return {
        success: true,
        user: {
          id: authResult.user.id,
          email: authResult.user.email,
          ...profile,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Получение профиля по username
   */
  async getUserProfileByUsername(username: string) {
    try {
      const profileResult = await this.sendToUserService<{
        success: boolean;
        profile?: any;
        error?: string;
      }>('getProfileByUsername', { username });

      if (!profileResult.success || !profileResult.profile) {
        return {
          success: false,
          error: profileResult.error || 'Profile not found',
        };
      }

      const profile = profileResult.profile.toObject
        ? profileResult.profile.toObject()
        : profileResult.profile;

      // Получаем email из Auth Service
      const authResult = await this.sendToAuthService<{
        success: boolean;
        user?: { id: string; email: string };
        error?: string;
      }>('getUserById', { id: profile.userId });

      return {
        success: true,
        user: {
          ...profile,
          email:
            authResult.success && authResult.user
              ? authResult.user.email
              : undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Обновление профиля пользователя
   */
  async updateUserProfile(
    userId: string,
    updateDto: IUpdateUserProfileDto,
  ): Promise<IBaseResponse> {
    return this.sendToUserService<
      IBaseResponse,
      {
        userId: string;
        updateDto: IUpdateUserProfileDto;
      }
    >('updateProfile', { userId, updateDto });
  }
}
