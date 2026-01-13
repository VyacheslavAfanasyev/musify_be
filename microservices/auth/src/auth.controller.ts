import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AuthService } from "./auth.service";
import type {
  ICreateUserDto,
  ILoginDto,
  IRefreshTokenDto,
  IChangePasswordDto,
} from "@app/shared";

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: "getHello" })
  getHello(): string {
    return this.authService.getHello();
  }

  @MessagePattern({ cmd: "register" })
  register(@Payload() createUserDto: ICreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @MessagePattern({ cmd: "login" })
  login(@Payload() loginDto: ILoginDto) {
    return this.authService.login(loginDto);
  }

  @MessagePattern({ cmd: "refresh" })
  refresh(@Payload() refreshTokenDto: IRefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @MessagePattern({ cmd: "changePassword" })
  changePassword(@Payload() changePasswordDto: IChangePasswordDto) {
    return this.authService.changePassword(changePasswordDto);
  }

  @MessagePattern({ cmd: "getUserById" })
  getUserById(@Payload() payload: { id: string }) {
    return this.authService.getUserById(payload.id);
  }
}
