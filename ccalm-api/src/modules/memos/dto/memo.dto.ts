import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator"

export class CreateMemoDto {
  @IsString()
  @MinLength(1)
  title!: string

  @IsOptional()
  @IsString()
  content?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsBoolean()
  pinned?: boolean
}

export class UpdateMemoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string

  @IsOptional()
  @IsString()
  content?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsBoolean()
  pinned?: boolean
}
