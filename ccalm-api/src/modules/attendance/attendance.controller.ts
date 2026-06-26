import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from "@nestjs/common"
import type { Request } from "express"

import {
  isAdmin,
  requireAdmin,
  userId as authUserId,
} from "../../common/request-auth"

import { UpsertGeofenceDto } from "./dto/geofence.dto"
import {
  CreateMakeupRequestDto,
  AdminMakeupDto,
} from "./dto/makeup-request.dto"
import { ClearRestDto, DeclareRestDto } from "./dto/rest.dto"
import { PunchDto } from "./dto/punch.dto"
import { UpsertShiftDto } from "./dto/shift.dto"
import type { UpsertScheduleMonthConfigDto } from "./dto/schedule.dto"
import { AttendanceMakeupService } from "./attendance-makeup.service"
import { AttendanceScheduleService } from "./attendance-schedule.service"
import { AttendanceService } from "./attendance.service"
import { ChinaHolidaysService } from "./china-holidays.service"

@Controller("attendance")
export class AttendanceController {
  constructor(
    private readonly attendance: AttendanceService,
    private readonly makeup: AttendanceMakeupService,
    private readonly schedule: AttendanceScheduleService,
    private readonly holidays: ChinaHolidaysService
  ) {}

  @Get("geofence")
  async getGeofence() {
    return await this.attendance.getGeofence()
  }

  @Put("geofence")
  async putGeofence(@Req() req: Request, @Body() dto: UpsertGeofenceDto) {
    requireAdmin(req, "仅管理员可修改全站考勤范围与班次")
    return await this.attendance.upsertGeofence(dto)
  }

  @Get("shift")
  async getShift() {
    return await this.attendance.getShift()
  }

  @Put("shift")
  async putShift(@Req() req: Request, @Body() dto: UpsertShiftDto) {
    requireAdmin(req, "仅管理员可修改全站考勤范围与班次")
    return await this.attendance.upsertShift(dto)
  }

  @Post("punch")
  async punch(@Req() req: Request, @Body() dto: PunchDto) {
    return await this.attendance.punch(authUserId(req), dto)
  }

  @Get("today")
  async today(@Req() req: Request) {
    return await this.attendance.today(authUserId(req))
  }

  @Get("records")
  async records(
    @Req() req: Request,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string
  ) {
    return await this.attendance.records(authUserId(req), startDate, endDate)
  }

  @Get("summary/monthly-all")
  async monthlyAll(@Req() req: Request, @Query("month") month: string) {
    requireAdmin(req, "仅管理员可查看全员考勤统计")
    return await this.attendance.monthlySummariesForAll(month)
  }

  @Get("summary/monthly")
  async monthly(
    @Req() req: Request,
    @Query("month") month: string,
    @Query("userId") userId?: string
  ) {
    const targetUserId = userId ? String(userId) : authUserId(req)
    if (userId && !isAdmin(req)) {
      throw new ForbiddenException("仅管理员可查看他人考勤统计")
    }
    return await this.attendance.monthlySummary(targetUserId, month)
  }

  @Post("makeup-requests")
  async createMakeupRequest(
    @Req() req: Request,
    @Body() dto: CreateMakeupRequestDto
  ) {
    return await this.makeup.createRequest(authUserId(req), dto)
  }

  @Post("makeup")
  async directMakeup(@Req() req: Request, @Body() dto: AdminMakeupDto) {
    requireAdmin(req, "仅管理员可修改全站考勤范围与班次")
    return await this.makeup.directMakeup(dto)
  }

  @Post("rest")
  async declareRest(@Req() req: Request, @Body() dto: DeclareRestDto) {
    const targetUserId = dto.userId ? String(dto.userId) : authUserId(req)
    if (dto.userId && targetUserId !== authUserId(req) && !isAdmin(req)) {
      throw new ForbiddenException("仅管理员可为他人登记休息")
    }
    return await this.schedule.declareRest(targetUserId, dto.date, dto.half)
  }

  @Post("rest/clear")
  async clearRest(@Req() req: Request, @Body() dto: ClearRestDto) {
    const targetUserId = dto.userId ? String(dto.userId) : authUserId(req)
    if (dto.userId && targetUserId !== authUserId(req) && !isAdmin(req)) {
      throw new ForbiddenException("仅管理员可为他人取消休息")
    }
    return await this.schedule.clearRestHalf(targetUserId, dto.date, dto.half)
  }

  @Get("makeup-requests/mine")
  async listMyMakeupRequests(@Req() req: Request) {
    return await this.makeup.listMine(authUserId(req))
  }

  @Get("makeup-requests/pending-count")
  async makeupPendingCount(@Req() req: Request) {
    requireAdmin(req, "仅管理员可修改全站考勤范围与班次")
    const count = await this.makeup.pendingCount()
    return { count }
  }

  @Get("makeup-requests")
  async listMakeupRequests(
    @Req() req: Request,
    @Query("status") status?: string
  ) {
    requireAdmin(req, "仅管理员可修改全站考勤范围与班次")
    return await this.makeup.listForAdmin(status)
  }

  @Post("makeup-requests/:id/approve")
  async approveMakeupRequest(@Req() req: Request, @Param("id") id: string) {
    requireAdmin(req, "仅管理员可修改全站考勤范围与班次")
    return await this.makeup.approve(id, authUserId(req))
  }

  @Post("makeup-requests/:id/reject")
  async rejectMakeupRequest(@Req() req: Request, @Param("id") id: string) {
    requireAdmin(req, "仅管理员可修改全站考勤范围与班次")
    return await this.makeup.reject(id, authUserId(req))
  }

  @Get("schedule")
  async getSchedule(@Query("month") month: string) {
    return await this.schedule.getMonth(month)
  }

  @Get("holidays")
  async getHolidays(@Query("year") year?: string) {
    const y = year ? Number(year) : new Date().getFullYear()
    return await this.holidays.getYear(y)
  }

  @Put("schedule/month-config")
  async putScheduleMonthConfig(
    @Req() req: Request,
    @Body() dto: UpsertScheduleMonthConfigDto
  ) {
    requireAdmin(req, "仅管理员可修改全站考勤范围与班次")
    return await this.schedule.upsertMonthConfig(dto)
  }
}
