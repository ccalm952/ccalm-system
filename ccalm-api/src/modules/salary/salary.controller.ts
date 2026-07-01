import { Body, Controller, Delete, Get, Param, Post, Put, Req } from "@nestjs/common"
import type { Request } from "express"

import { requireAdmin } from "../../common/request-auth"
import { SaveSalarySheetBodyDto } from "./dto/save-salary-sheet-body.dto"
import { SalaryUnlockDto } from "./dto/salary-unlock.dto"
import { SalaryService } from "./salary.service"
import { SalaryUnlockService } from "./salary-unlock.service"

@Controller("salary")
export class SalaryController {
  constructor(
    private readonly salary: SalaryService,
    private readonly salaryUnlock: SalaryUnlockService
  ) {}

  private assertSalaryAccess(req: Request) {
    const actor = requireAdmin(req, "仅管理员可查看薪资")
    const token = req.header("x-salary-token") ?? undefined
    this.salaryUnlock.assertUnlocked(actor.userId, token)
    return actor
  }

  @Post("unlock")
  async unlock(@Req() req: Request, @Body() dto: SalaryUnlockDto) {
    const actor = requireAdmin(req, "仅管理员可查看薪资")
    this.salaryUnlock.verifyPin(dto.pin)
    return await this.salaryUnlock.issueUnlockToken(actor.userId)
  }

  @Get("months")
  async listMonths(@Req() req: Request) {
    this.assertSalaryAccess(req)
    return await this.salary.listMonths()
  }

  @Get(":month")
  async getMonth(@Req() req: Request, @Param("month") month: string) {
    this.assertSalaryAccess(req)
    return await this.salary.getMonth(month)
  }

  @Put(":month")
  async saveMonth(
    @Req() req: Request,
    @Param("month") month: string,
    @Body() body: SaveSalarySheetBodyDto
  ) {
    this.assertSalaryAccess(req)
    return await this.salary.saveMonth({ month, data: body.data })
  }

  @Delete(":month")
  async deleteMonth(@Req() req: Request, @Param("month") month: string) {
    this.assertSalaryAccess(req)
    return await this.salary.deleteMonth(month)
  }
}
