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

import { SaveVisitDto } from "./dto/save-visit.dto";
import { VisitsService } from "./visits.service";

@Controller("visits")
export class VisitsController {
  constructor(private readonly visits: VisitsService) {}

  @Get()
  list(@Query("patientId", ParseIntPipe) patientId: number) {
    return this.visits.list(patientId);
  }

  @Post()
  create(@Body() dto: SaveVisitDto) {
    return this.visits.create(dto);
  }

  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: SaveVisitDto) {
    return this.visits.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.visits.remove(id);
  }
}
