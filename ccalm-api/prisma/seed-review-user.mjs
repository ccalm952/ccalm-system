import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/** 与 wechat-review-account.ts 保持一致 */
const REVIEW_USERNAME = "test";
const REVIEW_PASSWORD = "123456";
const REVIEW_DISPLAY_NAME = "测试";

const databaseUrl = process.env.DATABASE_URL ?? "";
if (!databaseUrl) {
  throw new Error("缺少 DATABASE_URL");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const passwordHash = await bcrypt.hash(REVIEW_PASSWORD, 10);
await prisma.user.upsert({
  where: { username: REVIEW_USERNAME },
  update: {
    passwordHash,
    displayName: REVIEW_DISPLAY_NAME,
    role: "user",
    wechatOpenId: null,
  },
  create: {
    username: REVIEW_USERNAME,
    passwordHash,
    displayName: REVIEW_DISPLAY_NAME,
    role: "user",
    wechatOpenId: null,
  },
});
await prisma.$disconnect();
console.log(
  `已写入审核账号 ${REVIEW_USERNAME}（密码 ${REVIEW_PASSWORD}，未绑定微信）`,
);
