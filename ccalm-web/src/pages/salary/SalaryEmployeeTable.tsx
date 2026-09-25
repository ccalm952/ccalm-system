import * as React from "react";
import { Plus, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { round2, type computeSalarySheet } from "@/lib/salary/calc";
import { bonusRateSettingForMode } from "@/lib/salary/settings";
import type { SalaryEmployeeInput, SalaryGlobalSettings } from "@/lib/salary/types";

import {
  RatePercentInput,
  SalaryOutlineIconButton,
  SummaryDecimalInput,
} from "./salary-table-inputs";

type SalarySheetComputed = ReturnType<typeof computeSalarySheet>;

function sumActualReceiptTotal(computed: SalarySheetComputed): number {
  return round2(
    computed.employees.reduce((sum, row) => sum + row.actualReceipt, 0),
  );
}

export function SalaryEmployeeTable({
  computed,
  globalSettings,
  patchGlobalSettings,
  updateEmployee,
  removeEmployee,
  onAddEmployee,
}: {
  computed: SalarySheetComputed;
  globalSettings: SalaryGlobalSettings;
  patchGlobalSettings: (patch: Partial<SalaryGlobalSettings>) => void;
  updateEmployee: (index: number, patch: Partial<SalaryEmployeeInput>) => void;
  removeEmployee: (index: number) => void;
  onAddEmployee: () => void;
}) {
  const actualReceiptTotal = React.useMemo(
    () => sumActualReceiptTotal(computed),
    [computed],
  );

  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead>职称</TableHead>
          <TableHead>姓名</TableHead>
          <TableHead>扣减(%)</TableHead>
          <TableHead>底薪</TableHead>
          <TableHead>扣假后底薪</TableHead>
          <TableHead>实收比例</TableHead>
          <TableHead>实收</TableHead>
          <TableHead>奖金</TableHead>
          <TableHead>种植</TableHead>
          <TableHead>种植奖金</TableHead>
          <TableHead>月薪</TableHead>
          <TableHead>社保</TableHead>
          <TableHead>医保</TableHead>
          <TableHead>公积金</TableHead>
          <TableHead>假期</TableHead>
          <TableHead>假期抵消</TableHead>
          <TableHead>操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {computed.employees.map((row, index) => {
          const rateSetting = bonusRateSettingForMode(row.bonusMode, globalSettings);
          return (
            <TableRow key={row.id}>
              <TableCell>
                <Input
                  value={row.title}
                  placeholder="职称"
                  onChange={(e) => updateEmployee(index, { title: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.name}
                  placeholder="姓名"
                  onChange={(e) => updateEmployee(index, { name: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Tooltip>
                  <TooltipTrigger render={<span />}>
                    <RatePercentInput
                      value={rateSetting.rate}
                      onChange={(rate) =>
                        patchGlobalSettings({ [rateSetting.patchKey]: rate })
                      }
                    />
                  </TooltipTrigger>
                  <TooltipContent>{rateSetting.title}</TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Input
                  placeholder="底薪"
                  value={row.baseSalary}
                  onChange={(e) =>
                    updateEmployee(index, { baseSalary: Number(e.target.value) })
                  }
                />
              </TableCell>
              <TableCell>{row.deductedBase}</TableCell>
              <TableCell>
                <SummaryDecimalInput
                  value={row.shareRatio}
                  onCommit={(shareRatio) => updateEmployee(index, { shareRatio })}
                />
              </TableCell>
              <TableCell>{row.actualReceipt}</TableCell>
              <TableCell>{row.bonus}</TableCell>
              <TableCell>
                <Input
                  value={row.plantingCount}
                  onChange={(e) =>
                    updateEmployee(index, { plantingCount: Number(e.target.value) })
                  }
                />
              </TableCell>
              <TableCell>{row.plantingBonus}</TableCell>
              <TableCell>{row.monthlySalary}</TableCell>
              <TableCell>{row.socialInsurance}</TableCell>
              <TableCell>{row.medicalInsurance}</TableCell>
              <TableCell>
                <Input
                  value={row.housingFund}
                  onChange={(e) =>
                    updateEmployee(index, { housingFund: Number(e.target.value) })
                  }
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.leaveDays}
                  onChange={(e) =>
                    updateEmployee(index, { leaveDays: Number(e.target.value) })
                  }
                />
              </TableCell>
              <TableCell>{row.leaveOffset}</TableCell>
              <TableCell>
                <SalaryOutlineIconButton
                  aria-label="删除员工"
                  onClick={() => removeEmployee(index)}
                >
                  <X className="size-3.5" />
                </SalaryOutlineIconButton>
              </TableCell>
            </TableRow>
          );
        })}
        <TableRow>
          <TableCell />
          <TableCell />
          <TableCell />
          <TableCell />
          <TableCell />
          <TableCell>{computed.totals.shareRatio}</TableCell>
          <TableCell>{actualReceiptTotal}</TableCell>
          <TableCell>{computed.totals.bonus}</TableCell>
          <TableCell />
          <TableCell />
          <TableCell>{computed.totals.monthlySalary}</TableCell>
          <TableCell />
          <TableCell />
          <TableCell />
          <TableCell />
          <TableCell />
          <TableCell>
            <SalaryOutlineIconButton aria-label="添加员工" onClick={onAddEmployee}>
              <Plus className="size-3.5" />
            </SalaryOutlineIconButton>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
