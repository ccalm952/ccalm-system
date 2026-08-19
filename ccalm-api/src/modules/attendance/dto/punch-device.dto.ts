import { IsNotEmpty, IsString } from "class-validator"

export class UnbindPunchDeviceDto {
  @IsString()
  @IsNotEmpty()
  userId!: string
}
