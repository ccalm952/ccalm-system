import { describe, expect, it, vi } from "vitest";

import { AuthService } from "./auth.service";

describe("审核账号微信绑定", () => {
  it("不写入 wechatOpenId，并覆盖打卡设备", async () => {
    const bcrypt = await import("bcrypt");
    const user = {
      id: "u1",
      username: "test",
      passwordHash: await bcrypt.hash("123456", 4),
      wechatOpenId: null,
      punchDevice: { userId: "u1", tokenHash: "old" },
      displayName: "审核测试",
      avatarUrl: "",
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const tx = {
      user: {
        update: vi.fn(({ data }: { data: { wechatOpenId: string | null } }) => {
          expect(data.wechatOpenId).toBeNull();
          return Promise.resolve({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          });
        }),
      },
      attendancePunchDevice: {
        upsert: vi.fn(() => Promise.resolve({})),
        create: vi.fn(() => Promise.resolve({})),
      },
    };

    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(user),
        update: vi.fn(),
      },
      $transaction: vi.fn((fn: (client: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    };

    const jwt = {
      verifyAsync: vi.fn(() =>
        Promise.resolve({
          purpose: "wechat_bind",
          openid: "openid-reviewer",
        }),
      ),
      signAsync: vi.fn(() => Promise.resolve("token")),
    };

    const auth = new AuthService(prisma as never, jwt as never, {} as never);

    const result = await auth.wechatBind("ticket", "test", "123456");

    expect(result.status).toBe("bound");
    expect(result.deviceToken).toBe("openid-reviewer");
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { wechatOpenId: null },
      }),
    );
    expect(tx.attendancePunchDevice.upsert).toHaveBeenCalledTimes(1);
    expect(tx.attendancePunchDevice.create).not.toHaveBeenCalled();
  });

  it("普通账号仍长期绑定 wechatOpenId", async () => {
    const bcrypt = await import("bcrypt");
    const user = {
      id: "u2",
      username: "alice",
      passwordHash: await bcrypt.hash("123456", 4),
      wechatOpenId: null,
      punchDevice: null,
      displayName: "Alice",
      avatarUrl: "",
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const tx = {
      user: {
        update: vi.fn(({ data }: { data: { wechatOpenId: string } }) => {
          expect(data.wechatOpenId).toBe("openid-alice");
          return Promise.resolve({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          });
        }),
      },
      attendancePunchDevice: {
        upsert: vi.fn(() => Promise.resolve({})),
        create: vi.fn(() => Promise.resolve({})),
      },
    };

    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(user),
      },
      $transaction: vi.fn((fn: (client: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    };

    const jwt = {
      verifyAsync: vi.fn(() =>
        Promise.resolve({
          purpose: "wechat_bind",
          openid: "openid-alice",
        }),
      ),
      signAsync: vi.fn(() => Promise.resolve("token")),
    };

    const auth = new AuthService(prisma as never, jwt as never, {} as never);

    await auth.wechatBind("ticket", "alice", "123456");

    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { wechatOpenId: "openid-alice" },
      }),
    );
    expect(tx.attendancePunchDevice.create).toHaveBeenCalledTimes(1);
    expect(tx.attendancePunchDevice.upsert).not.toHaveBeenCalled();
  });
});
