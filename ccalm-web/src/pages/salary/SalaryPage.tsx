import * as React from "react";
import { Navigate } from "react-router-dom";
import dayjs from "dayjs";
import { Plus, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  createDefaultSalarySheet,
  createEmptyEmployee,
  calendarDaysForMonth,
  formatSalaryMonthTab,
  isSalarySheetData,
  normalizeSalarySheet,
  previousSalaryMonth,
} from "@/lib/salary/defaults";
import type {
  SalaryCostItems,
  SalaryEmployeeInput,
  SalaryHousingFundInput,
  SalaryInsuranceInput,
  SalarySheetData,
} from "@/lib/salary/types";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { hasSalaryUnlockToken, setSalaryUnlockToken } from "@/lib/salary-unlock";
import { useAuth } from "@/lib/use-auth";
import { DatePickerField } from "@/components/date-picker-field";
import { SalaryUnlockDialog } from "@/components/salary-unlock-dialog";

/** 表格内奖金类型选项 */
type BonusModeOption = (typeof BONUS_MODE_OPTIONS)[number];

type SalarySheetComputed = ReturnType<typeof computeSalarySheet>;

function sumActualReceiptTotal(computed: SalarySheetComputed): number {
  return round2(
    computed.employees.reduce((sum, row) => sum + row.actualReceipt, 0),
  );
}

