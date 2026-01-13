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
  getErrorMessage,
} from "@app/shared";
import { AuthUser } from "@app/shared";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AuthUser)
    private authUserRepository: Repository<AuthUser>,
    @Inject("USER_SERVICE") private readonly userClient: ClientProxy,
    private readonly jwtService: JwtService,
  ) {}

  getHello(): string {
    return "Hello World from AUTH-SERVICE!";
  }

  /**
   * Регистрация пользователя с паттерном Saga
   * 1. Создаем пользователя в PostgreSQL
   * 2. Отправляем событие в User Service для создания профиля
   * 3. Если профиль не создался - откатываем изменения
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

      // 1. Создаем пользователя в PostgreSQL
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(
        createUserDto.password,
        saltRounds,
      );

      const authUser = this.authUserRepository.create({
        email: createUserDto.email,
        password: hashedPassword,
      });

      const savedUser = await this.authUserRepository.save(authUser);

      // 2. Создаем профиль в User Service синхронно (Saga Pattern)
      try {
        // Дополнительная проверка перед отправкой
        if (!createUserDto.username || createUserDto.username.trim() === "") {
          throw new Error("Username is required and cannot be empty");
        }

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
                username: createUserDto.username.trim(),
                role: createUserDto.role || "listener",
              },
            )
            .pipe(
              timeout(10000), // Таймаут 10 секунд
              catchError((error) => {
                console.error("Error in createProfile pipe:", error);
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
          await this.authUserRepository.delete(savedUser.id);
          // Пытаемся удалить профиль из MongoDB, если он был создан частично
          try {
            await firstValueFrom(
              this.userClient
                .send<{
                  success: boolean;
                }>({ cmd: "deleteProfile" }, { userId: savedUser.id })
                .pipe(timeout(5000)),
            );
          } catch (deleteError) {
            console.error(
              "Failed to delete profile during rollback:",
              deleteError,
            );
          }
          return {
            success: false,
            error: profileResult.error || "Failed to create user profile",
          };
        }

        const { password: _password, ...userWithoutPassword } = savedUser;

        return {
          success: true,
          user: {
            id: userWithoutPassword.id,
            email: userWithoutPassword.email,
          },
        };
      } catch (error) {
        // Если не удалось создать профиль, откатываем
        console.error("Failed to create profile, error:", error);
        try {
          await this.authUserRepository.delete(savedUser.id);
          // Пытаемся удалить профиль из MongoDB, если он был создан частично
          try {
            await firstValueFrom(
              this.userClient
                .send<{
                  success: boolean;
                }>({ cmd: "deleteProfile" }, { userId: savedUser.id })
                .pipe(timeout(5000)),
            );
          } catch (deleteError) {
            console.error(
              "Failed to delete profile during rollback:",
              deleteError,
            );
          }
        } catch (rollbackError) {
          console.error("Failed to rollback user:", rollbackError);
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
   */
  async getUserByEmail(email: string) {
    try {
      const user = await this.authUserRepository.findOne({
        where: { email },
      });

      if (user) {
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
   */
  async getUserById(id: string) {
    try {
      const user = await this.authUserRepository.findOne({
        where: { id },
      });

      if (user) {
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
   * Получаем данные из PostgreSQL и профиль из MongoDB
   */
  async login(loginDto: ILoginDto) {
    try {
      // Получаем пользователя из PostgreSQL
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

      // Проверяем существование пользователя в PostgreSQL
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
}
