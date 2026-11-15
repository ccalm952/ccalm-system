import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";

import { PermissionsService } from "../../common/permissions/permissions.service";
import { RequirePermissions } from "../../common/permissions/require-permissions.decorator";
import { actor } from "../../common/request-auth";
import { AppointmentsService } from "./appointments.service";
import { AppointmentReasonDto } from "./dto/appointment-reason.dto";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";

@Controller("appointments")
export class AppointmentsController {
  constructor(
    private readonly appointments: AppointmentsService,
    private readonly permissions: PermissionsService,
  ) {}

  @Get("meta")
  @RequirePermissions("appointment.view")
  meta() {
    return this.appointments.meta();
  }

  @Get("settings")
  @RequirePermissions("appointment.view")
  settings() {
    return this.appointments.settings();
  }

  @Put("settings")
  @RequirePermissions("appointment.settings")
  updateSettings(@Body() body: { workStart?: string; workEnd?: string }) {
    return this.appointments.updateSettings(body);
  }
  @Get("board")
  @RequirePermissions("appointment.view")
  board(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("doctorIds") doctorIds?: string,
    @Query("statuses") statuses?: string,
  ) {
    return this.appointments.board({ from, to, doctorIds, statuses });
  }

  @Get("upcoming")
  @RequirePermissions("appointment.view")
  upcoming(@Query("patientId", ParseIntPipe) patientId: number) {
    return this.appointments.upcoming(patientId);
  }
  @Get("pending")
  @RequirePermissions("appointment.view")
  pending() {
    return this.appointments.pending();
  }

  @Post()
  @RequirePermissions("appointment.create")
  create(@Req() req: Request, @Body() dto: CreateAppointmentDto) {
    return this.appointments.create(dto, { userId: actor(req).userId });
  }

  @Put(":id")
  @RequirePermissions("appointment.create")
  update(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointments.update(id, dto, { userId: actor(req).userId });
  }

  @Post(":id/start")
  @RequirePermissions("appointment.create")
  start(@Param("id", ParseIntPipe) id: number) {
    return this.appointments.start(id);
  }
  @Post(":id/miss")
  @RequirePermissions("appointment.create")
  miss(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AppointmentReasonDto,
  ) {
    return this.appointments.miss(id, dto.reason, {
      userId: actor(req).userId,
    });
  }

  @Delete(":id")
  @RequirePermissions("appointment.delete")
  async remove(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    const allowPast = await this.permissions.has(
      actor(req).userId,
      "appointment.delete_past",
    );
    return this.appointments.remove(id, { allowPast });
  }
}
