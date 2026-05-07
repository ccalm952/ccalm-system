import { Module } from "@nestjs/common"

import { PrismaModule } from "../../prisma/prisma.module"
import { ImplantController } from "./implant.controller"
import { ImplantService } from "./implant.service"

@Module({
  imports: [PrismaModule],
  controllers: [ImplantController],
  providers: [ImplantService],
})
export class ImplantModule {}
