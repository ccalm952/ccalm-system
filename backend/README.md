# 后端（NestJS + Prisma + PostgreSQL）

## 环境变量

复制 `.env.example` 为 `.env`，填写 `DATABASE_URL`、`JWT_SECRET`、`PORT`（可选）。

## 常用命令

```bash
pnpm install
pnpm exec prisma generate
pnpm exec prisma migrate dev   # 开发
pnpm exec prisma migrate deploy # 生产
pnpm run start:dev
pnpm run build && pnpm run start:prod
```

业务路由均挂在全局前缀 `/api` 下（见 `src/main.ts`）。
