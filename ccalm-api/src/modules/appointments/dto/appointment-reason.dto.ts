import { IsString, MaxLength, MinLength } from "class-validator";

export class AppointmentReasonDto {
  @IsString()
  @MinLength(2, { message: "请填写原因（至少 2 个字）" })
  @MaxLength(200)
  reason!: string;
}
