import { Module } from "@nestjs/common"

import { PrismaModule } from "./prisma/prisma.module"
import { AuthModule } from "./modules/auth/auth.module"
import { JwtAuthGuard } from "./modules/auth/jwt-auth.guard"
import { APP_GUARD } from "@nestjs/core"
import { UsersModule } from "./modules/users/users.module"
import { AttendanceModule } from "./modules/attendance/attendance.module"
import { ImplantModule } from "./modules/implant/implant.module"

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    AttendanceModule,
    ImplantModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
