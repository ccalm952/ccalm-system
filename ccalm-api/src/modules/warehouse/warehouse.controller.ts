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
} from "@nestjs/common"
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
    this.requireAdmin(req)
    return this.warehouse.updateItem(id, dto)
  }

  @Delete("items/:id")
  deleteItem(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    this.requireAdmin(req)
    return this.warehouse.deleteItem(id)
  }

  @Get("txns")
  listTxns(
    @Query("month") month?: string,
    @Query("type") type?: "in" | "out" | "adjust",
    @Query("itemId") itemId?: string
  ) {
    const itemIdNum =
      itemId != null && itemId !== "" ? Number.parseInt(itemId, 10) : undefined
    return this.warehouse.listTxns({
      month,
      type,
      itemId:
        itemIdNum != null && Number.isFinite(itemIdNum) ? itemIdNum : undefined,
    })
  }

  @Post("txns")
  createTxn(@Req() req: Request, @Body() dto: CreateWarehouseTxnDto) {
    const a = this.requireAdmin(req)
    return this.warehouse.createTxn(dto, a.userId)
  }

  @Get("stats/purchase")
  purchaseStats(@Query("month") month?: string) {
    return this.warehouse.purchaseStats(month)
  }
}
