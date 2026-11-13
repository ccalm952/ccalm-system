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
} from "@nestjs/common";

import { SaveMedicalRecordDto } from "./dto/save-medical-record.dto";
import { SetPlanStoppedDto } from "./dto/set-plan-stopped.dto";
import { MedicalRecordsService } from "./medical-records.service";

@Controller("medical-records")
export class MedicalRecordsController {
  constructor(private readonly records: MedicalRecordsService) {}

  @Get()
  list(@Query("patientId", ParseIntPipe) patientId: number) {
    return this.records.list(patientId);
  }

  @Post()
  create(@Body() dto: SaveMedicalRecordDto) {
    return this.records.create(dto);
  }

  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SaveMedicalRecordDto,
  ) {
    return this.records.update(id, dto);
  }

  @Put(":id/plan-stopped")
  setPlanStopped(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SetPlanStoppedDto,
  ) {
    return this.records.setPlanStopped(id, dto.stopped);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.records.remove(id);
  }
}
