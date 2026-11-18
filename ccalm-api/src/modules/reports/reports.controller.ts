import { Controller, Get, Query } from "@nestjs/common";

import { RequirePermissions } from "../../common/permissions/require-permissions.decorator";
import { RevenueQueryDto } from "./dto/revenue-query.dto";
import { ReportsService } from "./reports.service";

@Controller("reports")
@RequirePermissions("report.view")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** 营收分析：期间实收/应收汇总、趋势、分布与近期收费单 */
  @Get("revenue")
  revenue(@Query() query: RevenueQueryDto) {
    return this.reports.revenue(
      query.from,
      query.to,
      query.granularity ?? "day",
    );
  }
}
