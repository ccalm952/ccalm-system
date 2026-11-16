import { Type } from "class-transformer";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
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
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  roleIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  leaveInitialBalance?: number;
}
