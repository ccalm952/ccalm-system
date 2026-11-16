import { ForbiddenException } from "@nestjs/common";
import type { Request } from "express";
import { describe, expect, it } from "vitest";

import { actor, userId } from "./request-auth";

function requestWith(user: unknown): Request {
  return { user } as unknown as Request;
}

describe("actor", () => {
  it("返回登录用户的 id", () => {
    const req = requestWith({ sub: "u1", username: "张三" });
    expect(actor(req)).toEqual({ userId: "u1" });
    expect(userId(req)).toBe("u1");
  });

  it("缺少 req.user 时抛 403", () => {
    expect(() => actor(requestWith(undefined))).toThrow(ForbiddenException);
    expect(() => actor(requestWith(null))).toThrow("无权限");
  });

  it("缺少 sub 时抛 403", () => {
    expect(() => actor(requestWith({ username: "张三" }))).toThrow(
      ForbiddenException,
    );
    expect(() => actor(requestWith({ sub: "" }))).toThrow(ForbiddenException);
  });
});
