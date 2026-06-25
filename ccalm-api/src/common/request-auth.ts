import { ForbiddenException } from "@nestjs/common"
import type { Request } from "express"

export type RequestActor = { userId: string; role: "user" | "admin" }

export function actor(req: Request): RequestActor {
  const u = req.user
  if (!u?.sub || !u.role) throw new ForbiddenException()
  return { userId: u.sub, role: u.role }
}

export function userId(req: Request): string {
  return actor(req).userId
}

export function requireAdmin(
  req: Request,
  message = "仅管理员可执行此操作"
): RequestActor {
  const a = actor(req)
  if (a.role !== "admin") throw new ForbiddenException(message)
  return a
}

export function isAdmin(req: Request): boolean {
  return req.user?.role === "admin"
}
