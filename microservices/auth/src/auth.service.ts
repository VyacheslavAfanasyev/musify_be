import { Injectable, Inject } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import * as bcrypt from "bcrypt";
import { ICreateUserDto, ILoginDto, IRefreshTokenDto } from "@app/shared";

@Injectable()
export class AuthService {
  constructor(
    @Inject("USER_SERVICE") private readonly userClient: ClientProxy,
    private readonly jwtService: JwtService,
  ) {}

  getHello(): string {
    return "Hello World from AUTH-SERVICE!";
  }

  private async sendToUserService<TResponse, TInput = unknown>(
    cmd: string,
    payload: TInput,
  ): Promise<TResponse> {
    return await firstValueFrom(
      this.userClient.send<TResponse, TInput>({ cmd }, payload),
    );
  }

  async register(createUserDto: ICreateUserDto) {
    try {
      const user = await this.sendToUserService<{
        success: boolean;
        user?: unknown;
        error?: string;
      }>("createUser", createUserDto);

      if (!user.success || !user.user) {
        return {
          success: false,
          error: user.error || "Failed to create user",
        };
      }

      const { password: _password, ...userWithoutPassword } = user.user as {
        password: string;
        [key: string]: unknown;
      };

      return {
        success: true,
        user: userWithoutPassword,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getUserByEmail(email: string) {
    const user = await this.sendToUserService<{
      success: boolean;
      user?: unknown;
      error?: string;
    }>("getUserByEmail", { email });

    if (user.success && user.user) {
      const { password: _password, ...userWithoutPassword } = user.user as {
        password: string;
        [key: string]: unknown;
      };
      return userWithoutPassword;
    }
    return null;
  }

  async getUserById(id: string) {
    const user = await this.sendToUserService<{
      success: boolean;
      user?: unknown;
      error?: string;
    }>("getUserById", { id });

    if (user.success && user.user) {
      const { password: _password, ...userWithoutPassword } = user.user as {
        password: string;
        [key: string]: unknown;
      };
      return userWithoutPassword;
    }
    return null;
  }

  async login(loginDto: ILoginDto) {
    try {
      const user = await this.sendToUserService<{
        success: boolean;
        user?: {
          password: string;
          id: string;
          email: string;
          username: string;
          role: string;
        };
        error?: string;
      }>("getUserByEmail", { email: loginDto.email });

      if (!user.success || !user.user) {
        return {
          success: false,
          error: user.error || "Invalid email or password",
        };
      }

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.user.password,
      );

      if (!isPasswordValid) {
        return {
          success: false,
          error: "Invalid email or password",
        };
      }

      const payload = {
        sub: user.user.id,
        email: user.user.email,
        username: user.user.username,
        role: user.user.role,
      };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: "15m",
      });

      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: "7d",
      });

      const { password: _password, ...userWithoutPassword } = user.user;

      return {
        success: true,
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

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
      const user = await this.sendToUserService<{
        success: boolean;
        user?: { id: string; email: string; username: string; role: string };
        error?: string;
      }>("getUserById", { id: userId });

      if (!user.success || !user.user) {
        return {
          success: false,
          error: user.error || "User not found",
        };
      }

      const payload = {
        sub: user.user.id,
        email: user.user.email,
        username: user.user.username,
        role: user.user.role,
      };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: "15m",
      });

      const newRefreshToken = this.jwtService.sign(payload, {
        expiresIn: "7d",
      });

      return {
        success: true,
        user: user.user,
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (_error) {
      return {
        success: false,
        error: "Invalid or expired refresh token",
      };
    }
  }
}
