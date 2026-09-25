import * as React from "react";
import { Navigate } from "react-router-dom";
import dayjs from "dayjs";
import { Plus, RotateCcw, Save, Settings, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
import { computeSalarySheet, buildPriorBonusMap } from "@/lib/salary/calc";
import {
  applyMonthCalendar,
  createEmptyEmployee,
  calendarDaysForMonth,
  clearMaterialLines,
  formatSalaryMonthTab,
  isSalarySheetData,
  normalizeSalarySheet,
  previousSalaryMonth,
  resolveDefaultSalarySheet,
} from "@/lib/salary/defaults";
import {
  fetchLeaveQuotasFromSchedule,
} from "@/lib/salary/schedule-leave";
import type {
  SalaryEmployeeInput,
  SalaryEquipmentInstallment,
  SalaryGlobalSettings,
  SalaryLeaveQuotas,
  SalaryOtherCostItem,
  SalarySheetData,
} from "@/lib/salary/types";
import {
  createDefaultSalaryGlobalSettings,
  normalizeSalaryGlobalSettings,
  receiptTierLabels,
} from "@/lib/salary/settings";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { hasSalaryUnlockToken, setSalaryUnlockToken } from "@/lib/salary-unlock";
import { useAuth } from "@/lib/use-auth";
import { DatePickerField } from "@/components/date-picker-field";
import { SalaryUnlockDialog } from "@/components/salary-unlock-dialog";
import { InsuranceFundTable } from "./InsuranceFundTable";
import { SalaryEmployeeTable } from "./SalaryEmployeeTable";
import { SalarySummaryTable } from "./SalarySummaryTable";
import { NumInput, RatePercentInput } from "./salary-table-inputs";
import { SalaryTierRatesRow } from "./SalaryTierRatesRow";

const SALARY_LAST_MONTH_KEY = "salary_last_month";

function readLastSalaryMonth(): string {
  try {
    return localStorage.getItem(SALARY_LAST_MONTH_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeLastSalaryMonth(month: string) {
  try {
    if (!month) localStorage.removeItem(SALARY_LAST_MONTH_KEY);
    else localStorage.setItem(SALARY_LAST_MONTH_KEY, month);
  } catch {
    // ignore quota / private mode
  }
}

function sameLeaveQuotas(a: SalaryLeaveQuotas, b: SalaryLeaveQuotas): boolean {
  return a.chen === b.chen && a.lu === b.lu && a.xu === b.xu;
}

function listMissingPriorMonths(
  month: string,
  monthList: string[],
  loaded: Record<string, SalarySheetData>,
): string[] {
  const monthSet = new Set(monthList);
  const missing: string[] = [];
  let prev = previousSalaryMonth(month, monthSet);
  while (prev) {
    if (!loaded[prev]) missing.push(prev);
    prev = previousSalaryMonth(prev, monthSet);
  }
  return missing;
}

async function applyScheduleLeaveQuotas(
  month: string,
  sheet: SalarySheetData,
): Promise<SalarySheetData> {
  const quotas = await fetchLeaveQuotasFromSchedule(month);
  if (sameLeaveQuotas(sheet.leaveQuotas, quotas)) return sheet;
  return applyMonthCalendar({ ...sheet, leaveQuotas: quotas }, month);
}

function computeWithCarryover(
  month: string,
  sheet: SalarySheetData,
  sheets: Record<string, SalarySheetData>,
  monthList: string[],
  globalSettings: SalaryGlobalSettings,
): ReturnType<typeof computeSalarySheet> {
  return computeSalarySheet(sheet, {
    month,
    globalSettings,
    priorBonusByName: buildPriorBonusMap(month, sheets, (m) =>
      previousSalaryMonth(m, monthList),
      globalSettings,
    ),
  });
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

  return (
    <SalaryPageContent
      onLock={() => {
        setSalaryUnlockToken(null);
        setSalaryUnlocked(false);
      }}
    />
  );
}

function SalaryPageContent({ onLock }: { onLock: () => void }) {
  const [months, setMonths] = React.useState<string[]>([]);
  const [activeMonth, setActiveMonth] = React.useState("");
  const [addMonthOpen, setAddMonthOpen] = React.useState(false);
  const [addMonthValue, setAddMonthValue] = React.useState("");
  const [deleteMonthOpen, setDeleteMonthOpen] = React.useState(false);
  const [tierRateSettingsOpen, setTierRateSettingsOpen] = React.useState(false);
  const [globalSettings, setGlobalSettings] = React.useState<SalaryGlobalSettings>(
    createDefaultSalaryGlobalSettings,
  );
  const [settingsDraft, setSettingsDraft] = React.useState<SalaryGlobalSettings | null>(
    null,
  );
  const [sheets, setSheets] = React.useState<Record<string, SalarySheetData>>({});
  const sheetsRef = React.useRef(sheets);
  sheetsRef.current = sheets;
  const [defaultTemplate, setDefaultTemplate] = React.useState<SalarySheetData | null>(null);
  const [loadingMonth, setLoadingMonth] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const saveTimerRef = React.useRef<number | null>(null);
  const settingsSaveTimerRef = React.useRef<number | null>(null);

  const fetchMonth = React.useCallback(async (month: string, opts?: { persist?: boolean }) => {
    const persist = opts?.persist !== false;
    const res = await api<{ month: string; data: SalarySheetData }>(
      "GET",
      `/salary/${month}`,
      undefined,
      salaryApi,
    );
    const data = normalizeSalarySheet(res.data, month);
    const rawDays =
      isSalarySheetData(res.data) ? res.data.summary.daysInMonth : undefined;
    if (
      persist &&
      (!isSalarySheetData(res.data) || rawDays !== calendarDaysForMonth(month))
    ) {
      await api("PUT", `/salary/${month}`, { data }, salaryApi);
    }
    return data;
  }, []);

  const lockSalary = React.useCallback(() => {
    setSheets({});
    setDefaultTemplate(null);
    setMonths([]);
    setActiveMonth("");
    onLock();
  }, [onLock]);

  const reloadMonths = React.useCallback(async () => {
    const list = await api<string[]>("GET", "/salary/months", undefined, salaryApi);
    setMonths(list);
    setActiveMonth((prev) => {
      if (prev && list.includes(prev)) return prev;
      const remembered = readLastSalaryMonth();
      if (remembered && list.includes(remembered)) return remembered;
      return list[list.length - 1] ?? "";
    });
    return list;
  }, []);

  const reloadGlobalSettings = React.useCallback(async () => {
    const res = await api<{ data: unknown | null }>(
      "GET",
      "/salary/settings",
      undefined,
      salaryApi,
    );
    const normalized = normalizeSalaryGlobalSettings(res.data);
    setGlobalSettings(normalized);
    return normalized;
  }, []);

  const reloadDefaultTemplate = React.useCallback(async () => {
    const res = await api<{ data: unknown | null }>(
      "GET",
      "/salary/default",
      undefined,
      salaryApi,
    );
    if (res.data == null) {
      setDefaultTemplate(null);
      return null;
    }
    const template = normalizeSalarySheet(res.data, dayjs().format("YYYY-MM"));
    setDefaultTemplate(template);
    return template;
  }, []);

  React.useEffect(() => {
    void (async () => {
      try {
        await Promise.all([reloadMonths(), reloadDefaultTemplate(), reloadGlobalSettings()]);
      } catch (e) {
        if (handleSalaryAccessError(e, lockSalary)) return;
        toast.error(errorMessage(e));
      }
    })();
  }, [reloadMonths, reloadDefaultTemplate, reloadGlobalSettings, lockSalary]);

  const refreshScheduleLeaveQuotas = React.useCallback(
    async (month: string) => {
      const quotas = await fetchLeaveQuotasFromSchedule(month);
      setSheets((prev) => {
        const sheet = prev[month];
        if (!sheet || sameLeaveQuotas(sheet.leaveQuotas, quotas)) return prev;
        const data = applyMonthCalendar({ ...sheet, leaveQuotas: quotas }, month);
        void api("PUT", `/salary/${month}`, { data }, salaryApi).catch((e) => {
          if (handleSalaryAccessError(e, lockSalary)) return;
          toast.error(errorMessage(e));
        });
        return { ...prev, [month]: data };
      });
    },
    [lockSalary],
  );

  const loadMissingPriorSheets = React.useCallback(
    async (month: string, baseSheets: Record<string, SalarySheetData>) => {
      if (!month || months.length === 0) return baseSheets;

      const monthSet = new Set(months);
      let merged = { ...baseSheets };
      let prev = previousSalaryMonth(month, monthSet);
      while (prev && !merged[prev]) {
        try {
          // 历史月只读缓存，配额变化不回写，避免打开当前月时链式写库
          const data = await fetchMonth(prev, { persist: false });
          const withQuotas = await applyScheduleLeaveQuotas(prev, data);
          merged = { ...merged, [prev]: withQuotas };
        } catch {
          break;
        }
        prev = previousSalaryMonth(prev, monthSet);
      }
      return merged;
    },
    [fetchMonth, months],
  );

  const loadMonth = React.useCallback(
    async (month: string) => {
      if (!month) return;
      const sheetsNow = sheetsRef.current;
      if (
        sheetsNow[month] &&
        listMissingPriorMonths(month, months, sheetsNow).length === 0
      ) {
        return;
      }
      setLoadingMonth(month);
      try {
        let merged = { ...sheetsNow };
        if (!merged[month]) {
          const data = await fetchMonth(month);
          const withQuotas = await applyScheduleLeaveQuotas(month, data);
          merged = { ...merged, [month]: withQuotas };
          if (!sameLeaveQuotas(data.leaveQuotas, withQuotas.leaveQuotas)) {
            await api("PUT", `/salary/${month}`, { data: withQuotas }, salaryApi);
          }
        }
        merged = await loadMissingPriorSheets(month, merged);
        sheetsRef.current = merged;
        setSheets(merged);
      } catch (e) {
        if (handleSalaryAccessError(e, lockSalary)) return;
        const err = e as { status?: number };
        if (err.status === 404) {
          let data = resolveDefaultSalarySheet(month, defaultTemplate);
          data = await applyScheduleLeaveQuotas(month, data);
          const merged = await loadMissingPriorSheets(month, {
            ...sheetsRef.current,
            [month]: data,
          });
          sheetsRef.current = merged;
          setSheets(merged);
          await api("PUT", `/salary/${month}`, { data }, salaryApi);
        } else {
          toast.error(errorMessage(e));
        }
      } finally {
        setLoadingMonth((m) => (m === month ? null : m));
      }
    },
    [defaultTemplate, fetchMonth, loadMissingPriorSheets, lockSalary, months],
  );

  React.useEffect(() => {
    if (activeMonth) void refreshScheduleLeaveQuotas(activeMonth);
  }, [activeMonth, refreshScheduleLeaveQuotas]);

  React.useEffect(() => {
    if (activeMonth) writeLastSalaryMonth(activeMonth);
  }, [activeMonth]);

  React.useEffect(() => {
    if (activeMonth) void loadMonth(activeMonth);
  }, [activeMonth, loadMonth]);

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

  const patchGlobalSettings = React.useCallback(
    (patch: Partial<SalaryGlobalSettings>) => {
      setGlobalSettings((prev) => {
        const next = normalizeSalaryGlobalSettings({ ...prev, ...patch });
        if (settingsSaveTimerRef.current) window.clearTimeout(settingsSaveTimerRef.current);
        settingsSaveTimerRef.current = window.setTimeout(() => {
          setSaving(true);
          void api("PUT", "/salary/settings", { data: next }, salaryApi)
            .catch((e) => {
              if (handleSalaryAccessError(e, lockSalary)) return;
              toast.error(errorMessage(e));
            })
            .finally(() => setSaving(false));
        }, 600);
        return next;
      });
    },
    [lockSalary],
  );

  const sheet = activeMonth ? sheets[activeMonth] : undefined;
  const computed =
    sheet && activeMonth
      ? computeWithCarryover(activeMonth, sheet, sheets, months, globalSettings)
      : null;

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

  function openTierRateSettings() {
    setSettingsDraft({
      ...globalSettings,
      equipmentInstallments: globalSettings.equipmentInstallments.map((plan) => ({
        ...plan,
      })),
      otherCostItems: globalSettings.otherCostItems.map((item) => ({ ...item })),
    });
    setTierRateSettingsOpen(true);
  }

  async function confirmTierRateSettings() {
    if (!settingsDraft) return;
    const next = normalizeSalaryGlobalSettings(settingsDraft);
    try {
      await api("PUT", "/salary/settings", { data: next }, salaryApi);
      setGlobalSettings(next);
      setTierRateSettingsOpen(false);
      toast.success("已保存");
    } catch (e) {
      if (handleSalaryAccessError(e, lockSalary)) return;
      toast.error(errorMessage(e));
    }
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
      let data = resolveDefaultSalarySheet(month, defaultTemplate);
      data = await applyScheduleLeaveQuotas(month, data);
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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-4">
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
          <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 md:w-auto">
            {saving ? (
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Spinner className="size-4" /> 保存中…
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={openTierRateSettings}
            >
              <Settings className="size-3.5" />
              设置
            </Button>
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
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void (async () => {
                      try {
                        const data = clearMaterialLines(
                          normalizeSalarySheet(sheet, activeMonth),
                        );
                        await api(
                          "PUT",
                          "/salary/default",
                          { data },
                          salaryApi,
                        );
                        setDefaultTemplate(data);
                        toast.success("已设为默认");
                      } catch (e) {
                        if (handleSalaryAccessError(e, lockSalary)) return;
                        toast.error(errorMessage(e));
                      }
                    })();
                  }}
                >
                  <Save className="size-3.5" />
                  设为默认
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void (async () => {
                      let data = resolveDefaultSalarySheet(
                        activeMonth,
                        defaultTemplate,
                      );
                      data = await applyScheduleLeaveQuotas(activeMonth, data);
                      patchSheet(activeMonth, data);
                      toast.success("已恢复为默认");
                    })();
                  }}
                >
                  <RotateCcw className="size-3.5" />
                  恢复默认
                </Button>
              </>
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

        <Dialog open={tierRateSettingsOpen} onOpenChange={setTierRateSettingsOpen}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>设置</DialogTitle>
            </DialogHeader>
            {settingsDraft ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>实收扣减</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>医生扣减(%)</TableCell>
                      <TableCell>
                        <RatePercentInput
                          value={settingsDraft.doctorReceiptDeductionRate}
                          onChange={(doctorReceiptDeductionRate) =>
                            setSettingsDraft((prev) =>
                              prev
                                ? { ...prev, doctorReceiptDeductionRate }
                                : prev,
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>护士扣减(%)</TableCell>
                      <TableCell>
                        <RatePercentInput
                          value={settingsDraft.nurseDeductionRate}
                          onChange={(nurseDeductionRate) =>
                            setSettingsDraft((prev) =>
                              prev ? { ...prev, nurseDeductionRate } : prev,
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>陈美珍池比例(%)</TableCell>
                      <TableCell>
                        <RatePercentInput
                          value={settingsDraft.chenPoolBonusRate}
                          onChange={(chenPoolBonusRate) =>
                            setSettingsDraft((prev) =>
                              prev ? { ...prev, chenPoolBonusRate } : prev,
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>卢彤池比例(%)</TableCell>
                      <TableCell>
                        <RatePercentInput
                          value={settingsDraft.luPoolBonusRate}
                          onChange={(luPoolBonusRate) =>
                            setSettingsDraft((prev) =>
                              prev ? { ...prev, luPoolBonusRate } : prev,
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>许桦婧池比例(%)</TableCell>
                      <TableCell>
                        <RatePercentInput
                          value={settingsDraft.xuPoolBonusRate}
                          onChange={(xuPoolBonusRate) =>
                            setSettingsDraft((prev) =>
                              prev ? { ...prev, xuPoolBonusRate } : prev,
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>职称</TableHead>
                      {receiptTierLabels(settingsDraft.tierThresholds).map((label) => (
                        <TableHead key={label}>{label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SalaryTierRatesRow
                      label="执业医师"
                      rates={settingsDraft.docTierRates}
                      onChange={(docTierRates) =>
                        setSettingsDraft((prev) =>
                          prev ? { ...prev, docTierRates } : prev,
                        )
                      }
                    />
                    <SalaryTierRatesRow
                      label="助理医师"
                      rates={settingsDraft.asstTierRates}
                      onChange={(asstTierRates) =>
                        setSettingsDraft((prev) =>
                          prev ? { ...prev, asstTierRates } : prev,
                        )
                      }
                    />
                  </TableBody>
                </Table>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>种植单价</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>吴介尘</TableCell>
                      <TableCell>
                        <NumInput
                          value={settingsDraft.wuJiechenPlantingBonusPerUnit}
                          onChange={(wuJiechenPlantingBonusPerUnit) =>
                            setSettingsDraft((prev) =>
                              prev
                                ? { ...prev, wuJiechenPlantingBonusPerUnit }
                                : prev,
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>其他员工</TableCell>
                      <TableCell>
                        <NumInput
                          value={settingsDraft.plantingBonusPerUnit}
                          onChange={(plantingBonusPerUnit) =>
                            setSettingsDraft((prev) =>
                              prev ? { ...prev, plantingBonusPerUnit } : prev,
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>设备分期</TableHead>
                      <TableHead>总价</TableHead>
                      <TableHead>期数</TableHead>
                      <TableHead>起算月</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settingsDraft.equipmentInstallments.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <Input
                            value={plan.name}
                            onChange={(e) => {
                              const name = e.target.value;
                              setSettingsDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      equipmentInstallments: prev.equipmentInstallments.map(
                                        (row) =>
                                          row.id === plan.id ? { ...row, name } : row,
                                      ),
                                    }
                                  : prev,
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <NumInput
                            value={plan.totalAmount}
                            onChange={(totalAmount) =>
                              setSettingsDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      equipmentInstallments: prev.equipmentInstallments.map(
                                        (row) =>
                                          row.id === plan.id
                                            ? { ...row, totalAmount: Math.max(0, totalAmount) }
                                            : row,
                                      ),
                                    }
                                  : prev,
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <NumInput
                            value={plan.months}
                            onChange={(months) =>
                              setSettingsDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      equipmentInstallments: prev.equipmentInstallments.map(
                                        (row) =>
                                          row.id === plan.id
                                            ? {
                                                ...row,
                                                months: Math.max(1, Math.round(months) || 1),
                                              }
                                            : row,
                                      ),
                                    }
                                  : prev,
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="YYYY-MM"
                            value={plan.startMonth}
                            onChange={(e) => {
                              const startMonth = e.target.value;
                              setSettingsDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      equipmentInstallments: prev.equipmentInstallments.map(
                                        (row) =>
                                          row.id === plan.id ? { ...row, startMonth } : row,
                                      ),
                                    }
                                  : prev,
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              setSettingsDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      equipmentInstallments:
                                        prev.equipmentInstallments.filter(
                                          (row) => row.id !== plan.id,
                                        ),
                                    }
                                  : prev,
                              )
                            }
                          >
                            <X />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const next: SalaryEquipmentInstallment = {
                              id:
                                typeof crypto !== "undefined" && "randomUUID" in crypto
                                  ? crypto.randomUUID()
                                  : `eq-${Date.now()}`,
                              name: "",
                              totalAmount: 0,
                              months: 12,
                              startMonth: dayjs().format("YYYY-MM"),
                            };
                            setSettingsDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    equipmentInstallments: [
                                      ...prev.equipmentInstallments,
                                      next,
                                    ],
                                  }
                                : prev,
                            );
                          }}
                        >
                          <Plus data-icon="inline-start" />
                          添加设备分期
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>其他成本</TableHead>
                      <TableHead>费用</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settingsDraft.otherCostItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Input
                            value={item.name}
                            onChange={(e) => {
                              const name = e.target.value;
                              setSettingsDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      otherCostItems: prev.otherCostItems.map((row) =>
                                        row.id === item.id ? { ...row, name } : row,
                                      ),
                                    }
                                  : prev,
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <NumInput
                            value={item.amount}
                            onChange={(amount) =>
                              setSettingsDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      otherCostItems: prev.otherCostItems.map((row) =>
                                        row.id === item.id
                                          ? { ...row, amount: Math.max(0, amount) }
                                          : row,
                                      ),
                                    }
                                  : prev,
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              setSettingsDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      otherCostItems: prev.otherCostItems.filter(
                                        (row) => row.id !== item.id,
                                      ),
                                    }
                                  : prev,
                              )
                            }
                          >
                            <X />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const next: SalaryOtherCostItem = {
                              id:
                                typeof crypto !== "undefined" && "randomUUID" in crypto
                                  ? crypto.randomUUID()
                                  : `oc-${Date.now()}`,
                              name: "",
                              amount: 0,
                            };
                            setSettingsDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    otherCostItems: [...prev.otherCostItems, next],
                                  }
                                : prev,
                            );
                          }}
                        >
                          <Plus data-icon="inline-start" />
                          添加其他成本
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setTierRateSettingsOpen(false)}
              >
                取消
              </Button>
              <Button type="button" onClick={() => void confirmTierRateSettings()}>
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
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Skeleton key={index} className="h-8 w-full" />
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {sheet && computed && month === activeMonth ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>员工薪资</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea>
                      <div className="min-w-[1768px]">
                        <SalarySummaryTable
                          sheet={sheet}
                          computed={computed}
                          month={month}
                          patchSheet={patchSheet}
                          otherCostItems={globalSettings.otherCostItems}
                        />
                        <SalaryEmployeeTable
                          computed={computed}
                          globalSettings={globalSettings}
                          patchGlobalSettings={patchGlobalSettings}
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
                      <div className="min-w-[1768px]">
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
  