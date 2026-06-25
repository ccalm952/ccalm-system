import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { memoryStorage } from "multer"
import type { Request } from "express"

import {
  CreateWarehouseItemDto,
  CreateWarehouseTxnDto,
  UpdateWarehouseItemDto,
} from "./dto/warehouse.dto"
import { WarehouseService } from "./warehouse.service"

@Controller("warehouse")
export class WarehouseController {
  constructor(private readonly warehouse: WarehouseService) {}

  private actor(req: Request): { userId: string; role: "user" | "admin" } {
    const u = req.user
    if (!u?.sub || !u.role) throw new ForbiddenException()
    return { userId: u.sub, role: u.role }
  }

  private requireAdmin(req: Request) {
    const a = this.actor(req)
    if (a.role !== "admin") throw new ForbiddenException("仅管理员可管理库房")
    return a
  }

  @Get("items")
  listItems(@Query("q") q?: string) {
    return this.warehouse.listItems(q)
  }

  @Post("items")
  createItem(@Req() req: Request, @Body() dto: CreateWarehouseItemDto) {
    this.requireAdmin(req)
    return this.warehouse.createItem(dto)
  }

  @Put("items/:id")
  updateItem(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateWarehouseItemDto
  ) {
    const a = this.requireAdmin(req)
    return this.warehouse.updateItem(id, dto, a.userId)
  }

  @Delete("items/:id")
  deleteItem(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    this.requireAdmin(req)
    return this.warehouse.deleteItem(id)
  }

  @Get("txns")
  listTxns(
    @Query("month") month?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("type") type?: "in" | "out" | "adjust",
    @Query("itemId") itemId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    const itemIdNum =
      itemId != null && itemId !== "" ? Number.parseInt(itemId, 10) : undefined
    const pageNum =
      page != null && page !== "" ? Number.parseInt(page, 10) : undefined
    const pageSizeNum =
      pageSize != null && pageSize !== ""
        ? Number.parseInt(pageSize, 10)
        : undefined
    return this.warehouse.listTxns({
      month,
      startDate,
      endDate,
      type,
      itemId:
        itemIdNum != null && Number.isFinite(itemIdNum) ? itemIdNum : undefined,
      page: pageNum != null && Number.isFinite(pageNum) ? pageNum : undefined,
      pageSize:
        pageSizeNum != null && Number.isFinite(pageSizeNum)
          ? pageSizeNum
          : undefined,
    })
  }

  @Post("txns")
  createTxn(@Req() req: Request, @Body() dto: CreateWarehouseTxnDto) {
    const a = this.requireAdmin(req)
    return this.warehouse.createTxn(dto, a.userId)
  }

  @Delete("txns/:id")
  deleteTxn(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    this.requireAdmin(req)
    return this.warehouse.deleteTxn(id)
  }

  @Post("import/lichi")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!/\.xlsx?$/i.test(file.originalname)) {
          cb(new BadRequestException("仅支持 .xls / .xlsx 文件"), false)
          return
        }
        cb(null, true)
      },
    })
  )
  importLichi(@Req() req: Request, @UploadedFile() file?: Express.Multer.File) {
    const a = this.requireAdmin(req)
    if (!file?.buffer?.length) {
      throw new BadRequestException("请上传 Excel 文件")
    }
    return this.warehouse.importLichiExcel(file.buffer, a.userId)
  }

  @Get("stats/purchase")
  purchaseStats(
    @Query("month") month?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    return this.warehouse.purchaseStats({ month, startDate, endDate })
  }
}
