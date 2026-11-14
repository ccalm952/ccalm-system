import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from "@nestjs/common";

import { RequirePermissions } from "../../common/permissions/require-permissions.decorator";
import { PERMISSION_GROUPS } from "../../common/permissions/permissions";
import { SaveRoleDto } from "./dto/save-role.dto";
import { RolesService } from "./roles.service";

@Controller("roles")
@RequirePermissions("staff.manage")
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  list() {
    return this.roles.list();
  }

  /** 权限点目录（给「人员与角色」页渲染勾选框） */
  @Get("meta")
  meta() {
    return { groups: PERMISSION_GROUPS };
  }

  @Post()
  create(@Body() dto: SaveRoleDto) {
    return this.roles.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: SaveRoleDto) {
    return this.roles.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.roles.remove(id);
  }
}
