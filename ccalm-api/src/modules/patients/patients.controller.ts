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

import { MergePatientsDto } from "./dto/merge-patients.dto";
import { SavePatientDto } from "./dto/save-patient.dto";
import { PatientsService } from "./patients.service";

@Controller("patients")
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  list(
    @Query("q") q?: string,
    @Query("group") group?: string,
    @Query("tag") tag?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const p = Number(page);
    const ps = Number(pageSize);
    return this.patients.list({
      q,
      group,
      tag,
      page: Number.isFinite(p) ? p : undefined,
      pageSize: Number.isFinite(ps) ? ps : undefined,
    });
  }

  /** 写在 :id 之前，避免 groups 被当成 id */
  @Get("groups")
  groups() {
    return this.patients.groups();
  }

  /** 病历、收费里医生/助理/护士的下拉选项 */
  @Get("staff")
  staff() {
    return this.patients.staff();
  }

  /** ids 为逗号分隔的患者 id */
  @Get("merge-preview")
  mergePreview(@Query("ids") ids?: string) {
    return this.patients.mergePreview(
      (ids ?? "")
        .split(",")
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    );
  }

  @Post("merge")
  merge(@Body() dto: MergePatientsDto) {
    return this.patients.merge(dto);
  }

  @Get(":id")
  detail(@Param("id", ParseIntPipe) id: number) {
    return this.patients.detail(id);
  }

  @Post()
  create(@Body() dto: SavePatientDto) {
    return this.patients.create(dto);
  }

  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: SavePatientDto) {
    return this.patients.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.patients.remove(id);
  }
}
