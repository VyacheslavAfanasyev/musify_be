import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { ICreateUserDto, IBaseResponse, getErrorMessage } from "@app/shared";
import { User } from "@app/shared";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(
    createUserDto: ICreateUserDto,
  ): Promise<
    { success: true; user: User } | { success: false; error: string }
  > {
    try {
      const existingUser = await this.usersRepository.findOne({
        where: [{ email: createUserDto.email }],
      });

      if (existingUser) {
        if (existingUser.email === createUserDto.email) {
          return {
            success: false,
            error: "Пользователь с таким email уже существует",
          };
        }
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(
        createUserDto.password,
        saltRounds,
      );

      const user = this.usersRepository.create({
        email: createUserDto.email,
        username: createUserDto.username,
        password: hashedPassword,
        role: createUserDto.role || "listener",
      });

      const savedUser = await this.usersRepository.save(user);
      return {
        success: true,
        user: savedUser,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to create user"),
      };
    }
  }

  async findByEmail(
    email: string,
  ): Promise<
    { success: true; user: User } | { success: false; error: string }
  > {
    try {
      const user = await this.usersRepository.findOne({ where: { email } });
      if (user) {
        return {
          success: true,
          user,
        };
      }
      return {
        success: false,
        error: "User not found",
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to find user by email"),
      };
    }
  }

  async findById(
    id: string,
  ): Promise<
    { success: true; user: User } | { success: false; error: string }
  > {
    try {
      const user = await this.usersRepository.findOne({ where: { id } });
      if (user) {
        return {
          success: true,
          user,
        };
      }
      return {
        success: false,
        error: "User not found",
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to find user by id"),
      };
    }
  }

  async findAll(): Promise<
    { success: true; users: User[] } | { success: false; error: string }
  > {
    try {
      const users = await this.usersRepository.find();
      return {
        success: true,
        users,
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get all users"),
      };
    }
  }

  async updatePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<IBaseResponse> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

      if (!isPasswordValid) {
        return {
          success: false,
          error: "Invalid old password",
        };
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      user.password = hashedPassword;
      await this.usersRepository.save(user);

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
