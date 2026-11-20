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

import { RequirePermissions } from "../../common/permissions/require-permissions.decorator";

import { EkqyImportDto } from "./dto/ekqy-import.dto";
import { MergePatientsDto } from "./dto/merge-patients.dto";
import { SavePatientDto } from "./dto/save-patient.dto";
import { CreateTagDto, UpdateTagDto } from "./dto/save-tag.dto";
import { EkqyImportService } from "./ekqy-import.service";
import { PatientsService } from "./patients.service";

@Controller("patients")
export class PatientsController {
  constructor(
    private readonly patients: PatientsService,
    private readonly ekqyImport: EkqyImportService,
  ) {}

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

  /** 标签库（含每个标签的患者数），同样要写在 :id 之前 */
  @Get("tags")
  tags() {
    return this.patients.tags();
  }

  @Post("tags")
  createTag(@Body() dto: CreateTagDto) {
    return this.patients.createTag(dto);
  }

  @Put("tags/:id")
  updateTag(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateTagDto) {
    return this.patients.updateTag(id, dto);
  }

  @Delete("tags/:id")
  removeTag(@Param("id", ParseIntPipe) id: number) {
    return this.patients.removeTag(id);
  }

  /** 可预约人员（医生下拉） */
  @Get("doctors")
  doctors() {
    return this.patients.doctors();
  }

  /** 可配台人员（配台护士下拉） */
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

  /** e看牙 scrape 产出的 raw JSON；会清空该患者已有病历与收费后重写 */
  @Post("ekqy-import")
  @RequirePermissions("patient.import_ekqy")
  importEkqy(@Body() dto: EkqyImportDto) {
    return this.ekqyImport.import(dto);
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
