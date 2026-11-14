import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const PENDING_REASONS = [
  "patient_time",
  "doctor_schedule",
  "lab",
  "consult",
] as const;
const SOURCES = ["manual", "network", "record", "system"] as const;

export class UpdateAppointmentDto {
  @IsOptional()
  @IsInt()
  patientId?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "预约日期格式无效" })
  visitDate?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME, { message: "开始时间格式无效" })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME, { message: "结束时间格式无效" })
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(120)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  doctor?: string;

  @IsOptional()
  @IsIn(["first", "return"])
  kind?: "first" | "return";

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  items?: string[];

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsBoolean()
  isPending?: boolean;

  @IsOptional()
  @IsIn(PENDING_REASONS)
  pendingReason?: string;

  @IsOptional()
  @IsIn(SOURCES)
  source?: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
