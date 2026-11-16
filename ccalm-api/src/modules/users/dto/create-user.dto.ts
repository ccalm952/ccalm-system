import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  displayName!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  roleIds!: string[];
}
