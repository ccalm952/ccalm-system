import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  MessageEvent,
  Param,
  Post,
  Put,
  Query,
  Req,
  Sse,
} from "@nestjs/common";
import type { Request } from "express";
import { from, switchMap, type Observable } from "rxjs";

import { PermissionsService } from "../../common/permissions/permissions.service";
import { actor, userId as authUserId } from "../../common/request-auth";

import { UpsertGeofenceDto } from "./dto/geofence.dto";
import {
  CreateMakeupRequestDto,
  AdminMakeupDto,
} from "./dto/makeup-request.dto";
import { ClearRestDto, DeclareRestDto } from "./dto/rest.dto";
import { PunchDto } from "./dto/punch.dto";
import { UnbindPunchDeviceDto } from "./dto/punch-device.dto";
import { UpsertShiftDto } from "./dto/shift.dto";
import {
  ReorderScheduleUsersDto,
  UpsertScheduleLeaveOffsetDto,
  UpsertScheduleMonthConfigDto,
} from "./dto/schedule.dto";
import { AttendanceMakeupService } from "./services/attendance-makeup.service";
import { AttendancePunchDeviceUnbindService } from "./services/attendance-punch-device-unbind.service";
import { AttendanceScheduleService } from "./services/attendance-schedule.service";
import { AttendanceService } from "./attendance.service";
import { ChinaHolidaysService } from "./services/china-holidays.service";
import { MakeupEventsService } from "./services/makeup-events.service";

@Controller("attendance")
export class AttendanceController {
  constructor(
    private readonly attendance: AttendanceService,
    private readonly makeup: AttendanceMakeupService,
    private readonly punchDeviceUnbind: AttendancePunchDeviceUnbindService,
    private readonly schedule: AttendanceScheduleService,
    private readonly holidays: ChinaHolidaysService,
    private readonly makeupEvents: MakeupEventsService,
    private readonly permissions: PermissionsService,
  ) {}

  /** 是否拥有「管理他人考勤/排班」权限（角色权限并集） */
  private async canManage(req: Request): Promise<boolean> {
    return await this.permissions.has(actor(req).userId, "attendance.manage");
  }

  private async assertCanManage(req: Request) {
    const a = actor(req);
    if (!(await this.permissions.has(a.userId, "attendance.manage"))) {
      throw new ForbiddenException("需要「管理他人考勤/排班」权限");
    }
    return a;
  }

  @Sse("makeup-events")
  makeupEventsStream(@Req() req: Request): Observable<MessageEvent> {
    const a = actor(req);
    return from(this.permissions.has(a.userId, "attendance.manage")).pipe(
      switchMap((canManage) => this.makeupEvents.stream(a.userId, canManage)),
    );
  }

  @Get("geofence")
  async getGeofence() {
    return await this.attendance.getGeofence();
  }

  @Put("geofence")
  async putGeofence(@Req() req: Request, @Body() dto: UpsertGeofenceDto) {
    await this.assertCanManage(req);
    return await this.attendance.upsertGeofence(dto);
  }

  @Get("shift")
  async getShift() {
    return await this.attendance.getShift();
  }

  @Put("shift")
  async putShift(@Req() req: Request, @Body() dto: UpsertShiftDto) {
    await this.assertCanManage(req);
    return await this.attendance.upsertShift(dto);
  }

  @Post("punch")
  async punch(@Req() req: Request, @Body() dto: PunchDto) {
    const result = await this.attendance.punch(authUserId(req), dto);
    this.attendance.clearMissingHistoryCache();
    return result;
  }

  @Get("punch-device")
  async getPunchDevice(
    @Req() req: Request,
    @Query("deviceToken") deviceToken?: string,
  ) {
    return await this.attendance.getPunchDevice(
      authUserId(req),
      deviceToken ?? "",
    );
  }

  @Get("punch-devices")
  async listPunchDevices(@Req() req: Request) {
    await this.assertCanManage(req);
    return await this.attendance.listPunchDevices();
  }

  @Post("punch-device/unbind")
  async unbindPunchDevice(
    @Req() req: Request,
    @Body() dto: UnbindPunchDeviceDto,
  ) {
    await this.assertCanManage(req);
    return await this.attendance.unbindPunchDevice(dto.userId);
  }

  @Post("punch-device/unbind-requests")
  async createPunchDeviceUnbindRequest(@Req() req: Request) {
    return await this.punchDeviceUnbind.createRequest(authUserId(req));
  }

  @Get("punch-device/unbind-requests/mine")
  async listMyPunchDeviceUnbindRequests(
    @Req() req: Request,
    @Query("status") status?: string,
  ) {
    return await this.punchDeviceUnbind.listMine(authUserId(req), status);
  }

  @Get("punch-device/unbind-requests")
  async listPunchDeviceUnbindRequests(
    @Req() req: Request,
    @Query("status") status?: string,
  ) {
    await this.assertCanManage(req);
    return await this.punchDeviceUnbind.listForAdmin(status);
  }

  @Post("punch-device/unbind-requests/:id/approve")
  async approvePunchDeviceUnbindRequest(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    await this.assertCanManage(req);
    return await this.punchDeviceUnbind.approve(id, authUserId(req));
  }

  @Post("punch-device/unbind-requests/:id/reject")
  async rejectPunchDeviceUnbindRequest(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    await this.assertCanManage(req);
    return await this.punchDeviceUnbind.reject(id, authUserId(req));
  }

