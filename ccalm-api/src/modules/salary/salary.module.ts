import { Module } from "@nestjs/common"

import { SalaryController } from "./salary.controller"
import { SalaryService } from "./salary.service"
import { SalaryUnlockService } from "./salary-unlock.service"

@Module({
  controllers: [SalaryController],
  providers: [SalaryService, SalaryUnlockService],
})
export class SalaryModule {}
