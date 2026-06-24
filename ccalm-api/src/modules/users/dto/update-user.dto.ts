import { IsIn, IsNumber, IsOptional, IsString, MinLength, Min } from "class-validator"

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
  @IsNumber()
  @Min(0)
  leaveInitialBalance?: number
}
