import { Controller, Get } from "@nestjs/common";

import { WorkbenchService } from "./workbench.service";

@Controller("workbench")
export class WorkbenchController {
  constructor(private readonly workbench: WorkbenchService) {}

  @Get()
  overview() {
    return this.workbench.overview();
  }
}
