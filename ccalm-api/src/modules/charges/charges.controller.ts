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

import { ChargesService } from "./charges.service";
import {
  AddChargePaymentDto,
  CollectChargeDto,
  SaveChargeOrderDto,
} from "./dto/charge.dto";

@Controller("charges")
export class ChargesController {
  constructor(private readonly charges: ChargesService) {}

  @Get()
  list(@Query("patientId", ParseIntPipe) patientId: number) {
    return this.charges.list(patientId);
  }

  @Post()
  create(@Body() dto: SaveChargeOrderDto) {
    return this.charges.create(dto);
  }

  @Post("collect")
  collect(@Body() dto: CollectChargeDto) {
    return this.charges.collectByVisit(dto);
  }

  @Post("courses/:recordId")
  createForCourse(@Param("recordId", ParseIntPipe) recordId: number) {
    return this.charges.createForCourse(recordId);
  }

  @Post("courses/:recordId/sync")
  syncForCourse(@Param("recordId", ParseIntPipe) recordId: number) {
    return this.charges.syncForCourse(recordId);
  }

  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SaveChargeOrderDto,
  ) {
    return this.charges.update(id, dto);
  }

  @Post(":id/payments")
  addPayment(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AddChargePaymentDto,
  ) {
    return this.charges.addPayment(id, dto);
  }

  @Post(":id/void")
  voidOrder(@Param("id", ParseIntPipe) id: number) {
    return this.charges.voidOrder(id);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.charges.remove(id);
  }
}
