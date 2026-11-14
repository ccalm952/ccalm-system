import { Module } from "@nestjs/common";

import { FollowUpsModule } from "../follow-ups/follow-ups.module";
import { WorkbenchController } from "./workbench.controller";
import { WorkbenchService } from "./workbench.service";

@Module({
  imports: [FollowUpsModule],
  controllers: [WorkbenchController],
  providers: [WorkbenchService],
})
export class WorkbenchModule {}
