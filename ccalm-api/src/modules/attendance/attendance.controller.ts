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

import { UpsertGeofenceDto } from "./dto/geofence.dto"
import {
  CreateMakeupRequestDto,
  AdminMakeupDto,
  RejectMakeupRequestDto,
} from "./dto/makeup-request.dto"
import { PunchDto } from "./dto/punch.dto"
import { UpsertShiftDto } from "./dto/shift.dto"
import { AttendanceMakeupService } from "./attendance-makeup.service"
import { AttendanceService } from "./attendance.service"

@Controller("attendance")
export class AttendanceController {
  constructor(
    private readonly attendance: AttendanceService,
    private readonly makeup: AttendanceMakeupService
  ) {}

  private userId(req: Request): string {
    const u = req.user
    return String(u?.sub || "")
  }

  private requireAdmin(req: Request) {
    const u = req.user
    if (u?.role !== "admin") {
      throw new ForbiddenException("仅管理员可修改全站考勤范围与班次")
    }
  }

  private isAdmin(req: Request): boolean {
    const u = req.user
    return u?.role === "admin"
  }

  @Get("geofence")
  async getGeofence() {
    return await this.attendance.getGeofence()
  }

  @Put("geofence")
  async putGeofence(@Req() req: Request, @Body() dto: UpsertGeofenceDto) {
    this.requireAdmin(req)
    return await this.attendance.upsertGeofence(dto)
  }

  @Get("shift")
  async getShift() {
    return await this.attendance.getShift()
  }

  @Put("shift")
  async putShift(@Req() req: Request, @Body() dto: UpsertShiftDto) {
    this.requireAdmin(req)
    return await this.attendance.upsertShift(dto)
  }

  @Post("punch")
  async punch(@Req() req: Request, @Body() dto: PunchDto) {
    return await this.attendance.punch(this.userId(req), dto)
  }

  @Get("today")
  async today(@Req() req: Request) {
    return await this.attendance.today(this.userId(req))
  }

  @Get("records")
  async records(
    @Req() req: Request,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string
  ) {
    return await this.attendance.records(this.userId(req), startDate, endDate)
  }

  @Get("summary/monthly")
  async monthly(
    @Req() req: Request,
    @Query("month") month: string,
    @Query("userId") userId?: string
  ) {
    const targetUserId = userId ? String(userId) : this.userId(req)
    if (userId && !this.isAdmin(req)) {
      throw new ForbiddenException("仅管理员可查看他人考勤统计")
    }
    return await this.attendance.monthlySummary(targetUserId, month)
  }

  @Post("makeup-requests")
  async createMakeupRequest(
    @Req() req: Request,
    @Body() dto: CreateMakeupRequestDto
  ) {
    return await this.makeup.createRequest(this.userId(req), dto)
  }

  @Post("makeup")
  async directMakeup(@Req() req: Request, @Body() dto: AdminMakeupDto) {
    this.requireAdmin(req)
    return await this.makeup.directMakeup(dto)
  }

  @Get("makeup-requests/mine")
  async listMyMakeupRequests(@Req() req: Request) {
    return await this.makeup.listMine(this.userId(req))
  }

  @Get("makeup-requests/pending-count")
  async makeupPendingCount(@Req() req: Request) {
    this.requireAdmin(req)
    const count = await this.makeup.pendingCount()
    return { count }
  }

  @Get("makeup-requests")
  async listMakeupRequests(
    @Req() req: Request,
    @Query("status") status?: string
  ) {
    this.requireAdmin(req)
    return await this.makeup.listForAdmin(status)
  }

  @Post("makeup-requests/:id/approve")
  async approveMakeupRequest(
    @Req() req: Request,
    @Param("id") id: string
  ) {
    this.requireAdmin(req)
    return await this.makeup.approve(id, this.userId(req))
  }

  @Post("makeup-requests/:id/reject")
  async rejectMakeupRequest(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: RejectMakeupRequestDto
  ) {
    this.requireAdmin(req)
    return await this.makeup.reject(id, this.userId(req), dto.rejectReason)
  }
}
