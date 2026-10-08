import { describe, expect, it } from "vitest";

import {
  assertTestDatabaseUrl,
  databaseNameFromUrl,
} from "../../../prisma/test-database.mjs";

const testUrl =
  "postgresql://ccalm:ccalm_test@127.0.0.1:5433/ccalm_test?schema=public";

describe("测试库地址", () => {
  it("只接受数据库名 ccalm_test", () => {
    expect(databaseNameFromUrl(testUrl)).toBe("ccalm_test");
    expect(assertTestDatabaseUrl(testUrl)).toBe("ccalm_test");
    expect(
      assertTestDatabaseUrl("postgres://ccalm:secret@db.internal/ccalm_test"),
    ).toBe("ccalm_test");
  });

  it("拒绝生产库和其他库名", () => {
    expect(() =>
      assertTestDatabaseUrl(
        "postgresql://ccalm:secret@127.0.0.1:5432/ccalm_system?schema=public",
      ),
    ).toThrow(/ccalm_system/);
    expect(() =>
      assertTestDatabaseUrl(
        "postgresql://ccalm:secret@127.0.0.1:5432/ccalm_test_backup",
      ),
    ).toThrow(/ccalm_test_backup/);
    expect(() => assertTestDatabaseUrl("")).toThrow(/无法解析/);
    expect(() =>
      assertTestDatabaseUrl("mysql://ccalm:secret@127.0.0.1:3306/ccalm_test"),
    ).toThrow(/PostgreSQL/);
    expect(() =>
      assertTestDatabaseUrl("postgresql://ccalm:secret@127.0.0.1:5432/"),
    ).toThrow(/缺少数据库名/);
  });
});
