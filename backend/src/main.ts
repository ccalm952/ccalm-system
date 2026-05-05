import { NestFactory } from "@nestjs/core"
import dotenv from "dotenv"
import { ValidationPipe } from "@nestjs/common"
import path from "node:path"

import { AppModule } from "./app.module"

async function bootstrap() {
  // Prefer backend/.env regardless of where the process is started from.
  dotenv.config({ path: path.resolve(__dirname, "..", ".env") })
  dotenv.config()
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix("api")
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
