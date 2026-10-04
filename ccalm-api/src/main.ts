import "./modules/attendance/core/attendance-dayjs";

import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import dotenv from "dotenv";
import { ValidationPipe } from "@nestjs/common";
import path from "node:path";

import { API_ROOT } from "./common/api-root";
import { AppModule } from "./app.module";

async function bootstrap() {
  process.env.TZ = "Asia/Shanghai";
  dotenv.config({ path: path.join(API_ROOT, ".env") });
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix("api");
  app.useStaticAssets(path.join(API_ROOT, "uploads"), {
    prefix: "/api/uploads/",
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : [/^http:\/\/localhost:\d+$/],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
