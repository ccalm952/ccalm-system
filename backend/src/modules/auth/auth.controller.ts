import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common"
import type { Request } from "express"

import { Public } from "./public.decorator"
import { AuthService } from "./auth.service"
import { LoginDto } from "./dto/login.dto"
import { JwtAuthGuard } from "./jwt-auth.guard"

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  async login(@Body() dto: LoginDto) {
    const accessToken = await this.auth.login(dto.username, dto.password)
    return { accessToken }
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const user = req.user as { sub: string } | undefined
    if (!user?.sub) throw new UnauthorizedException()
    const me = await this.auth.getUserSafe(user.sub)
    return me
  }
}
