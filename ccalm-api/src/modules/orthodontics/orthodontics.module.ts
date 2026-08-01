import { Module } from "@nestjs/common"

import { PrismaModule } from "../../prisma/prisma.module"
import { OrthodonticsController } from "./orthodontics.controller"
import { OrthodonticsService } from "./orthodontics.service"

@Module({
  imports: [PrismaModule],
  controllers: [OrthodonticsController],
  providers: [OrthodonticsService],
})
export class OrthodonticsModule {}
