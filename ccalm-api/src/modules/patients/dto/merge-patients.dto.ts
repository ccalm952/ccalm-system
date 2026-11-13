import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsInt } from "class-validator";

import { SavePatientDto } from "./save-patient.dto";

/** 资料字段为合并后保留患者的最终值 */
export class MergePatientsDto extends SavePatientDto {
  @Type(() => Number)
  @IsInt()
  targetId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  sourceIds!: number[];
}
