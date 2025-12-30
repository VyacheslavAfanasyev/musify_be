import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { UsersService } from "./users.service";
import type { ICreateUserDto } from "@app/shared";

@Controller()
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern({ cmd: "getHello" })
  getHello(): string {
    return "Hello World from USER-SERVICE!";
  }

  @MessagePattern({ cmd: "createUser" })
  async createUser(@Payload() createUserDto: ICreateUserDto) {
    try {
      const user = await this.usersService.create(createUserDto);
      return {
        success: true,
        user,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  @MessagePattern({ cmd: "getUserByEmail" })
  async getUserByEmail(@Payload() payload: { email: string }) {
    try {
      const user = await this.usersService.findByEmail(payload.email);
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
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  @MessagePattern({ cmd: "getUserById" })
  async getUserById(@Payload() payload: { id: string }) {
    try {
      const user = await this.usersService.findById(payload.id);
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
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  @MessagePattern({ cmd: "getAllUsers" })
  async getAllUsers() {
    try {
      const users = await this.usersService.findAll();
      return {
        success: true,
        users,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  @MessagePattern({ cmd: "updatePassword" })
  async updatePassword(
    @Payload()
    payload: {
      userId: string;
      oldPassword: string;
      newPassword: string;
    },
  ) {
    try {
      const result = await this.usersService.updatePassword(
        payload.userId,
        payload.oldPassword,
        payload.newPassword,
      );
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
