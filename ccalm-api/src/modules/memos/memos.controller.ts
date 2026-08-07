import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from "@nestjs/common"

import { CreateMemoDto, UpdateMemoDto } from "./dto/memo.dto"
import { MemosService } from "./memos.service"

@Controller("memos")
export class MemosController {
  constructor(private readonly memos: MemosService) {}

  @Get()
  list() {
    return this.memos.list()
  }

  @Post()
  create(@Body() dto: CreateMemoDto) {
    return this.memos.create(dto)
  }

  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateMemoDto) {
    return this.memos.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.memos.remove(id)
  }
}
