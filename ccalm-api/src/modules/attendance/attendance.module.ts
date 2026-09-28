import { Module } from "@nestjs/common"

import { AttendanceController } from "./attendance.controller"
import { AttendanceMakeupService } from "./services/attendance-makeup.service"
import { AttendancePunchDeviceUnbindService } from "./services/attendance-punch-device-unbind.service"
import { AttendanceScheduleService } from "./services/attendance-schedule.service"
import { AttendanceService } from "./attendance.service"
import { ChinaHolidaysService } from "./services/china-holidays.service"
import { MakeupEventsService } from "./services/makeup-events.service"

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
