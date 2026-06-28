import { Body, Controller, Get, Param, Put, Req } from "@nestjs/common"
import type { Request } from "express"

import { requireAdmin } from "../../common/request-auth"
import { SaveSalarySheetBodyDto } from "./dto/save-salary-sheet-body.dto"
import { SalaryService } from "./salary.service"

@Controller("salary")
export class SalaryController {
  constructor(private readonly salary: SalaryService) {}

  @Get("months")
  async listMonths(@Req() req: Request) {
    requireAdmin(req, "仅管理员可查看薪资")
    return await this.salary.listMonths()
  }

  @Get(":month")
  async getMonth(@Req() req: Request, @Param("month") month: string) {
    requireAdmin(req, "仅管理员可查看薪资")
    return await this.salary.getMonth(month)
  }

  @Put(":month")
  async saveMonth(
    @Req() req: Request,
    @Param("month") month: string,
    @Body() body: SaveSalarySheetBodyDto
  ) {
    requireAdmin(req, "仅管理员可编辑薪资")
    return await this.salary.saveMonth({ month, data: body.data })
  }
}
