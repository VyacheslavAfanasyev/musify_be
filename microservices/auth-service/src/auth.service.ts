import { Injectable } from '@nestjs/common';
import { UsersService } from './users/users.service';
import { ICreateUserDto } from '@app/shared';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

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
        error: error.message,
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
}
