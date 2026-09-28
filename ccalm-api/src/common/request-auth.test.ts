import { ForbiddenException } from "@nestjs/common"
import type { Request } from "express"
import { describe, expect, it } from "vitest"

import { actor, isAdmin, requireAdmin, userId } from "./request-auth"

function requestWith(user: unknown): Request {
  return { user } as unknown as Request
}

describe("actor", () => {
  it("返回登录用户的 id 与角色", () => {
    const req = requestWith({ sub: "u1", username: "张三", role: "user" })
    expect(actor(req)).toEqual({ userId: "u1", role: "user" })
    expect(userId(req)).toBe("u1")
  })

  it("缺少 req.user 时抛 403", () => {
    expect(() => actor(requestWith(undefined))).toThrow(ForbiddenException)
    expect(() => actor(requestWith(null))).toThrow("无权限")
  })

  it("缺少 sub 或 role 时抛 403", () => {
    expect(() => actor(requestWith({ role: "user" }))).toThrow(
      ForbiddenException
    )
    expect(() => actor(requestWith({ sub: "u1" }))).toThrow(ForbiddenException)
    expect(() => actor(requestWith({ sub: "", role: "user" }))).toThrow(
      ForbiddenException
    )
  })
})

describe("requireAdmin", () => {
  it("管理员通过并返回 actor", () => {
    const req = requestWith({ sub: "a1", username: "管理员", role: "admin" })
    expect(requireAdmin(req)).toEqual({ userId: "a1", role: "admin" })
  })

  it("普通用户使用默认提示语抛 403", () => {
    const req = requestWith({ sub: "u1", username: "张三", role: "user" })
    expect(() => requireAdmin(req)).toThrow("仅管理员可执行此操作")
  })

  it("支持自定义提示语", () => {
    const req = requestWith({ sub: "u1", username: "张三", role: "user" })
    expect(() => requireAdmin(req, "无权导出")).toThrow("无权导出")
  })

  it("未登录时先抛 actor 的无权限错误", () => {
    expect(() => requireAdmin(requestWith(undefined))).toThrow("无权限")
  })
})

describe("isAdmin", () => {
  it("只有 role 为 admin 时为真", () => {
    expect(isAdmin(requestWith({ role: "admin" }))).toBe(true)
    expect(isAdmin(requestWith({ role: "user" }))).toBe(false)
    expect(isAdmin(requestWith(undefined))).toBe(false)
  })
})
