import { Type } from "class-transformer"
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator"

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  displayName?: string

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string

  @IsOptional()
  @IsString()
  @IsIn(["user", "admin"])
  role?: "user" | "admin"

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  leaveInitialBalance?: number
}
