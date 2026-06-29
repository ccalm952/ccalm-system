import * as React from "react";
import { Navigate } from "react-router-dom";
import { Plus, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROUTES } from "@/config/routes";
import { computeSalarySheet, buildPriorBonusMap, computeInsuranceTable, round2 } from "@/lib/salary/calc";
import {
  applyMonthCalendar,
  BONUS_MODE_OPTIONS,
  createCostLine,
  createDefaultSalarySheet,
  createEmptyEmployee,
  createOperatingLine,
  calendarDaysForMonth,
  formatSalaryMonthTab,
  isSalarySheetData,
  listSalaryMonths,
  normalizeSalarySheet,
  previousSalaryMonth,
} from "@/lib/salary/defaults";
import type {
  SalaryEmployeeInput,
  SalaryHousingFundInput,
  SalaryInsuranceInput,
  SalarySheetData,
} from "@/lib/salary/types";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { hasSalaryUnlockToken, setSalaryUnlockToken } from "@/lib/salary-unlock";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";
import { SalaryUnlockDialog } from "@/components/salary-unlock-dialog";

/** 表格中需突出的数值：红色，不加粗 */
const SALARY_HIGHLIGHT = "text-destructive";
/** 薪资页表格：无横线 + 奇数行横向斑马纹 */
const SALARY_STRIPED_TABLE =
  "[&_[data-slot=table-header]_tr]:border-0 [&_[data-slot=table-body]_tr]:border-0 [&_[data-slot=table-row]]:border-0 [&_[data-slot=table-body]_tr:nth-child(odd)]:bg-chart-1/10 [&_[data-slot=table-body]_tr:hover]:bg-chart-1/15";

function lineItemColAt(extra?: string) {
  return cn("min-w-0 px-1.5 text-center", extra);
}

/** 五险一金表体单元格 */
function insuranceColAt(extra?: string) {
  return cn("min-w-0 px-1.5 text-center", extra);
}

const SALARY_TABLE_FIELD =
  "border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent";

function salaryEmpInput(extra?: string) {
  return cn(
    "field-sizing-content h-full w-auto min-w-min text-center text-primary placeholder:text-primary/40",
    SALARY_TABLE_FIELD,
    extra,
  );
}

/** 表格内奖金类型选项 */
type BonusModeOption = (typeof BONUS_MODE_OPTIONS)[number];

/** 员工薪资表列数 */
const SALARY_EMPLOYEE_COL_COUNT = 17;
/** 员工薪资汇总表列数 */
const SALARY_SUMMARY_COL_COUNT = 8;

type SalarySheetComputed = ReturnType<typeof computeSalarySheet>;

/** 列宽 ch 估算：西文/数字为等宽体，1 字符 = 1ch；中文 1 字 = 1ch */
function textDisplayWidthCh(text: string): number {
  return Array.from(text).length;
}

function sumActualReceiptTotal(computed: SalarySheetComputed): number {
  return round2(
    computed.employees.reduce((sum, row) => sum + row.actualReceipt, 0),
  );
}

/** 只读列各自最大内容宽度，再取全局最大作为全表列 min-width */
function computeEmployeeTableColMinCh(computed: SalarySheetComputed): number {
  const actualReceiptTotal = sumActualReceiptTotal(computed);

  const readOnlyColumns: { header: string; texts: (string | number)[] }[] = [
    {
      header: "扣假后底薪",
      texts: [
        ...computed.employees.map((row) => row.deductedBase),
        computed.totals.deductedBase,
      ],
    },
    {
      header: "实收",
      texts: [
        ...computed.employees.map((row) => row.actualReceipt),
        actualReceiptTotal,
      ],
    },
    {
      header: "奖金",
      texts: [
        ...computed.employees.map((row) => row.bonus),
        computed.totals.bonus,
      ],
    },
    {
      header: "种植奖金",
      texts: computed.employees.map((row) => row.plantingBonus),
    },
    {
      header: "月薪",
      texts: [
        ...computed.employees.map((row) => row.monthlySalary),
        computed.totals.monthlySalary,
      ],
    },
    {
      header: "社保",
      texts: computed.employees.map((row) => row.socialInsurance),
    },
    {
      header: "医保",
      texts: computed.employees.map((row) => row.medicalInsurance),
    },
    {
      header: "假期抵消",
      texts: computed.employees.map((row) => row.leaveOffset),
    },
  ];

  const perColumnMax = readOnlyColumns.map((col) => {
    const widths = [col.header, ...col.texts.map((value) => String(value))].map(
      textDisplayWidthCh,
    );
    return Math.max(...widths);
  });

  return Math.max(...perColumnMax, 1);
}

