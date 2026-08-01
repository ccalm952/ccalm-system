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
} from "@nestjs/common"

import {
  CreateOrthodonticsPatientDto,
  UpdateOrthodonticsPatientDto,
} from "./dto/orthodontics-patient.dto"
import { OrthodonticsService } from "./orthodontics.service"

@Controller("orthodontics")
export class OrthodonticsController {
  constructor(private readonly orthodontics: OrthodonticsService) {}

  @Get("patients")
  list(@Query("category") category?: string, @Query("q") q?: string) {
    return this.orthodontics.list(category ?? "", q)
  }

  @Post("patients")
  create(@Body() dto: CreateOrthodonticsPatientDto) {
    return this.orthodontics.create(dto)
  }

  @Put("patients/:id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateOrthodonticsPatientDto
  ) {
    return this.orthodontics.update(id, dto)
  }

  @Delete("patients/:id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.orthodontics.remove(id)
  }
}
