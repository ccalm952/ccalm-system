import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { isPrismaUniqueViolation } from "./prisma-errors";

function knownError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("数据库错误", {
    code,
    clientVersion: "test",
  });
}

describe("isPrismaUniqueViolation", () => {
  it("识别 P2002 唯一约束冲突", () => {
    expect(isPrismaUniqueViolation(knownError("P2002"))).toBe(true);
  });

  it("其它 Prisma 错误码不算唯一冲突", () => {
    expect(isPrismaUniqueViolation(knownError("P2003"))).toBe(false);
    expect(isPrismaUniqueViolation(knownError("P2025"))).toBe(false);
    expect(isPrismaUniqueViolation(knownError(""))).toBe(false);
  });

  it("普通 Error 与空值不算唯一冲突", () => {
    expect(isPrismaUniqueViolation(new Error("boom"))).toBe(false);
    expect(isPrismaUniqueViolation(null)).toBe(false);
    expect(isPrismaUniqueViolation(undefined)).toBe(false);
    expect(isPrismaUniqueViolation("P2002")).toBe(false);
    expect(isPrismaUniqueViolation({ code: "P2002" })).toBe(false);
  });
});
