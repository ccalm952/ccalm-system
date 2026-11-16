import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { diskStorage } from "multer";
import type { Request } from "express";

import { API_ROOT } from "../../common/api-root";
import { PermissionsService } from "../../common/permissions/permissions.service";
import { RequirePermissions } from "../../common/permissions/require-permissions.decorator";
import { actor } from "../../common/request-auth";

import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

const avatarUploadDir = path.join(API_ROOT, "uploads", "avatars");
const avatarMimeExtensions = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

@Controller("users")
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly permissions: PermissionsService,
  ) {}

  @Get()
  @RequirePermissions("staff.manage")
  async list() {
    return await this.users.listAll();
  }

  @Post()
  @RequirePermissions("staff.manage")
  async create(@Body() dto: CreateUserDto) {
    return await this.users.createByAdmin({
      username: dto.username,
      password: dto.password,
      displayName: dto.displayName,
      roleIds: dto.roleIds,
    });
  }

  @Post("me/avatar")
  @UseInterceptors(
    FileInterceptor("avatar", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(avatarUploadDir, { recursive: true });
          cb(null, avatarUploadDir);
        },
        filename: (_req, file, cb) => {
          const ext = avatarMimeExtensions.get(file.mimetype) ?? ".bin";
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!avatarMimeExtensions.has(file.mimetype)) {
          cb(new BadRequestException("仅支持 jpg、png、webp 头像"), false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadMyAvatar(
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const a = actor(req);
    if (!file) throw new BadRequestException("请选择头像图片");
    return await this.users.updateAvatar(
      a.userId,
      `/api/uploads/avatars/${file.filename}`,
    );
  }

  @Patch(":id")
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const a = actor(req);
    const canManage = await this.permissions.has(a.userId, "staff.manage");
    return await this.users.update({
      actorUserId: a.userId,
      canManage,
      targetUserId: id,
      displayName: dto.displayName,
      password: dto.password,
      roleIds: dto.roleIds,
      leaveInitialBalance: dto.leaveInitialBalance,
    });
  }

  @Delete(":id")
  @RequirePermissions("staff.manage")
  async remove(@Req() req: Request, @Param("id") id: string) {
    const a = actor(req);
    return await this.users.deleteByAdmin({
      actorUserId: a.userId,
      targetUserId: id,
    });
  }
}
