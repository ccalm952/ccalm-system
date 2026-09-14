import * as React from "react";
import { Plus, X } from "lucide-react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { round2, type computeSalarySheet } from "@/lib/salary/calc";
import { BONUS_MODE_OPTIONS } from "@/lib/salary/defaults";
import type { SalaryEmployeeInput } from "@/lib/salary/types";

import {
  SalaryOutlineIconButton,
  SummaryDecimalInput,
} from "./salary-table-inputs";

type BonusModeOption = (typeof BONUS_MODE_OPTIONS)[number];
type SalarySheetComputed = ReturnType<typeof computeSalarySheet>;

function sumActualReceiptTotal(computed: SalarySheetComputed): number {
  return round2(
    computed.employees.reduce((sum, row) => sum + row.actualReceipt, 0),
  );
}

export function SalaryEmployeeTable({
  computed,
  updateEmployee,
  removeEmployee,
  onAddEmployee,
}: {
  computed: SalarySheetComputed;
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
          <TableHead>奖金类型</TableHead>
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
        {computed.employees.map((row, index) => (
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
              <Combobox
                items={[...BONUS_MODE_OPTIONS]}
                value={
                  BONUS_MODE_OPTIONS.find((opt) => opt.value === row.bonusMode) ?? null
                }
                onValueChange={(opt) => {
                  if (opt) updateEmployee(index, { bonusMode: opt.value });
                }}
                itemToStringValue={(opt: BonusModeOption) => opt.label}
              >
                <ComboboxInput placeholder="选择类型" />
                <ComboboxContent>
                  <ComboboxEmpty>无匹配项</ComboboxEmpty>
                  <ComboboxList>
                    {(opt: BonusModeOption) => (
                      <ComboboxItem key={opt.value} value={opt}>
                        {opt.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
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
        ))}
        <TableRow>
          <TableCell />
          <TableCell />
          <TableCell />
          <TableCell />
          <TableCell>{computed.totals.deductedBase}</TableCell>
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
