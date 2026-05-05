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

import { AddInventoryDto, UpdateInventoryDto } from "./dto/inventory.dto"
import {
  CreateImplantVisitDto,
  ImplantToothInputDto,
} from "./dto/create-visit.dto"
import { UpdateImplantPatientDto } from "./dto/update-patient.dto"
import { UpdateImplantVisitDto } from "./dto/update-visit.dto"
import { ImplantService } from "./implant.service"

@Controller("implant")
export class ImplantController {
  constructor(private readonly implant: ImplantService) {}

  @Get("records")
  records(
    @Query("name") name?: string,
    @Query("phone") phone?: string,
    @Query("chart") chart?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("limit") limit?: string
  ) {
    const lim = limit != null && limit !== "" ? Number(limit) : undefined
    return this.implant.listRecords({
      name,
      phone,
      chart,
      dateFrom,
      dateTo,
      limit: Number.isFinite(lim) ? lim : undefined,
    })
  }

  @Post("visits")
  createVisit(@Body() dto: CreateImplantVisitDto) {
    return this.implant.createVisit(dto)
  }

  @Put("visits/:visitId")
  updateVisit(
    @Param("visitId", ParseIntPipe) visitId: number,
    @Body() dto: UpdateImplantVisitDto
  ) {
    return this.implant.updateVisit(visitId, dto)
  }

  @Post("visits/:visitId/teeth")
  appendTooth(
    @Param("visitId", ParseIntPipe) visitId: number,
    @Body() dto: ImplantToothInputDto
  ) {
    return this.implant.appendToothToVisit(visitId, dto)
  }

  @Delete("visits/:visitId")
  deleteVisit(
    @Param("visitId", ParseIntPipe) visitId: number,
    @Query("toothId") toothId?: string
  ) {
    const tid =
      toothId != null && toothId !== ""
        ? Number.parseInt(toothId, 10)
        : undefined
    return this.implant.deleteVisitRow(
      visitId,
      tid != null && !Number.isNaN(tid) ? tid : undefined
    )
  }

  @Get("inventory")
  inventory() {
    return this.implant.listInventory()
  }

  @Post("inventory")
  addInventory(@Body() dto: AddInventoryDto) {
    return this.implant.addInventory(dto)
  }

  @Put("inventory/:id")
  updateInventory(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateInventoryDto
  ) {
    return this.implant.updateInventory(id, dto)
  }

  /** 删除单条须写在「清空全部」之前，避免误匹配 */
  @Delete("inventory/:id")
  removeInventory(@Param("id", ParseIntPipe) id: number) {
    return this.implant.deleteInventory(id)
  }

  @Delete("inventory")
  removeAllInventory() {
    return this.implant.deleteAllInventory()
  }

  @Get("stats/staff")
  statsStaff(@Query("month") month?: string) {
    return this.implant.statsStaff(month)
  }

  @Get("stats/months")
  statsMonths() {
    return this.implant.statsMonths()
  }

  @Get("stats/month-total")
  statsMonthTotal(@Query("month") month: string) {
    return this.implant.statsMonthTotal(month ?? "")
  }

  @Get("patient")
  plantingPatients(
    @Query("name") name?: string,
    @Query("phone") phone?: string,
    @Query("chart") chart?: string
  ) {
    return this.implant.listPlantingPatients(name, phone, chart)
  }

  @Put("patient/:id")
  updatePlantingPatient(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateImplantPatientDto
  ) {
    return this.implant.updatePlantingPatient(id, dto)
  }

  @Delete("patient/:id")
  deletePlantingPatient(@Param("id", ParseIntPipe) id: number) {
    return this.implant.deletePlantingPatient(id)
  }

  /** 新增种植：姓名自动完成（本库患者） */
  @Get("patient-list")
  patientSuggest(
    @Query("keyword") keyword?: string,
    @Query("pageSize") pageSize?: string
  ) {
    const ps = pageSize != null && pageSize !== "" ? Number(pageSize) : 20
    return this.implant.suggestPatients(keyword, Number.isFinite(ps) ? ps : 20)
  }
}
