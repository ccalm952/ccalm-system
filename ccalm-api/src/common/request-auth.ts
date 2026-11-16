import { ForbiddenException } from "@nestjs/common";
import type { Request } from "express";

export type RequestActor = { userId: string };

export function actor(req: Request): RequestActor {
  const u = req.user;
  if (!u?.sub) throw new ForbiddenException("无权限");
  return { userId: u.sub };
}

export function userId(req: Request): string {
  return actor(req).userId;
}
