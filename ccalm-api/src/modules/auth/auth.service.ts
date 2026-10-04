import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcrypt";
import { createHash } from "node:crypto";

import { PrismaService } from "../../prisma/prisma.service";
import { WechatService } from "./wechat.service";

const WECHAT_BIND_PURPOSE = "wechat_bind" as const;

type SafeUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly wechat: WechatService,
  ) {}

  private hashDeviceToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async signUser(user: {
    id: string;
    username: string;
    role: "user" | "admin";
  }): Promise<string> {
    return await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
  }

  private async signBindTicket(openid: string): Promise<string> {
    return await this.jwt.signAsync(
      { purpose: WECHAT_BIND_PURPOSE, openid },
      { expiresIn: "10m" },
    );
  }

  private async verifyBindTicket(bindTicket: string): Promise<string> {
    let payload: { purpose?: string; openid?: string };
    try {
      payload = await this.jwt.verifyAsync(bindTicket);
    } catch {
      throw new UnauthorizedException("绑定凭证无效或已过期，请重新微信登录");
    }
    if (
      payload.purpose !== WECHAT_BIND_PURPOSE ||
      typeof payload.openid !== "string" ||
      !payload.openid.trim()
    ) {
      throw new UnauthorizedException("绑定凭证无效或已过期，请重新微信登录");
    }
    return payload.openid.trim();
  }

  private toSafeUser(user: SafeUser) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async login(username: string, password: string): Promise<string> {
    let user;
    try {
      user = await this.prisma.user.findUnique({ where: { username } });
    } catch {
      throw new ServiceUnavailableException("服务暂不可用，请检查数据库连接");
    }
    if (!user) throw new UnauthorizedException("用户名或密码错误");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("用户名或密码错误");
    return await this.signUser(user);
  }

  async getUserSafe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new UnauthorizedException("未登录或登录已失效");
    return user;
  }

  async wechatLogin(code: string) {
    const { openid } = await this.wechat.code2Session(code);
    const user = await this.prisma.user.findUnique({
      where: { wechatOpenId: openid },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      const bindTicket = await this.signBindTicket(openid);
      return { status: "need_bind" as const, bindTicket };
    }
    const accessToken = await this.signUser(user);
    return {
      status: "bound" as const,
      accessToken,
      deviceToken: openid,
      user: this.toSafeUser(user),
    };
  }

  async wechatBind(bindTicket: string, username: string, password: string) {
    const openid = await this.verifyBindTicket(bindTicket);

    const taken = await this.prisma.user.findUnique({
      where: { wechatOpenId: openid },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictException("该微信已绑定其他账号");
    }

    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { punchDevice: true },
    });
    if (!user) throw new UnauthorizedException("用户名或密码错误");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("用户名或密码错误");

    if (user.wechatOpenId && user.wechatOpenId !== openid) {
      throw new ConflictException("该账号已绑定其他微信，请联系管理员解绑");
    }

    const tokenHash = this.hashDeviceToken(openid);
    if (user.punchDevice && user.punchDevice.tokenHash !== tokenHash) {
      throw new BadRequestException(
        "该账号已绑定其他打卡设备，请联系管理员解绑后再绑定微信",
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.user.update({
        where: { id: user.id },
        data: { wechatOpenId: openid },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!user.punchDevice) {
        await tx.attendancePunchDevice.create({
          data: { userId: user.id, tokenHash },
        });
      }
      return row;
    });

    const accessToken = await this.signUser(updated);
    return {
      status: "bound" as const,
      accessToken,
      deviceToken: openid,
      user: this.toSafeUser(updated),
    };
  }
}
