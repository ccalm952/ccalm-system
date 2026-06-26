import { NestFactory } from "@nestjs/core"
import type { NestExpressApplication } from "@nestjs/platform-express"
import dotenv from "dotenv"
import { ValidationPipe } from "@nestjs/common"
import path from "node:path"

import { AppModule } from "./app.module"

/** 编译产物在 dist/src，项目根目录为上两级 */
const API_ROOT = path.resolve(__dirname, "..", "..")

async function bootstrap() {
  dotenv.config({ path: path.join(API_ROOT, ".env") })
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.setGlobalPrefix("api")
  app.useStaticAssets(path.join(API_ROOT, "uploads"), {
    prefix: "/api/uploads/",
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  )

  app.enableCors({
    origin: [/^http:\/\/localhost:\d+$/],
    credentials: true,
  })

  await app.listen(process.env.PORT ?? 3000)
}
void bootstrap()
