import { Injectable, Inject } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ClientProxy } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { firstValueFrom, timeout, catchError, throwError } from "rxjs";
import * as bcrypt from "bcrypt";
import {
  ICreateUserDto,
  ILoginDto,
  IRefreshTokenDto,
  IChangePasswordDto,
  ILogoutDto,
  getErrorMessage,
  SagaType,
  ISagaStep,
} from "@app/shared";
import type { ISaga } from "@app/shared/types/saga";
import { AuthUser } from "@app/shared";
import { RedisTokenService } from "./redis-token.service";
import { SagaService } from "./saga.service";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AuthUser)
    private authUserRepository: Repository<AuthUser>,
    @Inject("USER_SERVICE") private readonly userClient: ClientProxy,
    private readonly jwtService: JwtService,
    private readonly redisTokenService: RedisTokenService,
    private readonly sagaService: SagaService,
  ) {}

  getHello(): string {
    return "Hello World from AUTH-SERVICE!";
  }

  /**
   * Регистрация пользователя с паттерном Saga
   * Использует Saga Service для управления компенсирующими транзакциями
   * 1. Создаем пользователя в PostgreSQL (auth_db)
   * 2. Создаем профиль в User Service (user_db)
   * 3. При ошибке выполняется автоматическая компенсация
   */
  async register(createUserDto: ICreateUserDto) {
    try {
      // Валидация входных данных
      if (!createUserDto.email) {
        return {
          success: false,
          error: "Email is required",
        };
      }

      if (!createUserDto.password) {
        return {
          success: false,
          error: "Password is required",
        };
      }

      if (!createUserDto.username) {
        return {
          success: false,
          error: "Username is required",
        };
      }

      // Проверяем, существует ли пользователь
      const existingUser = await this.authUserRepository.findOne({
        where: { email: createUserDto.email },
      });

      if (existingUser) {
        return {
          success: false,
          error: "Пользователь с таким email уже существует",
        };
      }

      // Подготавливаем данные для саги
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(
        createUserDto.password,
        saltRounds,
      );

      const username = createUserDto.username.trim();
      const role = createUserDto.role || "listener";

      // Создаем шаги саги для компенсации
      let savedUser: AuthUser;
      let saga: ISaga | null = null;

      try {
        // Шаг 1: Создаем пользователя в auth_db
        const authUser = this.authUserRepository.create({
          email: createUserDto.email,
          password: hashedPassword,
        });

        savedUser = await this.authUserRepository.save(authUser);

        // Создаем сагу для управления компенсацией
        const sagaSteps: ISagaStep[] = [
          {
            stepId: "create-auth-user",
            service: "auth",
            action: "createAuthUser",
            status: "completed" as any,
            data: {
              userId: savedUser.id,
            },
            result: { userId: savedUser.id },
            compensation: {
              action: "deleteAuthUser",
              data: {
                userId: savedUser.id,
              },
            },
          },
          {
            stepId: "create-user-profile",
            service: "user",
            action: "createProfile",
            status: "pending" as any,
            data: {
              userId: savedUser.id,
              username,
              role,
            },
            compensation: {
              action: "deleteProfile",
              data: {
                userId: savedUser.id,
              },
            },
          },
        ];

        saga = this.sagaService.createSaga(SagaType.USER_CREATION, sagaSteps);

        // Шаг 2: Создаем профиль в user_db
        const profileResult = await firstValueFrom(
          this.userClient
            .send<{
              success: boolean;
              profile?: any;
              error?: string;
            }>(
              { cmd: "createProfile" },
              {
                userId: savedUser.id,
                username,
                role,
              },
            )
            .pipe(
              timeout(10000),
              catchError((error) => {
                if (error.name === "TimeoutError") {
                  return throwError(
                    () => new Error("User Service timeout: createProfile"),
                  );
                }
                return throwError(() => error);
              }),
            ),
        );

        if (!profileResult.success) {
          // Компенсируем через Saga Service
          if (saga) {
            saga.steps[0].status = "completed" as any;
            await this.sagaService.executeSaga(saga.sagaId);
          } else {
            // Fallback: прямая компенсация
            await this.authUserRepository.delete(savedUser.id);
          }

          return {
            success: false,
            error: profileResult.error || "Failed to create user profile",
          };
        }

        // Все шаги выполнены успешно - отправляем событие
        this.userClient.emit("user.created", {
          userId: savedUser.id,
          email: savedUser.email,
          username,
          role,
        });

        const { password: _password, ...userWithoutPassword } = savedUser;

        return {
          success: true,
          user: {
            id: userWithoutPassword.id,
            email: userWithoutPassword.email,
          },
        };
      } catch (error) {
        // Выполняем компенсацию через Saga Service
        if (saga && savedUser) {
          try {
            await this.sagaService.executeSaga(saga.sagaId);
          } catch (_compensationError) {
            // Fallback: прямая компенсация
            try {
              await this.authUserRepository.delete(savedUser.id);
            } catch (deleteError) {
              console.error(
                "Failed to delete user during compensation:",
                deleteError,
              );
            }
          }
        } else if (savedUser) {
          // Если сага не создана, выполняем прямую компенсацию
          try {
            await this.authUserRepository.delete(savedUser.id);
          } catch (deleteError) {
            console.error(
              "Failed to delete user during compensation:",
              deleteError,
            );
          }
        }

        return {
          success: false,
          error: getErrorMessage(error, "Failed to create user profile"),
        };
      }
    } catch (error) {
      console.error("Register error:", error);
      return {
        success: false,
        error: getErrorMessage(error, "Failed to register user"),
      };
    }
  }

  /**
   * Получение пользователя по email (только для внутреннего использования)
   * С кэшированием данных на 10 минут
   */
  async getUserByEmail(email: string) {
    try {
      // Проверяем кэш
      const cachedUser =
        await this.redisTokenService.getCachedUserDataByEmail(email);
      if (cachedUser && cachedUser.password) {
        return {
          success: true,
          user: {
            id: cachedUser.id,
            email: cachedUser.email,
            password: cachedUser.password,
          },
        };
      }

      // Если нет в кэше, загружаем из PostgreSQL (auth_db)
      const user = await this.authUserRepository.findOne({
        where: { email },
      });

      if (user) {
        // Кэшируем данные пользователя на 10 минут (включая пароль для проверки)
        await this.redisTokenService.cacheUserDataByEmail(
          user.email,
          {
            id: user.id,
            email: user.email,
            password: user.password,
          },
          10 * 60, // 10 минут
        );

        // Также кэшируем по ID для getUserById
        await this.redisTokenService.cacheUserData(
          user.id,
          {
            id: user.id,
            email: user.email,
          },
          10 * 60, // 10 минут
        );

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            password: user.password,
          },
        };
      }

      return {
        success: false,
        error: "User not found",
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to find user"),
      };
    }
  }

  /**
   * Получение пользователя по ID (только для внутреннего использования)
   * С кэшированием данных на 10 минут
   */
  async getUserById(id: string) {
    try {
      // Проверяем кэш
      const cachedUser = await this.redisTokenService.getCachedUserData(id);
      if (cachedUser) {
        return {
          success: true,
          user: {
            id: cachedUser.id,
            email: cachedUser.email,
          },
        };
      }

      // Если нет в кэше, загружаем из PostgreSQL (auth_db)
      const user = await this.authUserRepository.findOne({
        where: { id },
      });

      if (user) {
        // Кэшируем данные пользователя на 10 минут
        await this.redisTokenService.cacheUserData(
          user.id,
          {
            id: user.id,
            email: user.email,
          },
          10 * 60, // 10 минут
        );

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
          },
        };
      }

      return {
        success: false,
        error: "User not found",
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to find user"),
      };
    }
  }

  /**
   * Вход в систему
   * Получаем данные из PostgreSQL (auth_db) и профиль из User Service (user_db)
   */
  async login(loginDto: ILoginDto) {
    try {
      // Получаем пользователя из PostgreSQL (auth_db)
      const authResult = await this.getUserByEmail(loginDto.email);

      if (!authResult.success || !authResult.user) {
        return {
          success: false,
          error: "Invalid email or password",
        };
      }

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        authResult.user.password,
      );

      if (!isPasswordValid) {
        return {
          success: false,
          error: "Invalid email or password",
        };
      }

      // Получаем профиль из User Service
      const profileResult = await firstValueFrom(
        this.userClient.send<{
          success: boolean;
          profile?: { username: string; role: string };
          error?: string;
        }>({ cmd: "getProfileByUserId" }, { userId: authResult.user.id }),
      );

      if (!profileResult.success || !profileResult.profile) {
        return {
          success: false,
          error: "User profile not found",
        };
      }

      const payload = {
        sub: authResult.user.id,
        email: authResult.user.email,
        username: profileResult.profile.username,
        role: profileResult.profile.role,
      };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: "15m",
      });

      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: "7d",
      });

      // Сохраняем refresh токен в Redis
      await this.redisTokenService.saveRefreshToken(
        authResult.user.id,
        refreshToken,
        7 * 24 * 60 * 60, // 7 дней в секундах
      );

      return {
        success: true,
        user: {
          id: authResult.user.id,
          email: authResult.user.email,
          username: profileResult.profile.username,
          role: profileResult.profile.role,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "User service unavailable"),
      };
    }
  }

  /**
   * Обновление токенов
   */
  async refreshTokens(refreshTokenDto: IRefreshTokenDto) {
    try {
      const decoded = this.jwtService.verify(refreshTokenDto.refreshToken);

      if (
        typeof decoded !== "object" ||
        decoded === null ||
        !("sub" in decoded)
      ) {
        return {
          success: false,
          error: "Invalid refresh token",
        };
      }

      const userId = String(decoded.sub);

      // Проверяем, что токен не отозван (существует в Redis)
      const isTokenValid = await this.redisTokenService.isRefreshTokenValid(
        userId,
        refreshTokenDto.refreshToken,
      );

      if (!isTokenValid) {
        return {
          success: false,
          error: "Refresh token has been revoked",
        };
      }

      // Проверяем существование пользователя в PostgreSQL (auth_db)
      const authResult = await this.getUserById(userId);
      if (!authResult.success || !authResult.user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      // Получаем профиль из User Service
      const profileResult = await firstValueFrom(
        this.userClient.send<{
          success: boolean;
          profile?: { username: string; role: string };
          error?: string;
        }>({ cmd: "getProfileByUserId" }, { userId }),
      );

      if (!profileResult.success || !profileResult.profile) {
        return {
          success: false,
          error: "User profile not found",
        };
      }

      const payload = {
        sub: authResult.user.id,
        email: authResult.user.email,
        username: profileResult.profile.username,
        role: profileResult.profile.role,
      };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: "15m",
      });

      const newRefreshToken = this.jwtService.sign(payload, {
        expiresIn: "7d",
      });

      // Отзываем старый токен и сохраняем новый
      await this.redisTokenService.revokeRefreshToken(
        userId,
        refreshTokenDto.refreshToken,
      );
      await this.redisTokenService.saveRefreshToken(
        userId,
        newRefreshToken,
        7 * 24 * 60 * 60, // 7 дней в секундах
      );

      return {
        success: true,
        user: {
          id: authResult.user.id,
          email: authResult.user.email,
          username: profileResult.profile.username,
          role: profileResult.profile.role,
        },
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "JsonWebTokenError") {
        return {
          success: false,
          error: "Invalid or expired refresh token",
        };
      }
      return {
        success: false,
        error: getErrorMessage(error, "User service unavailable"),
      };
    }
  }

  /**
   * Изменение пароля
   */
  async changePassword(changePasswordDto: IChangePasswordDto) {
    try {
      const user = await this.authUserRepository.findOne({
        where: { id: changePasswordDto.userId },
      });

      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      const isPasswordValid = await bcrypt.compare(
        changePasswordDto.oldPassword,
        user.password,
      );

      if (!isPasswordValid) {
        return {
          success: false,
          error: "Invalid old password",
        };
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(
        changePasswordDto.newPassword,
        saltRounds,
      );

      user.password = hashedPassword;
      await this.authUserRepository.save(user);

      // Инвалидируем кэш пользователя при изменении пароля
      await this.redisTokenService.invalidateUserCache(user.id);
      await this.redisTokenService.invalidateUserCacheByEmail(user.email);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to update password"),
      };
    }
  }

  /**
   * Выход из системы (отзыв refresh токена)
   */
  async logout(logoutDto: ILogoutDto) {
    try {
      // Декодируем токен для получения userId
      const decoded = this.jwtService.verify(logoutDto.refreshToken);

      if (
        typeof decoded !== "object" ||
        decoded === null ||
        !("sub" in decoded)
      ) {
        return {
          success: false,
          error: "Invalid refresh token",
        };
      }

      const userId = String(decoded.sub);

      // Отзываем токен (удаляем из Redis)
      await this.redisTokenService.revokeRefreshToken(
        userId,
        logoutDto.refreshToken,
      );

      return {
        success: true,
      };
    } catch (error) {
      // Если токен невалидный, все равно возвращаем success
      // (токен уже недействителен, цель достигнута)
      if (error instanceof Error && error.name === "JsonWebTokenError") {
        return {
          success: true,
        };
      }
      return {
        success: false,
        error: getErrorMessage(error, "Failed to logout"),
      };
    }
  }
}
