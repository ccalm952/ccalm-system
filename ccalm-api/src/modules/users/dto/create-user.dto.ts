import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  roleIds?: string[];

  /** @deprecated 旧前端字段，仅用于兼容 */
  @IsOptional()
  @IsIn(["user", "admin"])
  role?: "user" | "admin";
}
