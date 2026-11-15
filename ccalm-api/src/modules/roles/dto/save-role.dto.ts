import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class SaveRoleDto {
  @IsString()
  @MinLength(1, { message: "请填写角色名称" })
  @MaxLength(20, { message: "角色名称最多 20 个字" })
  name!: string;

  @IsOptional()
  @IsBoolean()
  bookable?: boolean;

  @IsOptional()
  @IsBoolean()
  assistable?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Matches(/^[a-z]+\.[a-z_]+$/, {
    each: true,
    message: "权限点格式无效",
  })
  permissions?: string[];

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: "排序必须是数字" })
  sortOrder?: string;
}
