import { IsBoolean } from "class-validator";

export class SetPlanStoppedDto {
  @IsBoolean()
  stopped!: boolean;
}
