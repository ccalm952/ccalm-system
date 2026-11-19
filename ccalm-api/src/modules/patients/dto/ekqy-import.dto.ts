import { Type } from "class-transformer";
import {
  Allow,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

/** scrape.mjs 产出的 .raw.json，外加可选写入选项 */
export class EkqyImportDto {
  @IsString()
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  patientId!: number;

  @Allow()
  patient?: unknown;

  @Allow()
  summaries?: unknown;

  @Allow()
  fulls?: unknown;

  @Allow()
  orders?: unknown;

  @Allow()
  duplicateNames?: unknown;

  @IsOptional()
  @IsString()
  scrapedAt?: string;

  /** 同名时强制按病历号匹配 e看牙患者侧已选中的那条 */
  @IsOptional()
  @IsString()
  chartNo?: string;

  /** 只预览将匹配/清空/写入的数量，不落库 */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
