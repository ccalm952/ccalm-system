import { Module } from "@nestjs/common"

import { ImplantController } from "./implant.controller"
import { ImplantService } from "./implant.service"

@Module({
  controllers: [ImplantController],
  providers: [ImplantService],
})
export class ImplantModule {}
