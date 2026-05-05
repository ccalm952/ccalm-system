import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common"
import type { Request } from "express"

import { CreateUserDto } from "./dto/create-user.dto"
import { UpdateUserDto } from "./dto/update-user.dto"
import { UsersService } from "./users.service"

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  private actor(req: Request): { userId: string; role: "user" | "admin" } {
    const u = req.user
    if (!u?.sub || !u.role) throw new ForbiddenException()
    return { userId: u.sub, role: u.role }
  }

  @Get()
  async list(@Req() req: Request) {
    const a = this.actor(req)
    if (a.role !== "admin") throw new ForbiddenException("仅管理员可管理人员")
    return await this.users.listAll()
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateUserDto) {
    const a = this.actor(req)
    if (a.role !== "admin") throw new ForbiddenException("仅管理员可创建用户")
    return await this.users.createByAdmin(dto)
  }

  @Patch(":id")
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: UpdateUserDto
  ) {
    const a = this.actor(req)
    return await this.users.update({
      actor: a,
      targetUserId: id,
      displayName: dto.displayName,
      password: dto.password,
      role: dto.role,
    })
  }

  @Delete(":id")
  async remove(@Req() req: Request, @Param("id") id: string) {
    const a = this.actor(req)
    if (a.role !== "admin") throw new ForbiddenException("仅管理员可删除用户")
    return await this.users.deleteByAdmin(id)
  }
}
