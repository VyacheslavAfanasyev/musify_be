import { Controller, Logger } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AuthService } from "./auth.service";
import type {
  ICreateUserDto,
  ILoginDto,
  IRefreshTokenDto,
  IChangePasswordDto,
  ILogoutDto,
} from "@app/shared";

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: "getHello" })
  getHello(): string {
    return this.authService.getHello();
  }

  @MessagePattern({ cmd: "register" })
  register(@Payload() createUserDto: ICreateUserDto) {
    this.logger.log(
      `Received register request: ${JSON.stringify(createUserDto)}`,
    );
    return this.authService.register(createUserDto);
  }

  @MessagePattern({ cmd: "login" })
  login(@Payload() loginDto: ILoginDto) {
    this.logger.log(`Received login request: ${JSON.stringify(loginDto)}`);
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

  @MessagePattern({ cmd: "logout" })
  logout(@Payload() logoutDto: ILogoutDto) {
    return this.authService.logout(logoutDto);
  }
}
