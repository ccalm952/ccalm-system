import { Module } from "@nestjs/common"

import { PrismaModule } from "../../prisma/prisma.module"
import { MemosController } from "./memos.controller"
import { MemosService } from "./memos.service"

@Module({
  imports: [PrismaModule],
  controllers: [MemosController],
  providers: [MemosService],
})
export class MemosModule {}
