import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from "@nestjs/common";

import { SaveFeeCategoryDto, SaveFeeItemDto } from "./dto/fee-catalog.dto";
import { FeeCatalogService } from "./fee-catalog.service";

@Controller("fee-catalog")
export class FeeCatalogController {
  constructor(private readonly catalog: FeeCatalogService) {}

  @Get()
  list() {
    return this.catalog.list();
  }

  @Post("categories")
  createCategory(@Body() dto: SaveFeeCategoryDto) {
    return this.catalog.createCategory(dto);
  }

  @Put("categories/:id")
  updateCategory(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SaveFeeCategoryDto,
  ) {
    return this.catalog.updateCategory(id, dto);
  }

  @Delete("categories/:id")
  removeCategory(@Param("id", ParseIntPipe) id: number) {
    return this.catalog.removeCategory(id);
  }

  @Post("items")
  createItem(@Body() dto: SaveFeeItemDto) {
    return this.catalog.createItem(dto);
  }

  @Put("items/:id")
  updateItem(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SaveFeeItemDto,
  ) {
    return this.catalog.updateItem(id, dto);
  }

  @Delete("items/:id")
  removeItem(@Param("id", ParseIntPipe) id: number) {
    return this.catalog.removeItem(id);
  }
}
