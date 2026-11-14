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

import { RequirePermissions } from "../../common/permissions/require-permissions.decorator";
import { actor } from "../../common/request-auth";
import { AppointmentsService } from "./appointments.service";
import { AppointmentReasonDto } from "./dto/appointment-reason.dto";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";

@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get("meta")
  @RequirePermissions("appointment.view")
  meta() {
    return this.appointments.meta();
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

  @Get("list")
  @RequirePermissions("appointment.view")
  list(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("status") status?: string,
    @Query("doctor") doctor?: string,
    @Query("q") q?: string,
  ) {
    return this.appointments.list({ from, to, status, doctor, q });
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

  @Post(":id/arrive")
  @RequirePermissions("appointment.create")
  arrive(@Param("id", ParseIntPipe) id: number) {
    return this.appointments.arrive(id);
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

  @Post(":id/cancel")
  @RequirePermissions("appointment.create")
  cancel(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AppointmentReasonDto,
  ) {
    return this.appointments.cancel(id, dto.reason, {
      userId: actor(req).userId,
    });
  }

  @Post(":id/revert")
  @RequirePermissions("appointment.create")
  revert(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    return this.appointments.revert(id, { userId: actor(req).userId });
  }

  @Delete(":id")
  @RequirePermissions("appointment.delete")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.appointments.remove(id);
  }
}
