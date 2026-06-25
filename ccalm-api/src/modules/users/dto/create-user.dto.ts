import { Type } from "class-transformer"
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator"

export class CreateUserDto {
  @IsString()
  username!: string

  @IsString()
  @MinLength(6)
  password!: string

  @IsString()
  displayName!: string

  @IsString()
  @IsIn(["user", "admin"])
  role!: "user" | "admin"

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  leaveInitialBalance?: number
}
