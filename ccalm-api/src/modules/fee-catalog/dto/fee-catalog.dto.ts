import { Type } from "class-transformer";
import { IsInt, IsNumber, IsString, Min, MinLength } from "class-validator";

export class SaveFeeCategoryDto {
  @IsString()
  @MinLength(1, { message: "请填写分类名称" })
  name!: string;
}

export class SaveFeeItemDto {
  @Type(() => Number)
  @IsInt()
  categoryId!: number;

  @IsString()
  @MinLength(1, { message: "请填写项目名称" })
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;
}
