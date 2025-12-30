import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users/users.service';
import { ICreateUserDto, ILoginDto, IRefreshTokenDto } from '@app/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  getHello(): string {
    return 'Hello World from AUTH-SERVICE!';
  }

  async register(createUserDto: ICreateUserDto) {
    try {
      const user = await this.usersService.create(createUserDto);
      const { password: _password, ...userWithoutPassword } = user;
      return {
        success: true,
        user: userWithoutPassword,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getUserByEmail(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (user) {
      const { password: _password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  async getUserById(id: string) {
    const user = await this.usersService.findById(id);
    if (user) {
      const { password: _password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  async login(loginDto: ILoginDto) {
    try {
      const user = await this.usersService.findByEmail(loginDto.email);

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      const payload = {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: '15m',
      });

      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: '7d',
      });

      const { password: _password, ...userWithoutPassword } = user;

      return {
        success: true,
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async refreshTokens(refreshTokenDto: IRefreshTokenDto) {
    try {
      const decoded = this.jwtService.verify(refreshTokenDto.refreshToken);

      if (
        typeof decoded !== 'object' ||
        decoded === null ||
        !('sub' in decoded)
      ) {
        return {
          success: false,
          error: 'Invalid refresh token',
        };
      }

      const userId = String(decoded.sub);
      const user = await this.usersService.findById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const payload = {
        sub: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: '15m',
      });

      const newRefreshToken = this.jwtService.sign(payload, {
        expiresIn: '7d',
      });

      const { password: _password, ...userWithoutPassword } = user;

      return {
        success: true,
        user: userWithoutPassword,
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (_error) {
      return {
        success: false,
        error: 'Invalid or expired refresh token',
      };
    }
  }
}
