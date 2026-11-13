import { Module } from "@nestjs/common";

import { FeeCatalogController } from "./fee-catalog.controller";
import { FeeCatalogService } from "./fee-catalog.service";

@Module({
  controllers: [FeeCatalogController],
  providers: [FeeCatalogService],
})
export class FeeCatalogModule {}