function SalarySummaryTable({
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
  function patchCostItem(key: keyof SalaryCostItems, raw: string) {
    patchSheet(month, {
      ...sheet,
      costItems: {
        ...sheet.costItems,
        [key]: Number(raw) || 0,
      },
    });
  }

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
          <TableHead>五险一金</TableHead>
          <TableHead>员工</TableHead>
          <TableHead>成本总计</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>
            <Input
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
            <Input
              value={sheet.costItems.utilities}
              onChange={(e) => patchCostItem("utilities", e.target.value)}
            />
          </TableCell>
          <TableCell>
            <Input
              value={sheet.costItems.rent}
              onChange={(e) => patchCostItem("rent", e.target.value)}
            />
          </TableCell>
          <TableCell>
            <Input
              value={sheet.costItems.materials}
              onChange={(e) => patchCostItem("materials", e.target.value)}
            />
          </TableCell>
          <TableCell>
            <Input
              value={sheet.costItems.planting}
              onChange={(e) => patchCostItem("planting", e.target.value)}
            />
          </TableCell>
          <TableCell>
            <Input
              value={sheet.costItems.processing}
              onChange={(e) => patchCostItem("processing", e.target.value)}
            />
          </TableCell>
          <TableCell>
            <Input
              value={sheet.costItems.other}
              onChange={(e) => patchCostItem("other", e.target.value)}
            />
          </TableCell>
          <TableCell>{computed.insuranceEmployerTotal}</TableCell>
          <TableCell>{computed.employeePayrollTotal}</TableCell>
          <TableCell>{computed.costGrandTotal}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
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
              <Input
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

function NumInput(props: { value: number; onChange: (n: number) => void }) {
  const { value, onChange } = props;
  return (
    <Input
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
  );
}

function RatePercentInput(props: { value: number; onChange: (ratio: number) => void }) {
  const { value, onChange } = props;
  const display = Number.isFinite(value) ? Math.round(value * 1000) / 10 : 0;
  return (
    <Input
      value={display}
      onChange={(e) => onChange((Number(e.target.value) || 0) / 100)}
    />
  );
}

function SalaryOutlineIconButton({
  onClick,
  children,
  "aria-label": ariaLabel,
}: {
  onClick: () => void;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-8"
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function computeWithCarryover(
  month: string,
  sheet: SalarySheetData,
  sheets: Record<string, SalarySheetData>,
): ReturnType<typeof computeSalarySheet> {
  const monthKeys = Object.keys(sheets);
  return computeSalarySheet(sheet, {
    priorBonusByName: buildPriorBonusMap(month, sheets, (m) =>
      previousSalaryMonth(m, monthKeys),
    ),
  });
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
          <TableCell rowSpan={groupLines.length}>{line.groupLabel}</TableCell>
        ) : null}
        <TableCell>{line.label}</TableCell>
        <TableCell>
          <NumInput value={line.base} onChange={patchBase} />
        </TableCell>
        <TableCell>
          <RatePercentInput
            value={line.employerRate}
            onChange={(rate) => patchEmployer({ rate })}
          />
        </TableCell>
        <TableCell>
          <NumInput
            value={line.employerCount}
            onChange={(count) => patchEmployer({ count })}
          />
        </TableCell>
        <TableCell>{line.employerSubtotal}</TableCell>
        <TableCell>
          {line.personalRate != null ? (
            <RatePercentInput
              value={line.personalRate}
              onChange={(rate) => patchPersonal({ rate })}
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>
          {line.personalCount != null ? (
            <NumInput
              value={line.personalCount}
              onChange={(count) => patchPersonal({ count })}
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>
          {line.personalSubtotal != null ? (
            line.personalSubtotal
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>{line.rowTotal}</TableCell>
        {rowIndex === 0 ? (
          <TableCell rowSpan={groupLines.length}>{groupTotal}</TableCell>
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
    <Table className="table-fixed">
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
              <TableCell>公积金</TableCell>
              <TableCell>{housingLine.label}</TableCell>
              <TableCell>
                <NumInput
                  value={housingLine.base}
                  onChange={(base) => onHousingChange({ base })}
                />
              </TableCell>
              <TableCell>
                <RatePercentInput
                  value={housingLine.employerRate}
                  onChange={(employerRate) => onHousingChange({ employerRate })}
                />
              </TableCell>
              <TableCell>
                <NumInput
                  value={housingLine.employerCount}
                  onChange={(employerCount) => onHousingChange({ employerCount })}
                />
              </TableCell>
              <TableCell>{housingLine.employerSubtotal}</TableCell>
              <TableCell>
                <RatePercentInput
                  value={housingLine.personalRate!}
                  onChange={(personalRate) => onHousingChange({ personalRate })}
                />
              </TableCell>
              <TableCell>
                <NumInput
                  value={housingLine.personalCount!}
                  onChange={(personalCount) => onHousingChange({ personalCount })}
                />
              </TableCell>
              <TableCell>{housingLine.personalSubtotal!}</TableCell>
              <TableCell>{housingLine.rowTotal}</TableCell>
              <TableCell>{groupTotals.housing}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
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
  const [months, setMonths] = React.useState<string[]>([]);
  const [activeMonth, setActiveMonth] = React.useState("");
  const [addMonthOpen, setAddMonthOpen] = React.useState(false);
  const [addMonthValue, setAddMonthValue] = React.useState("");
  const [deleteMonthOpen, setDeleteMonthOpen] = React.useState(false);
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
    setMonths([]);
    setActiveMonth("");
  }, []);

  const reloadMonths = React.useCallback(async () => {
    const list = await api<string[]>("GET", "/salary/months", undefined, salaryApi);
    setMonths(list);
    setActiveMonth((prev) => {
      if (prev && list.includes(prev)) return prev;
      return list[list.length - 1] ?? "";
    });
    return list;
  }, []);

  React.useEffect(() => {
    if (!salaryUnlocked) return;
    void reloadMonths().catch((e) => {
      if (handleSalaryAccessError(e, lockSalary)) return;
      toast.error(errorMessage(e));
    });
  }, [salaryUnlocked, reloadMonths, lockSalary]);

  const loadMonth = React.useCallback(
    async (month: string) => {
      if (!month || sheets[month]) return;
      setLoadingMonth(month);
      try {
        const data = await fetchMonth(month);
        setSheets((prev) => ({ ...prev, [month]: data }));

        const prev = previousSalaryMonth(month, Object.keys(sheets));
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

  async function addMonth() {
    const month = addMonthValue.trim();
    if (!month) {
      toast.error("请选择月份");
      return;
    }
    if (months.includes(month)) {
      toast.error("该月份已存在");
      return;
    }
    try {
      const data = createDefaultSalarySheet(month);
      await api("PUT", `/salary/${month}`, { data }, salaryApi);
      setSheets((prev) => ({ ...prev, [month]: data }));
      setMonths((prev) => [...prev, month].sort());
      setActiveMonth(month);
      setAddMonthOpen(false);
      setAddMonthValue("");
      toast.success("已添加");
    } catch (e) {
      if (handleSalaryAccessError(e, lockSalary)) return;
      toast.error(errorMessage(e));
    }
  }

  async function deleteMonth() {
    if (!activeMonth) return;
    const month = activeMonth;
    try {
      await api("DELETE", `/salary/${month}`, undefined, salaryApi);
      setSheets((prev) => {
        const next = { ...prev };
        delete next[month];
        return next;
      });
      const nextMonths = months.filter((m) => m !== month);
      setMonths(nextMonths);
      setActiveMonth(nextMonths[nextMonths.length - 1] ?? "");
      setDeleteMonthOpen(false);
      toast.success("已删除");
    } catch (e) {
      if (handleSalaryAccessError(e, lockSalary)) return;
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
      <Tabs value={activeMonth} onValueChange={setActiveMonth} className="gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 w-full">
            {months.length > 0 ? (
              <TabsList>
                {months.map((month) => (
                  <TabsTrigger key={month} value={month}>
                    {formatSalaryMonthTab(month)}
                  </TabsTrigger>
                ))}
              </TabsList>
            ) : null}
          </div>
          <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
            {saving ? (
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Spinner className="size-4" /> 保存中…
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddMonthValue(dayjs().format("YYYY-MM"));
                setAddMonthOpen(true);
              }}
            >
              <Plus className="size-3.5" />
              添加
            </Button>
            {activeMonth ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteMonthOpen(true)}
              >
                <X className="size-3.5" />
                删除
              </Button>
            ) : null}
            {sheet && activeMonth ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const data = createDefaultSalarySheet(activeMonth);
                  patchSheet(activeMonth, data);
                  toast.success("已恢复为默认");
                }}
              >
                <RotateCcw className="size-3.5" />
                默认
              </Button>
            ) : null}
          </div>
        </div>

        <Dialog open={addMonthOpen} onOpenChange={setAddMonthOpen}>
          <DialogContent
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              void addMonth();
            }}
          >
            <DialogHeader>
              <DialogTitle>添加</DialogTitle>
            </DialogHeader>
            <DatePickerField
              granularity="month"
              value={addMonthValue}
              onValueChange={setAddMonthValue}
              placeholder="选择月份"
            />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setAddMonthOpen(false)}>
                取消
              </Button>
              <Button type="button" onClick={() => void addMonth()}>
                确定
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteMonthOpen} onOpenChange={setDeleteMonthOpen}>
          <AlertDialogContent
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              void deleteMonth();
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>删除</AlertDialogTitle>
              <AlertDialogDescription>
                将删除 {activeMonth} 的薪资表及全部数据，此操作不可恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={() => void deleteMonth()}>
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {months.length === 0 ? (
          <div className="text-muted-foreground text-sm">暂无月份，请点击「添加」</div>
        ) : null}

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
                    <ScrollArea>
                      <div className="min-w-[1496px]">
                        <SalarySummaryTable
                          sheet={sheet}
                          computed={computed}
                          month={month}
                          patchSheet={patchSheet}
                        />
                        <SalaryEmployeeTable
                          computed={computed}
                          updateEmployee={updateEmployee}
                          removeEmployee={removeEmployee}
                          onAddEmployee={addEmployee}
                        />
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">五险一金</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea>
                      <div className="min-w-[1496px]">
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
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
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
  