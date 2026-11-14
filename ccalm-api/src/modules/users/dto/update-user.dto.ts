import { Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  roleIds?: string[];

  /** @deprecated 旧前端字段，仅用于兼容 */
  @IsOptional()
  @IsIn(["user", "admin"])
  role?: "user" | "admin";

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  leaveInitialBalance?: number;
}
