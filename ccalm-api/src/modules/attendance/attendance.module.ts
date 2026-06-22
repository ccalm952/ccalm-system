import { Module } from "@nestjs/common"

import { AttendanceController } from "./attendance.controller"
import { AttendanceMakeupService } from "./attendance-makeup.service"
import { AttendanceService } from "./attendance.service"

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceMakeupService],
})
export class AttendanceModule {}
