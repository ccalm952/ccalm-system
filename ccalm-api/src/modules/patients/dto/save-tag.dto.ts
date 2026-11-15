import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export class CreateTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(COLOR_PATTERN, { message: "颜色格式无效" })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  abbreviation?: string;
}

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(COLOR_PATTERN, { message: "颜色格式无效" })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  abbreviation?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
