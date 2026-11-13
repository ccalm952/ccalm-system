import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class ChargeItemDto {
  /** 收费项目目录 id；不传时只允许保留原单中已有的项目 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  feeItemId?: number | null;

  @IsString()
  @MinLength(1, { message: "请填写收费项目" })
  name!: string;

  @IsOptional()
  @IsString()
  teeth?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class SaveChargeOrderDto {
  @Type(() => Number)
  @IsInt()
  patientId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  visitId?: number | null;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "收费日期格式无效" })
  chargeDate!: string;

  @IsOptional()
  @IsString()
  doctor?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsArray()
  @ArrayMinSize(1, { message: "请至少添加一个收费项目" })
  @ValidateNested({ each: true })
  @Type(() => ChargeItemDto)
  items!: ChargeItemDto[];

  /** 仅新建时生效：开单同时收的金额 */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @IsString()
  payMethod?: string;
}

export class AddChargePaymentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  method?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "收款日期格式无效" })
  paidAt!: string;
}
