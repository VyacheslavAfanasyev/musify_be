import { Controller } from "@nestjs/common";
import { MessagePattern, EventPattern, Payload } from "@nestjs/microservices";
import { UsersService } from "./users.service";
import type { ICreateUserProfileDto, IUpdateUserProfileDto } from "@app/shared";

@Controller()
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern({ cmd: "getHello" })
  getHello(): string {
    return "Hello World from USER-SERVICE!";
  }

  /**
   * Обработка события отката создания пользователя
   */
  @EventPattern("user.create.failed")
  async handleUserCreateFailed(@Payload() data: { userId: string }) {
    await this.usersService.deleteProfile(data.userId);
  }

  @MessagePattern({ cmd: "getProfileByUserId" })
  async getProfileByUserId(@Payload() payload: { userId: string }) {
    try {
      return await this.usersService.getProfileByUserId(payload.userId);
    } catch (error) {
      console.error("Error in getProfileByUserId:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  @MessagePattern({ cmd: "getProfileByUsername" })
  async getProfileByUsername(@Payload() payload: { username: string }) {
    return await this.usersService.getProfileByUsername(payload.username);
  }

  /**
   * Синхронное создание профиля (для использования в Saga Pattern)
   */
  @MessagePattern({ cmd: "createProfile" })
  createProfile(@Payload() data: ICreateUserProfileDto) {
    return this.usersService.createProfile(data);
  }

  @MessagePattern({ cmd: "updateProfile" })
  async updateProfile(
    @Payload()
    payload: {
      userId: string;
      updateDto: IUpdateUserProfileDto;
    },
  ) {
    return await this.usersService.updateProfile(
      payload.userId,
      payload.updateDto,
    );
  }

  @MessagePattern({ cmd: "deleteProfile" })
  deleteProfile(@Payload() payload: { userId: string }) {
    return this.usersService.deleteProfile(payload.userId);
  }

  @MessagePattern({ cmd: "getAllProfiles" })
  async getAllProfiles() {
    return await this.usersService.findAll();
  }

  @MessagePattern({ cmd: "getUserByEmail" })
  getUserByEmail() {
    return {
      success: false,
      error: "User data is now in Auth Service",
    };
  }

  @MessagePattern({ cmd: "getUserById" })
  async getUserById(@Payload() payload: { id: string }) {
    return await this.usersService.getProfileByUserId(payload.id);
  }

  @MessagePattern({ cmd: "getAllUsers" })
  async getAllUsers() {
    return await this.usersService.findAll();
  }

  @MessagePattern({ cmd: "updatePassword" })
  updatePassword() {
    return {
      success: false,
      error: "Password update is now in Auth Service",
    };
  }
}
