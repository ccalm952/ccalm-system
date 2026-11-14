import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";

import { CompleteFollowUpDto } from "./dto/complete-follow-up.dto";
import { SaveFollowUpDto } from "./dto/save-follow-up.dto";
import { FollowUpsService } from "./follow-ups.service";

@Controller("follow-ups")
export class FollowUpsController {
  constructor(private readonly followUps: FollowUpsService) {}

  @Get()
  list(
    @Query("patientId") patientId?: string,
    @Query("due") due?: string,
    @Query("status") status?: string,
  ) {
    let parsedPatientId: number | undefined;
    if (patientId) {
      parsedPatientId = Number(patientId);
      if (!Number.isInteger(parsedPatientId)) {
        throw new BadRequestException("患者参数无效");
      }
    }
    return this.followUps.list({
      patientId: parsedPatientId,
      due: due === "1" || due === "true",
      status: status?.trim() || undefined,
    });
  }

  @Post()
  create(@Body() dto: SaveFollowUpDto) {
    return this.followUps.create(dto);
  }

  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: SaveFollowUpDto) {
    return this.followUps.update(id, dto);
  }

  @Post(":id/complete")
  complete(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CompleteFollowUpDto,
  ) {
    return this.followUps.complete(id, dto);
  }

  @Post(":id/cancel")
  cancel(@Param("id", ParseIntPipe) id: number) {
    return this.followUps.cancel(id);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.followUps.remove(id);
  }
}
