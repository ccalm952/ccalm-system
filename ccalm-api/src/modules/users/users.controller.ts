import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { randomUUID } from "node:crypto"
import { mkdirSync } from "node:fs"
import path from "node:path"
import { diskStorage } from "multer"
import type { Request } from "express"

import { actor } from "../../common/request-auth"

import { CreateUserDto } from "./dto/create-user.dto"
import { UpdateUserDto } from "./dto/update-user.dto"
import { UsersService } from "./users.service"

const avatarUploadDir = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "uploads",
  "avatars"
)
const avatarMimeExtensions = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
])

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async list(@Req() req: Request) {
    const a = actor(req)
    if (a.role !== "admin") throw new ForbiddenException("仅管理员可管理人员")
    return await this.users.listAll()
  }

  @Get("switchable")
  async switchable() {
    return await this.users.listSwitchableUsers()
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateUserDto) {
    const a = actor(req)
    if (a.role !== "admin") throw new ForbiddenException("仅管理员可创建用户")
    return await this.users.createByAdmin(dto)
  }

  @Post("me/avatar")
  @UseInterceptors(
    FileInterceptor("avatar", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(avatarUploadDir, { recursive: true })
          cb(null, avatarUploadDir)
        },
        filename: (_req, file, cb) => {
          const ext = avatarMimeExtensions.get(file.mimetype) ?? ".bin"
          cb(null, `${randomUUID()}${ext}`)
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!avatarMimeExtensions.has(file.mimetype)) {
          cb(new BadRequestException("仅支持 jpg、png、webp 头像"), false)
          return
        }
        cb(null, true)
      },
      limits: { fileSize: 2 * 1024 * 1024 },
    })
  )
  async uploadMyAvatar(
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File
  ) {
    const a = actor(req)
    if (!file) throw new BadRequestException("请选择头像图片")
    return await this.users.updateAvatar(
      a.userId,
      `/api/uploads/avatars/${file.filename}`
    )
  }

  @Patch(":id")
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: UpdateUserDto
  ) {
    const a = actor(req)
    return await this.users.update({
      actor: a,
      targetUserId: id,
      displayName: dto.displayName,
      password: dto.password,
      role: dto.role,
      leaveInitialBalance: dto.leaveInitialBalance,
    })
  }

  @Delete(":id")
  async remove(@Req() req: Request, @Param("id") id: string) {
    const a = actor(req)
    if (a.role !== "admin") throw new ForbiddenException("仅管理员可删除用户")
    return await this.users.deleteByAdmin({
      actorUserId: a.userId,
      targetUserId: id,
    })
  }
}