function SalaryEmployeeTable({
  computed,
  updateEmployee,
  removeEmployee,
  onAddEmployee,
}: {
  computed: ReturnType<typeof computeSalarySheet>;
  updateEmployee: (index: number, patch: Partial<SalaryEmployeeInput>) => void;
  removeEmployee: (index: number) => void;
  onAddEmployee: () => void;
}) {
  const colMinCh = React.useMemo(
    () => computeEmployeeTableColMinCh(computed),
    [computed],
  );
  const tableMinWidth = React.useMemo(
    () => `calc(${SALARY_EMPLOYEE_COL_COUNT} * (${colMinCh}ch + 1rem))`,
    [colMinCh],
  );
  const actualReceiptTotal = React.useMemo(
    () => sumActualReceiptTotal(computed),
    [computed],
  );

  return (
    <Table
      className="w-full table-fixed text-center [&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:shadow-none [&_[data-slot=input-group]]:text-center [&_input]:border-0 [&_input]:text-center [&_input]:shadow-none [&_td]:text-center [&_th]:text-center"
      style={{ minWidth: tableMinWidth }}
    >
      <colgroup>
        {Array.from({ length: SALARY_EMPLOYEE_COL_COUNT }, (_, i) => (
          <col
            key={i}
            style={{ minWidth: `calc(${colMinCh}ch + 1rem)` }}
          />
        ))}
      </colgroup>
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
          <TableHead />
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
                type="number"
                value={row.baseSalary}
                onChange={(e) =>
                  updateEmployee(index, { baseSalary: Number(e.target.value) })
                }
              />
            </TableCell>
            <TableCell>{row.deductedBase}</TableCell>
            <TableCell>
              <Input
                type="number"
                value={row.shareRatio}
                onChange={(e) =>
                  updateEmployee(index, { shareRatio: Number(e.target.value) })
                }
              />
            </TableCell>
            <TableCell>{row.actualReceipt}</TableCell>
            <TableCell>{row.bonus}</TableCell>
            <TableCell>
              <Input
                type="number"
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
                type="number"
                value={row.housingFund}
                onChange={(e) =>
                  updateEmployee(index, { housingFund: Number(e.target.value) })
                }
              />
            </TableCell>
            <TableCell>
              <Input
                type="number"
                value={row.leaveDays}
                onChange={(e) =>
                  updateEmployee(index, { leaveDays: Number(e.target.value) })
                }
              />
            </TableCell>
            <TableCell>{row.leaveOffset}</TableCell>
            <TableCell>
              <Button type="button" onClick={() => removeEmployee(index)}>
                <X />
              </Button>
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
            <Button type="button" onClick={onAddEmployee}>
              <Plus />
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

/** 数字输入：封装 shadcn Input，无额外默认样式 */
function NumInput(props: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  step?: string;
}) {
  const { value, onChange, className, step = "any" } = props;
  return (
    <Input
      type="number"
      step={step}
      className={className}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
  );
}

function ReadCell({ value, className }: { value: string | number; className?: string }) {
  return <span className={cn("inline-block tabular-nums", className)}>{value}</span>;
}

/** 费率百分比输入（保留一位小数）：封装 shadcn Input */
function RatePercentInput(props: {
  value: number;
  onChange: (ratio: number) => void;
  className?: string;
}) {
  const { value, onChange, className } = props;
  const display = Number.isFinite(value) ? Math.round(value * 1000) / 10 : 0;
  return (
    <Input
      type="number"
      step="0.1"
      className={className}
      value={display}
      onChange={(e) => onChange((Number(e.target.value) || 0) / 100)}
    />
  );
}

function RemoveRowButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" onClick={onClick}>
      <X />
    </Button>
  );
}

