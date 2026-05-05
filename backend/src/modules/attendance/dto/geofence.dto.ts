import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator"

export class UpsertGeofenceDto {
  @IsBoolean()
  enabled!: boolean

  @IsNumber()
  centerLat!: number

  @IsNumber()
  centerLng!: number

  @IsInt()
  @Min(1)
  @Max(50000)
  radiusM!: number

  @IsOptional()
  @IsString()
  label?: string
}
