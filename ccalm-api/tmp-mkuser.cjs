require("dotenv").config();
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
(async () => {
  const passwordHash = await bcrypt.hash("smoke123456", 10);
  await prisma.user.deleteMany({ where: { username: "smoke_appt" } });
  await prisma.user.create({
    data: {
      username: "smoke_appt",
      passwordHash,
      displayName: "冒烟测试",
      role: "admin",
      sortOrder: 999,
      roles: { connect: [{ id: "builtin-admin" }] },
    },
  });
  console.log("created");
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
