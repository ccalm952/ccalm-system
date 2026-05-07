import { Module } from "@nestjs/common"
import { JwtModule } from "@nestjs/jwt"
import { PassportModule } from "@nestjs/passport"

import { PrismaModule } from "../../prisma/prisma.module"
import { AuthController } from "./auth.controller"
import { AuthService } from "./auth.service"
import { JwtAuthGuard } from "./jwt-auth.guard"
import { JwtStrategy } from "./jwt.strategy"

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const secret = process.env.JWT_SECRET
        if (!secret) {
          throw new Error(
            "Missing JWT_SECRET. Please create ccalm-api/.env and set JWT_SECRET=<your-secret>."
          )
        }
        return {
          secret,
          signOptions: { expiresIn: "7d" },
        }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService],
})
export class AuthModule {}
