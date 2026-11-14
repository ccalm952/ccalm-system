import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import { PermissionsService } from "./permissions.service";
import { PERMISSIONS_KEY } from "./require-permissions.decorator";

/** 在 JwtAuthGuard 之后执行：按路由声明的权限点校验（权限 = 所有角色并集） */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { sub?: string } | undefined;
    if (!user?.sub) throw new ForbiddenException("无权限");

    const { permissions } = await this.permissions.forUser(user.sub);
    const ok = required.every((p) => permissions.includes(p));
    if (!ok) throw new ForbiddenException("无权限");
    return true;
  }
}
