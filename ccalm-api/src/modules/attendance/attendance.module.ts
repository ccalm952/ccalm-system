import { Module } from "@nestjs/common"

import { AttendanceController } from "./attendance.controller"
import { AttendanceMakeupService } from "./attendance-makeup.service"
import { AttendanceScheduleService } from "./attendance-schedule.service"
import { AttendanceService } from "./attendance.service"
import { ChinaHolidaysService } from "./china-holidays.service"

@Module({
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceMakeupService,
    AttendanceScheduleService,
    ChinaHolidaysService,
  ],
})
export class AttendanceModule {}