  @Get("bundle")
  async bundle(@Req() req: Request, @Query("month") month: string) {
    return await this.attendance.attendanceBundle(authUserId(req), month);
  }

  @Get("summary/monthly-all")
  async monthlyAll(
    @Req() req: Request,
    @Query("month") month: string,
    @Query("detail") detail?: string,
  ) {
    await this.assertCanManage(req);
    return await this.attendance.monthlySummariesForAll(month, detail !== "0");
  }

  @Get("summary/missing-history")
  async missingHistory(@Req() req: Request) {
    return await this.attendance.missingHistory(authUserId(req));
  }

  @Get("summary/monthly")
  async monthly(
    @Req() req: Request,
    @Query("month") month: string,
    @Query("userId") userId?: string,
  ) {
    const targetUserId = userId ? String(userId) : authUserId(req);
    if (
      userId &&
      targetUserId !== authUserId(req) &&
      !(await this.canManage(req))
    ) {
      throw new ForbiddenException("需要「管理他人考勤/排班」权限");
    }
    return await this.attendance.monthlySummary(targetUserId, month);
  }

  @Post("makeup-requests")
  async createMakeupRequest(
    @Req() req: Request,
    @Body() dto: CreateMakeupRequestDto,
  ) {
    const result = await this.makeup.createRequest(authUserId(req), dto);
    this.attendance.clearMissingHistoryCache();
    return result;
  }

  @Post("makeup")
  async directMakeup(@Req() req: Request, @Body() dto: AdminMakeupDto) {
    await this.assertCanManage(req);
    const result = await this.makeup.directMakeup(dto);
    this.attendance.clearMissingHistoryCache();
    return result;
  }

  @Post("rest")
  async declareRest(@Req() req: Request, @Body() dto: DeclareRestDto) {
    const targetUserId = dto.userId ? String(dto.userId) : authUserId(req);
    if (
      dto.userId &&
      targetUserId !== authUserId(req) &&
      !(await this.canManage(req))
    ) {
      throw new ForbiddenException("需要「管理他人考勤/排班」权限");
    }
    const result = await this.schedule.declareRest(
      targetUserId,
      dto.date,
      dto.half,
    );
    this.attendance.clearMissingHistoryCache();
    return result;
  }

  @Post("rest/clear")
  async clearRest(@Req() req: Request, @Body() dto: ClearRestDto) {
    const targetUserId = dto.userId ? String(dto.userId) : authUserId(req);
    if (
      dto.userId &&
      targetUserId !== authUserId(req) &&
      !(await this.canManage(req))
    ) {
      throw new ForbiddenException("需要「管理他人考勤/排班」权限");
    }
    const result = await this.schedule.clearRestHalf(
      targetUserId,
      dto.date,
      dto.half,
    );
    this.attendance.clearMissingHistoryCache();
    return result;
  }

  @Get("makeup-requests/mine")
  async listMyMakeupRequests(
    @Req() req: Request,
    @Query("status") status?: string,
  ) {
    return await this.makeup.listMine(authUserId(req), status);
  }

  @Get("makeup-requests")
  async listMakeupRequests(
    @Req() req: Request,
    @Query("status") status?: string,
  ) {
    await this.assertCanManage(req);
    return await this.makeup.listForAdmin(status);
  }

  @Post("makeup-requests/:id/approve")
  async approveMakeupRequest(@Req() req: Request, @Param("id") id: string) {
    await this.assertCanManage(req);
    const result = await this.makeup.approve(id, authUserId(req));
    this.attendance.clearMissingHistoryCache();
    return result;
  }

  @Post("makeup-requests/:id/reject")
  async rejectMakeupRequest(@Req() req: Request, @Param("id") id: string) {
    await this.assertCanManage(req);
    const result = await this.makeup.reject(id, authUserId(req));
    this.attendance.clearMissingHistoryCache();
    return result;
  }

  @Get("schedule")
  async getSchedule(
    @Query("month") month: string,
    @Query("includeOvertime") includeOvertime?: string,
  ) {
    const data = await this.schedule.getMonth(month);
    const overtimeByUser =
      includeOvertime === "0"
        ? new Map<string, string>()
        : await this.attendance.monthlyOvertimeForUsers(
            month,
            data.users.map((u) => u.userId),
          );
    return {
      ...data,
      users: data.users.map((u) => ({
        ...u,
        overtimeStr: overtimeByUser.get(u.userId) ?? "-",
      })),
    };
  }

  @Get("holidays")
  async getHolidays(@Query("year") year?: string) {
    const y = year ? Number(year) : new Date().getFullYear();
    return await this.holidays.getYear(y);
  }

  @Put("schedule/month-config")
  async putScheduleMonthConfig(
    @Req() req: Request,
    @Body() dto: UpsertScheduleMonthConfigDto,
  ) {
    await this.assertCanManage(req);
    return await this.schedule.upsertMonthConfig(dto);
  }

  @Put("schedule/leave-offset")
  async putScheduleLeaveOffset(
    @Req() req: Request,
    @Body() dto: UpsertScheduleLeaveOffsetDto,
  ) {
    await this.assertCanManage(req);
    return await this.schedule.setLeaveOffset(dto);
  }

  @Put("schedule/user-order")
  async putScheduleUserOrder(
    @Req() req: Request,
    @Body() dto: ReorderScheduleUsersDto,
  ) {
    await this.assertCanManage(req);
    return await this.schedule.reorderUsers(dto);
  }
}
