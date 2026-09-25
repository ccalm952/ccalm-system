import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { computeSalarySheet } from "@/lib/salary/calc";
import {
  formatScheduleLeaveDays,
  scheduleLeaveSourceMonthLabel,
} from "@/lib/salary/schedule-leave";
import type { SalarySheetData } from "@/lib/salary/types";

import { SummaryDecimalInput } from "./salary-table-inputs";

type SalarySheetComputed = ReturnType<typeof computeSalarySheet>;

export function SalarySummaryTable({
  sheet,
  computed,
  month,
  patchSheet,
}: {
  sheet: SalarySheetData;
  computed: SalarySheetComputed;
  month: string;
  patchSheet: (month: string, patch: SalarySheetData) => void;
}) {
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead>总收入</TableHead>
          <TableHead>实收入</TableHead>
          <TableHead>纯利润</TableHead>
          <TableHead>利润率</TableHead>
          <TableHead>陈美珍（天）</TableHead>
          <TableHead>卢彤（天）</TableHead>
          <TableHead>许桦婧（天）</TableHead>
          <TableHead>计薪工作日</TableHead>
          <TableHead>水电</TableHead>
          <TableHead>租金</TableHead>
          <TableHead>材料</TableHead>
          <TableHead>种植</TableHead>
          <TableHead>加工</TableHead>
          <TableHead>其他</TableHead>
          <TableHead>设备</TableHead>
          <TableHead>五险一金</TableHead>
          <TableHead>员工</TableHead>
          <TableHead>成本总计</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>
            <SummaryDecimalInput
              value={sheet.summary.totalIncome}
              onCommit={(totalIncome) =>
                patchSheet(month, {
                  ...sheet,
                  summary: { ...sheet.summary, totalIncome },
                })
              }
            />
          </TableCell>
          <TableCell>{computed.netIncome}</TableCell>
          <TableCell>{computed.remaining}</TableCell>
          <TableCell>{(computed.profitRate * 100).toFixed(2)}%</TableCell>
          <TableCell
            title={`排班表 ${scheduleLeaveSourceMonthLabel(month)} 请假天数`}
            className="text-muted-foreground"
          >
            {formatScheduleLeaveDays(sheet.leaveQuotas.chen)}
          </TableCell>
          <TableCell
            title={`排班表 ${scheduleLeaveSourceMonthLabel(month)} 请假天数`}
            className="text-muted-foreground"
          >
            {formatScheduleLeaveDays(sheet.leaveQuotas.lu)}
          </TableCell>
          <TableCell
            title={`排班表 ${scheduleLeaveSourceMonthLabel(month)} 请假天数`}
            className="text-muted-foreground"
          >
            {formatScheduleLeaveDays(sheet.leaveQuotas.xu)}
          </TableCell>
          <TableCell>
            <Input
              value={sheet.summary.workingDays}
              onChange={(e) =>
                patchSheet(month, {
                  ...sheet,
                  summary: {
                    ...sheet.summary,
                    workingDays: Number(e.target.value),
                  },
                })
              }
            />
          </TableCell>
          <TableCell>
            <SummaryDecimalInput
              value={sheet.costItems.utilities}
              onCommit={(utilities) =>
                patchSheet(month, {
                  ...sheet,
                  costItems: { ...sheet.costItems, utilities },
                })
              }
            />
          </TableCell>
          <TableCell>
            <SummaryDecimalInput
              value={sheet.costItems.rent}
              onCommit={(rent) =>
                patchSheet(month, {
                  ...sheet,
                  costItems: { ...sheet.costItems, rent },
                })
              }
            />
          </TableCell>
          <TableCell>
            <SummaryDecimalInput
              value={sheet.costItems.materials}
              onCommit={(materials) =>
                patchSheet(month, {
                  ...sheet,
                  costItems: { ...sheet.costItems, materials },
                })
              }
            />
          </TableCell>
          <TableCell>
            <SummaryDecimalInput
              value={sheet.costItems.planting}
              onCommit={(planting) =>
                patchSheet(month, {
                  ...sheet,
                  costItems: { ...sheet.costItems, planting },
                })
              }
            />
          </TableCell>
          <TableCell>
            <SummaryDecimalInput
              value={sheet.costItems.processing}
              onCommit={(processing) =>
                patchSheet(month, {
                  ...sheet,
                  costItems: { ...sheet.costItems, processing },
                })
              }
            />
          </TableCell>
          <TableCell>
            <SummaryDecimalInput
              value={sheet.costItems.other}
              onCommit={(other) =>
                patchSheet(month, {
                  ...sheet,
                  costItems: { ...sheet.costItems, other },
                })
              }
            />
          </TableCell>
          <TableCell title="由设置中的设备分期计划按月自动计算">{computed.equipmentCost}</TableCell>
          <TableCell>{computed.insuranceEmployerTotal}</TableCell>
          <TableCell>{computed.employeePayrollTotal}</TableCell>
          <TableCell>{computed.costGrandTotal}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
