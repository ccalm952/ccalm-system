import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { assertTestDatabaseUrl } from "./test-database.mjs";

const TEST_USERNAME = "test";
const TEST_PASSWORD = "123456";
const TEST_DISPLAY_NAME = "测试";

const databaseUrl = process.env.DATABASE_URL ?? "";
assertTestDatabaseUrl(databaseUrl);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
await prisma.user.upsert({
  where: { username: TEST_USERNAME },
  update: {
    passwordHash,
    displayName: TEST_DISPLAY_NAME,
    role: "user",
  },
  create: {
    username: TEST_USERNAME,
    passwordHash,
    displayName: TEST_DISPLAY_NAME,
    role: "user",
  },
});
await prisma.$disconnect();
console.log(`已写入测试库账号 ${TEST_USERNAME}`);
