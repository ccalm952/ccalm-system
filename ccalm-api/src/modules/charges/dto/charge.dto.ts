import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ChargeItemDto {
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

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @IsString()
  payMethod?: string;
}

export class CollectChargeDto {
  @Type(() => Number)
  @IsInt()
  patientId!: number;

  @Type(() => Number)
  @IsInt()
  visitId!: number;

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  visitId?: number | null;
}

export class VoidChargeOrderDto {
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}