function computeWithCarryover(
  month: string,
  sheet: SalarySheetData,
  sheets: Record<string, SalarySheetData>,
): ReturnType<typeof computeSalarySheet> {
  return computeSalarySheet(sheet, {
    priorBonusByName: buildPriorBonusMap(month, sheets, previousSalaryMonth),
  });
}

function ExpenseFooterSummary({
  computed,
}: {
  computed: ReturnType<typeof computeSalarySheet>;
}) {
  const rows: { label: string; value: number; emphasis?: boolean }[] = [
    { label: "运营费用", value: computed.operatingTotal },
    { label: "成本", value: computed.costTotal },
    { label: "员工工资", value: computed.employeePayrollTotal },
    { label: "五险一金", value: computed.insuranceEmployerTotal },
    { label: "总计", value: computed.expenseTotal, emphasis: true },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-medium">支出统计</h4>
          <p className="text-muted-foreground text-xs">根据左侧录入自动汇总</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="pointer-events-none invisible shrink-0"
          tabIndex={-1}
        >
          <Plus className="size-3.5" />
          添加项目
        </Button>
      </div>
      <dl className="divide-border divide-y text-sm">
        {rows.map(({ label, value, emphasis }) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-4 py-2.5"
          >
            <dt className={emphasis ? SALARY_HIGHLIGHT : "text-muted-foreground"}>{label}</dt>
            <dd className={cn("tabular-nums", emphasis && SALARY_HIGHLIGHT)}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

type MergedCostRef = {
  source: "costs" | "processing";
  index: number;
  line: { id: string; label: string; amount: number };
};

function getMergedCostRows(sheet: SalarySheetData): MergedCostRef[] {
  return [
    ...sheet.costs.map((line, index) => ({ source: "costs" as const, index, line })),
    ...sheet.processing.map((line, index) => ({ source: "processing" as const, index, line })),
  ];
}

function InsuranceFundTable({
  insurance,
  housingFund,
  onInsuranceChange,
  onHousingChange,
}: {
  insurance: SalaryInsuranceInput;
  housingFund: SalaryHousingFundInput;
  onInsuranceChange: (patch: Partial<SalaryInsuranceInput>) => void;
  onHousingChange: (patch: Partial<SalaryHousingFundInput>) => void;
}) {
  const { lines, groupTotals } = computeInsuranceTable(insurance, housingFund);
  const socialLines = lines.filter((line) => line.group === "social");
  const medicalLines = lines.filter((line) => line.group === "medical");
  const housingLine = lines.find((line) => line.group === "housing")!;

  function renderInsuranceRow(
    line: (typeof lines)[number],
    rowIndex: number,
    groupLines: typeof lines,
    groupTotal: number,
    patchBase: (value: number) => void,
    patchEmployer: (patch: { rate?: number; count?: number }) => void,
    patchPersonal: (patch: { rate?: number; count?: number }) => void,
  ) {
    return (
      <TableRow key={line.key}>
        {rowIndex === 0 ? (
          <TableCell rowSpan={groupLines.length} className={insuranceColAt("font-medium")}>
            {line.groupLabel}
          </TableCell>
        ) : null}
        <TableCell className={insuranceColAt()}>{line.label}</TableCell>
        <TableCell className={insuranceColAt()}>
          <NumInput className={salaryEmpInput()} value={line.base} onChange={patchBase} />
        </TableCell>
        <TableCell className={insuranceColAt()}>
          <RatePercentInput
            className={salaryEmpInput()}
            value={line.employerRate}
            onChange={(rate) => patchEmployer({ rate })}
          />
        </TableCell>
        <TableCell className={insuranceColAt()}>
          <NumInput
            className={salaryEmpInput()}
            value={line.employerCount}
            onChange={(count) => patchEmployer({ count })}
          />
        </TableCell>
        <TableCell className={insuranceColAt()}>
          <ReadCell value={line.employerSubtotal} />
        </TableCell>
        <TableCell className={insuranceColAt()}>
          {line.personalRate != null ? (
            <RatePercentInput
              className={salaryEmpInput()}
              value={line.personalRate}
              onChange={(rate) => patchPersonal({ rate })}
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className={insuranceColAt()}>
          {line.personalCount != null ? (
            <NumInput
              className={salaryEmpInput()}
              value={line.personalCount}
              onChange={(count) => patchPersonal({ count })}
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className={insuranceColAt()}>
          {line.personalSubtotal != null ? (
            <ReadCell value={line.personalSubtotal} />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className={insuranceColAt()}>
          <ReadCell value={line.rowTotal} />
        </TableCell>
        {rowIndex === 0 ? (
          <TableCell rowSpan={groupLines.length} className={insuranceColAt(SALARY_HIGHLIGHT)}>
            {groupTotal}
          </TableCell>
        ) : null}
      </TableRow>
    );
  }

  const socialPatches = [
    {
      line: socialLines[0],
      base: (v: number) => onInsuranceChange({ pensionBase: v }),
      employer: (p: { rate?: number; count?: number }) =>
        onInsuranceChange({
          ...(p.rate != null ? { pensionEmployerRate: p.rate } : {}),
          ...(p.count != null ? { pensionEmployerCount: p.count } : {}),
        }),
      personal: (p: { rate?: number; count?: number }) =>
        onInsuranceChange({
          ...(p.rate != null ? { pensionPersonalRate: p.rate } : {}),
          ...(p.count != null ? { pensionPersonalCount: p.count } : {}),
        }),
    },
    {
      line: socialLines[1],
      base: (v: number) => onInsuranceChange({ unemploymentBase: v }),
      employer: (p: { rate?: number; count?: number }) =>
        onInsuranceChange({
          ...(p.rate != null ? { unemploymentEmployerRate: p.rate } : {}),
          ...(p.count != null ? { unemploymentEmployerCount: p.count } : {}),
        }),
      personal: (p: { rate?: number; count?: number }) =>
        onInsuranceChange({
          ...(p.rate != null ? { unemploymentPersonalRate: p.rate } : {}),
          ...(p.count != null ? { unemploymentPersonalCount: p.count } : {}),
        }),
    },
    {
      line: socialLines[2],
      base: (v: number) => onInsuranceChange({ injuryBase: v }),
      employer: (p: { rate?: number; count?: number }) =>
        onInsuranceChange({
          ...(p.rate != null ? { injuryEmployerRate: p.rate } : {}),
          ...(p.count != null ? { injuryEmployerCount: p.count } : {}),
        }),
      personal: () => undefined,
    },
  ];

  const medicalPatches = [
    {
      line: medicalLines[0],
      base: (v: number) => onInsuranceChange({ medicalBase: v }),
      employer: (p: { rate?: number; count?: number }) =>
        onInsuranceChange({
          ...(p.rate != null ? { medicalEmployerRate: p.rate } : {}),
          ...(p.count != null ? { medicalEmployerCount: p.count } : {}),
        }),
      personal: (p: { rate?: number; count?: number }) =>
        onInsuranceChange({
          ...(p.rate != null ? { medicalPersonalRate: p.rate } : {}),
          ...(p.count != null ? { medicalPersonalCount: p.count } : {}),
        }),
    },
    {
      line: medicalLines[1],
      base: (v: number) => onInsuranceChange({ maternityBase: v }),
      employer: (p: { rate?: number; count?: number }) =>
        onInsuranceChange({
          ...(p.rate != null ? { maternityEmployerRate: p.rate } : {}),
          ...(p.count != null ? { maternityEmployerCount: p.count } : {}),
        }),
      personal: () => undefined,
    },
  ];

  return (
    <div className="space-y-2">
      <div>
        <h4 className="text-sm font-medium">五险一金</h4>
        <p className="text-muted-foreground text-xs">与 Excel 缴费表一致，修改后自动重算</p>
      </div>
      <div className="overflow-x-auto">
        <Table className="w-full table-fixed [&_input[type=number]]:appearance-textfield [&_input[type=number]::-webkit-inner-spin-button]:appearance-none [&_input[type=number]::-webkit-outer-spin-button]:appearance-none [&_td]:text-center [&_th]:text-center">
          <colgroup>
            {Array.from({ length: INSURANCE_COL_COUNT }, (_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead colSpan={2}>险种</TableHead>
              <TableHead rowSpan={2}>缴费基数</TableHead>
              <TableHead colSpan={3}>单位</TableHead>
              <TableHead colSpan={3}>个人</TableHead>
              <TableHead rowSpan={2}>合计</TableHead>
              <TableHead rowSpan={2}>总计</TableHead>
            </TableRow>
            <TableRow>
              <TableHead>类别</TableHead>
              <TableHead>项目</TableHead>
              <TableHead>缴费比例</TableHead>
              <TableHead>缴费人数</TableHead>
              <TableHead>小计</TableHead>
              <TableHead>缴费比例</TableHead>
              <TableHead>缴费人数</TableHead>
              <TableHead>小计</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {socialPatches.map((row, idx) =>
              renderInsuranceRow(
                row.line,
                idx,
                socialLines,
                groupTotals.social,
                row.base,
                row.employer,
                row.personal,
              ),
            )}
            {medicalPatches.map((row, idx) =>
              renderInsuranceRow(
                row.line,
                idx,
                medicalLines,
                groupTotals.medical,
                row.base,
                row.employer,
                row.personal,
              ),
            )}
            <TableRow key="housing">
              <TableCell className={insuranceColAt("font-medium")}>公积金</TableCell>
              <TableCell className={insuranceColAt()}>{housingLine.label}</TableCell>
              <TableCell className={insuranceColAt()}>
                <NumInput
                  className={salaryEmpInput()}
                  value={housingLine.base}
                  onChange={(base) => onHousingChange({ base })}
                />
              </TableCell>
              <TableCell className={insuranceColAt()}>
                <RatePercentInput
                  className={salaryEmpInput()}
                  value={housingLine.employerRate}
                  onChange={(employerRate) => onHousingChange({ employerRate })}
                />
              </TableCell>
              <TableCell className={insuranceColAt()}>
                <NumInput
                  className={salaryEmpInput()}
                  value={housingLine.employerCount}
                  onChange={(employerCount) => onHousingChange({ employerCount })}
                />
              </TableCell>
              <TableCell className={insuranceColAt()}>
                <ReadCell value={housingLine.employerSubtotal} />
              </TableCell>
              <TableCell className={insuranceColAt()}>
                <RatePercentInput
                  className={salaryEmpInput()}
                  value={housingLine.personalRate!}
                  onChange={(personalRate) => onHousingChange({ personalRate })}
                />
              </TableCell>
              <TableCell className={insuranceColAt()}>
                <NumInput
                  className={salaryEmpInput()}
                  value={housingLine.personalCount!}
                  onChange={(personalCount) => onHousingChange({ personalCount })}
                />
              </TableCell>
              <TableCell className={insuranceColAt()}>
                <ReadCell value={housingLine.personalSubtotal!} />
              </TableCell>
              <TableCell className={insuranceColAt()}>
                <ReadCell value={housingLine.rowTotal} />
              </TableCell>
              <TableCell className={insuranceColAt(SALARY_HIGHLIGHT)}>{groupTotals.housing}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

const LINE_ITEM_COL_COUNT = 6;
const INSURANCE_COL_COUNT = 11;
/** 成本与支出顶栏：运营 | 成本 | 统计 各占 2/6 */
const EXPENSE_TOP_BLOCK = "col-span-6 min-w-0 lg:col-span-2";

function LineItemTable({
  title,
  description,
  rows,
  onAdd,
  onUpdate,
  onRemove,
  addLabel,
}: {
  title: string;
  description?: string;
  rows: { id: string; label: string; amount: number }[];
  onAdd: () => void;
  onUpdate: (index: number, patch: { label?: string; amount?: number }) => void;
  onRemove: (index: number) => void;
  addLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-medium">{title}</h4>
          {description ? (
            <p className="text-muted-foreground text-xs">{description}</p>
          ) : null}
        </div>
        <Button type="button" variant="outline" onClick={onAdd}>
          <Plus className="size-3.5" />
          {addLabel}
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-6 text-center text-sm">
          暂无项目，点击「{addLabel}」添加
        </p>
      ) : (
        <Table
          className={cn(
            "w-full table-fixed [&_input[type=number]]:appearance-textfield [&_input[type=number]::-webkit-inner-spin-button]:appearance-none [&_input[type=number]::-webkit-outer-spin-button]:appearance-none",
            SALARY_STRIPED_TABLE,
          )}
        >
          <colgroup>
            {Array.from({ length: LINE_ITEM_COL_COUNT }, (_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          <TableHeader className="border-0 [&_tr]:border-0">
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead colSpan={3} className="text-center">
                项目
              </TableHead>
              <TableHead colSpan={2} className="text-center">
                金额
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((line, idx) => (
              <TableRow key={line.id} className="border-0">
                <TableCell colSpan={3} className={lineItemColAt()}>
                  <Input
                    className={salaryEmpInput()}
                    value={line.label}
                    placeholder="项目名称"
                    onChange={(e) => onUpdate(idx, { label: e.target.value })}
                  />
                </TableCell>
                <TableCell colSpan={2} className={lineItemColAt()}>
                  <NumInput
                    className={salaryEmpInput()}
                    value={line.amount}
                    onChange={(amount) => onUpdate(idx, { amount })}
                  />
                </TableCell>
                <TableCell className={lineItemColAt("text-center")}>
                  <RemoveRowButton onClick={() => onRemove(idx)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

const salaryApi = { salary: true as const };

function handleSalaryAccessError(e: unknown, onLocked: () => void): boolean {
  const err = e as { status?: number };
  if (err.status === 403) {
    setSalaryUnlockToken(null);
    onLocked();
    return true;
  }
  return false;
}

export function SalaryPage() {
  const { me } = useAuth();
  const [salaryUnlocked, setSalaryUnlocked] = React.useState(hasSalaryUnlockToken);
  const months = React.useMemo(() => listSalaryMonths(), []);
  const [activeMonth, setActiveMonth] = React.useState(() => months[months.length - 1] ?? "");
  const [sheets, setSheets] = React.useState<Record<string, SalarySheetData>>({});
  const [loadingMonth, setLoadingMonth] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const saveTimerRef = React.useRef<number | null>(null);

  const fetchMonth = React.useCallback(async (month: string) => {
    const res = await api<{ month: string; data: SalarySheetData }>(
      "GET",
      `/salary/${month}`,
      undefined,
      salaryApi,
    );
    const data = normalizeSalarySheet(res.data, month);
    const rawDays =
      isSalarySheetData(res.data) ? res.data.summary.daysInMonth : undefined;
    if (!isSalarySheetData(res.data) || rawDays !== calendarDaysForMonth(month)) {
      await api("PUT", `/salary/${month}`, { data }, salaryApi);
    }
    return data;
  }, []);

  const lockSalary = React.useCallback(() => {
    setSalaryUnlockToken(null);
    setSalaryUnlocked(false);
    setSheets({});
  }, []);

  const loadMonth = React.useCallback(
    async (month: string) => {
      if (!month || sheets[month]) return;
      setLoadingMonth(month);
      try {
        const data = await fetchMonth(month);
        setSheets((prev) => ({ ...prev, [month]: data }));

        const prev = previousSalaryMonth(month);
        if (prev && !sheets[prev]) {
          try {
            const prevData = await fetchMonth(prev);
            setSheets((p) => ({ ...p, [prev]: prevData }));
          } catch {
            // 上月无记录时不影响当月
          }
        }
      } catch (e) {
        if (handleSalaryAccessError(e, lockSalary)) return;
        const err = e as { status?: number };
        if (err.status === 404) {
          const data = createDefaultSalarySheet(month);
          setSheets((prev) => ({ ...prev, [month]: data }));
          await api("PUT", `/salary/${month}`, { data }, salaryApi);
        } else {
          toast.error(errorMessage(e));
        }
      } finally {
        setLoadingMonth((m) => (m === month ? null : m));
      }
    },
    [fetchMonth, lockSalary, sheets],
  );

  React.useEffect(() => {
    if (salaryUnlocked && activeMonth) void loadMonth(activeMonth);
  }, [activeMonth, loadMonth, salaryUnlocked]);

  const patchSheet = React.useCallback((month: string, patch: SalarySheetData) => {
    const data = applyMonthCalendar(patch, month);
    setSheets((prev) => ({ ...prev, [month]: data }));
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      setSaving(true);
      void api("PUT", `/salary/${month}`, { data }, salaryApi)
        .catch((e) => {
          if (handleSalaryAccessError(e, lockSalary)) return;
          toast.error(errorMessage(e));
        })
        .finally(() => setSaving(false));
    }, 600);
  }, [lockSalary]);

  if (me?.role !== "admin") {
    return <Navigate to={ROUTES.home} replace />;
  }

  if (!salaryUnlocked) {
    return (
      <SalaryUnlockDialog
        open
        onUnlocked={() => setSalaryUnlocked(true)}
      />
    );
  }

  const sheet = activeMonth ? sheets[activeMonth] : undefined;
  const computed =
    sheet && activeMonth ? computeWithCarryover(activeMonth, sheet, sheets) : null;

  function updateEmployee(index: number, patch: Partial<SalaryEmployeeInput>) {
    if (!sheet || !activeMonth) return;
    const employees = sheet.employees.map((row, i) =>
      i === index ? { ...row, ...patch } : row,
    );
    patchSheet(activeMonth, { ...sheet, employees });
  }

  function addEmployee() {
    if (!sheet || !activeMonth) return;
    patchSheet(activeMonth, {
      ...sheet,
      employees: [...sheet.employees, createEmptyEmployee()],
    });
  }

  function removeEmployee(index: number) {
    if (!sheet || !activeMonth) return;
    if (sheet.employees.length <= 1) {
      toast.error("至少保留一名员工");
      return;
    }
    patchSheet(activeMonth, {
      ...sheet,
      employees: sheet.employees.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">薪资计算</h1>
          <p className="text-muted-foreground text-sm">按月份编辑，修改后自动保存</p>
        </div>
        <div className="flex items-center gap-2">
          {saving ? (
            <span className="text-muted-foreground flex items-center gap-2 text-sm">
              <Spinner className="size-4" /> 保存中…
            </span>
          ) : null}
          {sheet && activeMonth ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const data = createDefaultSalarySheet(activeMonth);
                patchSheet(activeMonth, data);
                toast.success("已恢复为默认模板");
              }}
            >
              <RotateCcw className="size-3.5" />
              恢复模板
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs value={activeMonth} onValueChange={setActiveMonth} className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <div className="w-full overflow-x-auto pb-1">
          <TabsList className="inline-flex h-9 w-max">
            {months.map((month) => (
              <TabsTrigger
                key={month}
                value={month}
                className="min-w-14 shrink-0 flex-none px-3"
              >
                {formatSalaryMonthTab(month)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {months.map((month) => (
          <TabsContent key={month} value={month} className="min-h-0 min-w-0 flex-1 space-y-4">
            {loadingMonth === month && !sheet ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Spinner className="size-4" /> 加载中…
              </div>
            ) : null}

            {sheet && computed && month === activeMonth ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>员工薪资</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table className="w-full table-fixed text-center [&_input]:text-center [&_td]:text-center [&_th]:text-center">
                      <colgroup>
                        {Array.from({ length: SALARY_SUMMARY_COL_COUNT }, (_, i) => (
                          <col key={i} />
                        ))}
                      </colgroup>
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>
                            <Input
                              type="number"
                              value={sheet.summary.totalIncome}
                              onChange={(e) =>
                                patchSheet(month, {
                                  ...sheet,
                                  summary: {
                                    ...sheet.summary,
                                    totalIncome: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>{computed.netIncome}</TableCell>
                          <TableCell>{computed.remaining}</TableCell>
                          <TableCell>{(computed.profitRate * 100).toFixed(2)}%</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={sheet.leaveQuotas.chen}
                              onChange={(e) =>
                                patchSheet(month, {
                                  ...sheet,
                                  leaveQuotas: {
                                    ...sheet.leaveQuotas,
                                    chen: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={sheet.leaveQuotas.lu}
                              onChange={(e) =>
                                patchSheet(month, {
                                  ...sheet,
                                  leaveQuotas: {
                                    ...sheet.leaveQuotas,
                                    lu: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={sheet.leaveQuotas.xu}
                              onChange={(e) =>
                                patchSheet(month, {
                                  ...sheet,
                                  leaveQuotas: {
                                    ...sheet.leaveQuotas,
                                    xu: Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
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
                        </TableRow>
                      </TableBody>
                    </Table>
                    <SalaryEmployeeTable
                      computed={computed}
                      updateEmployee={updateEmployee}
                      removeEmployee={removeEmployee}
                      onAddEmployee={addEmployee}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">成本与支出</CardTitle>
                    <CardDescription>左侧录入运营费用、成本与五险一金，右侧查看支出汇总</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 lg:grid-cols-6 lg:items-start">
                      <div className={EXPENSE_TOP_BLOCK}>
                        <LineItemTable
                          title="运营费用"
                          description="计入支出总计"
                          rows={sheet.operating}
                          addLabel="添加项目"
                          onAdd={() =>
                            patchSheet(month, {
                              ...sheet,
                              operating: [...sheet.operating, createOperatingLine()],
                            })
                          }
                          onUpdate={(idx, patch) => {
                            const operating = sheet.operating.map((c, i) =>
                              i === idx ? { ...c, ...patch } : c,
                            );
                            patchSheet(month, { ...sheet, operating });
                          }}
                          onRemove={(idx) => {
                            patchSheet(month, {
                              ...sheet,
                              operating: sheet.operating.filter((_, i) => i !== idx),
                            });
                          }}
                        />
                      </div>

                      <div className={EXPENSE_TOP_BLOCK}>
                        <LineItemTable
                          title="成本"
                          description="计入实收入扣减与支出汇总"
                          rows={getMergedCostRows(sheet).map((row) => row.line)}
                          addLabel="添加项目"
                          onAdd={() =>
                            patchSheet(month, {
                              ...sheet,
                              costs: [...sheet.costs, createCostLine()],
                            })
                          }
                          onUpdate={(idx, patch) => {
                            const merged = getMergedCostRows(sheet);
                            const target = merged[idx];
                            if (!target) return;
                            if (target.source === "costs") {
                              const costs = sheet.costs.map((c, i) =>
                                i === target.index ? { ...c, ...patch } : c,
                              );
                              patchSheet(month, { ...sheet, costs });
                            } else {
                              const processing = sheet.processing.map((c, i) =>
                                i === target.index ? { ...c, ...patch } : c,
                              );
                              patchSheet(month, { ...sheet, processing });
                            }
                          }}
                          onRemove={(idx) => {
                            const merged = getMergedCostRows(sheet);
                            const target = merged[idx];
                            if (!target) return;
                            if (target.source === "costs") {
                              patchSheet(month, {
                                ...sheet,
                                costs: sheet.costs.filter((_, i) => i !== target.index),
                              });
                            } else {
                              patchSheet(month, {
                                ...sheet,
                                processing: sheet.processing.filter((_, i) => i !== target.index),
                              });
                            }
                          }}
                        />
                      </div>

                      <div className={cn(EXPENSE_TOP_BLOCK, "lg:sticky lg:top-20")}>
                        <ExpenseFooterSummary computed={computed} />
                      </div>

                      <div className="col-span-6 min-w-0">
                        <InsuranceFundTable
                          insurance={sheet.insurance}
                          housingFund={sheet.housingFund}
                          onInsuranceChange={(patch) =>
                            patchSheet(month, {
                              ...sheet,
                              insurance: { ...sheet.insurance, ...patch },
                            })
                          }
                          onHousingChange={(patch) =>
                            patchSheet(month, {
                              ...sheet,
                              housingFund: { ...sheet.housingFund, ...patch },
                            })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
  