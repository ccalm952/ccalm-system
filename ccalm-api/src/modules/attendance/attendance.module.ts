import { Module } from "@nestjs/common"

import { AttendanceController } from "./attendance.controller"
import { AttendanceMakeupService } from "./attendance-makeup.service"
import { AttendancePunchDeviceUnbindService } from "./attendance-punch-device-unbind.service"
import { AttendanceScheduleService } from "./attendance-schedule.service"
import { AttendanceService } from "./attendance.service"
import { ChinaHolidaysService } from "./china-holidays.service"
import { MakeupEventsService } from "./makeup-events.service"

@Module({
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceMakeupService,
    AttendancePunchDeviceUnbindService,
    AttendanceScheduleService,
    ChinaHolidaysService,
    MakeupEventsService,
  ],
})
export class AttendanceModule {}
