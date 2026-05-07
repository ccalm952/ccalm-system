import * as React from "react";
import dayjs from "dayjs";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerField, DateRangePickerField } from "@/components/date-picker-field";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { toast } from "sonner";

type Row = {
  patientId: number;
  patientName: string;
  phone: string;
  chartNo?: string;
  birthday?: string | null;
  age?: number | null;
  visitId: number;
  visitDate: string;
  remark: string | null;
  staff: string | null;
  toothId: number | null;
  toothNo: string | null;
  implantBrand: string | null;
  implantModel: string | null;
  toothRemark: string | null;
};

/** 种植记录：新增与编辑共用同一弹层；编辑带合并组内全部牙位行 */
type ImplantRecordsVisitDialogState = { type: "add" } | { type: "edit"; group: Row[] };

type EditTeethLine = {
  toothId: number | null;
  toothNo: string;
  implantBrand: string;
  implantModel: string;
  toothRemark: string;
};

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 与 TanStack 泛型签名一致
  interface TableMeta<TData> {
    mergeSpans: number[];
    selection: Set<number>;
    toggleSel: (i: number) => void;
    selectAllRows: () => void;
    clearSelection: () => void;
  }
}

const MERGED_COLUMN_IDS = new Set(["patientName", "phone", "visitDate", "remark", "staff", "edit"]);

function defaultDateRange(): { from: string; to: string } {
  const start = dayjs().startOf("month");
  const end = dayjs().endOf("month");
  return { from: start.format("YYYY-MM-DD"), to: end.format("YYYY-MM-DD") };
}

function rowMergeKey(row: Row) {
  return `${row.patientName}\n${row.phone}\n${row.visitDate}`;
}

function computeMergeSpans(rows: Row[]) {
  if (!rows.length) return [];
  const span = Array.from({ length: rows.length }, () => 1);
  let i = 0;
  while (i < rows.length) {
    const key = rowMergeKey(rows[i]!);
    let j = i + 1;
    while (j < rows.length && rowMergeKey(rows[j]!) === key) j++;
    const len = j - i;
    for (let k = i; k < j; k++) span[k] = k === i ? len : 0;
    i = j;
  }
  return span;
}

/** 与表格合并规则一致：同一姓名+手机+就诊日的连续行视为同一次就诊的多条牙位 */
function rowsInSameMergeGroup(allRows: Row[], clicked: Row): Row[] {
  const key = rowMergeKey(clicked);
  const i = allRows.findIndex(
    (r) => r.visitId === clicked.visitId && r.toothId === clicked.toothId,
  );
  if (i < 0) return [clicked];
  let start = i;
  while (start > 0 && rowMergeKey(allRows[start - 1]!) === key) start--;
  let end = i;
  while (end + 1 < allRows.length && rowMergeKey(allRows[end + 1]!) === key) end++;
  return allRows.slice(start, end + 1);
}

/** 二期列展示：就诊日期 + remark（月数）→ 预计二期日期 */
function phase2DisplayDate(visitDate: string, remarkMonths: string | null): string {
  const m = remarkMonths?.trim();
  if (!m || !/^\d+$/.test(m)) return "";
  const n = parseInt(m, 10);
  if (!Number.isFinite(n) || n < 0) return "";
  const d = dayjs(visitDate).add(n, "month");
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
}

type AddToothRow = {
  toothNo: string;
  implantBrand: string;
  implantModel: string;
  toothRemark: string;
};

type AddSuggestion = {
  id: number;
  name: string;
  phone: string;
  source: string;
  birthday?: string;
  age?: number;
};

type InvInventoryRow = {
  brand: string;
};

function ToothBrandCombobox({
  brands,
  value,
  onValueChange,
  className,
  inputAriaLabel,
}: {
  brands: string[];
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  inputAriaLabel?: string;
}) {
  return (
    <Combobox items={brands} value={value || null} onValueChange={(v) => onValueChange(v ?? "")}>
      <ComboboxInput showTrigger={false} className={className} aria-label={inputAriaLabel} />
      <ComboboxContent>
        <ComboboxEmpty>库存中暂无品牌</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function addVisitTodayStr() {
  return dayjs().format("YYYY-MM-DD");
}

function ImplantRecordsVisitDialog({
  state,
  onOpenChange,
  onSaved,
}: {
  state: ImplantRecordsVisitDialogState | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  /** 关闭瞬间 state 已为 null，但弹层退出动画仍会渲染子树；用 surface 模式避免误切到「新增」一帧 */
  const [dialogSurfaceMode, setDialogSurfaceMode] = React.useState<"add" | "edit">("add");
  React.useEffect(() => {
    if (state != null) setDialogSurfaceMode(state.type);
  }, [state]);

  const open = state !== null;
  const isEdit = state != null ? state.type === "edit" : dialogSurfaceMode === "edit";

  const [visitDate, setVisitDate] = React.useState(addVisitTodayStr);
  const [patientName, setPatientName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [chartNo, setChartNo] = React.useState("");
  const [birthday, setBirthday] = React.useState("");
  const [age, setAge] = React.useState<string>("");
  const [staff, setStaff] = React.useState("");
  const [remark, setRemark] = React.useState("");

  const [teeth, setTeeth] = React.useState<AddToothRow[]>([
    { toothNo: "", implantBrand: "", implantModel: "", toothRemark: "" },
  ]);

  const [inventoryBrands, setInventoryBrands] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!open || (state?.type !== "add" && state?.type !== "edit")) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await api<InvInventoryRow[]>("GET", "/implant/inventory");
        const uniq = new Set<string>();
        for (const r of rows ?? []) {
          const b = r.brand?.trim();
          if (b) uniq.add(b);
        }
        if (!cancelled)
          setInventoryBrands([...uniq].sort((a, b) => a.localeCompare(b, "zh-Hans-CN")));
      } catch {
        if (!cancelled) setInventoryBrands([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, state?.type]);

  const [suggestions, setSuggestions] = React.useState<AddSuggestion[]>([]);
  /** 从列表选中患者后为 true，收起下拉；用户再次编辑姓名时置回 false */
  const [suggestListDismissed, setSuggestListDismissed] = React.useState(false);
  const suggestTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const nameSuggestRootRef = React.useRef<HTMLDivElement>(null);
  const nameSuggestInputRef = React.useRef<HTMLInputElement>(null);
  const nameSuggestOpen = Boolean(patientName.trim()) && !suggestListDismissed;

  const resetForm = React.useCallback(() => {
    setVisitDate(addVisitTodayStr());
    setPatientName("");
    setPhone("");
    setChartNo("");
    setBirthday("");
    setAge("");
    setStaff("");
    setRemark("");
    setTeeth([{ toothNo: "", implantBrand: "", implantModel: "", toothRemark: "" }]);
    setSuggestListDismissed(false);
    setSuggestions([]);
  }, []);

  React.useEffect(() => {
    if (!open || state?.type !== "add") return;
    resetForm();
  }, [open, state?.type, resetForm]);

  const editRowRef = React.useRef<Row | null>(null);
  const [editForm, setEditForm] = React.useState({
    patientName: "",
    phone: "",
    chartNo: "",
    birthday: "",
    age: "",
    visitDate: "",
    remark: "",
    staff: "",
  });
  const [editTeeth, setEditTeeth] = React.useState<EditTeethLine[]>([]);
  const [editPendingDeletes, setEditPendingDeletes] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (!open) {
      setEditPendingDeletes([]);
    }
  }, [open]);

  React.useLayoutEffect(() => {
    if (state?.type !== "edit") return;
    const group = state.group;
    const row = group[0];
    if (!row) return;
    editRowRef.current = row;
    setEditPendingDeletes([]);
    setEditForm({
      patientName: row.patientName || "",
      phone: row.phone || "",
      chartNo: row.chartNo ?? "",
      birthday: row.birthday?.trim() ?? "",
      age: row.age != null && !Number.isNaN(Number(row.age)) ? String(row.age) : "",
      visitDate: row.visitDate || "",
      remark: row.remark || "",
      staff: row.staff || "",
    });
    setEditTeeth(
      group.map((r) => ({
        toothId: r.toothId,
        toothNo: r.toothNo ?? "",
        implantBrand: r.implantBrand ?? "",
        implantModel: r.implantModel ?? "",
        toothRemark: r.toothRemark ?? "",
      })),
    );
  }, [state]);

  /**
   * 仅当焦点仍在姓名「输入框」本身时保持列表；同一块里的清空按钮、cmdk 列表高亮等不算在输入框内。
   */
  const dismissNameSuggestIfNotTyping = React.useCallback(() => {
    window.setTimeout(() => {
      const input = nameSuggestInputRef.current;
      const ae = document.activeElement;
      if (input && ae instanceof Node && input.contains(ae)) return;
      setSuggestListDismissed(true);
    }, 0);
  }, []);

  React.useEffect(() => {
    if (!nameSuggestOpen) return;
    function onPointerDown(e: PointerEvent) {
      const root = nameSuggestRootRef.current;
      const t = e.target;
      if (!(t instanceof Node) || !root || root.contains(t)) return;
      setSuggestListDismissed(true);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [nameSuggestOpen]);

  /** Tab / 程序性焦点变化时，blur 可能不触发，用 focusin 再收一层 */
  React.useEffect(() => {
    if (!nameSuggestOpen) return;
    function onFocusIn() {
      dismissNameSuggestIfNotTyping();
    }
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [nameSuggestOpen, dismissNameSuggestIfNotTyping]);

  React.useEffect(() => {
    const q = patientName.trim();
    clearTimeout(suggestTimer.current);
    if (!q) {
      setSuggestions([]);
      return;
    }
    suggestTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await api<{ list: AddSuggestion[] }>(
            "GET",
            `/implant/patient-list?keyword=${encodeURIComponent(q)}&pageSize=20`,
          );
          setSuggestions(res.list ?? []);
        } catch {
          setSuggestions([]);
        }
      })();
    }, 200);
    return () => clearTimeout(suggestTimer.current);
  }, [patientName]);

  function onBirthdayChange(val: string) {
    setBirthday(val);
    if (!val) {
      setAge("");
      return;
    }
    const birth = dayjs(val);
    if (!birth.isValid()) return;
    let a = dayjs().diff(birth, "year");
    const monthDiff = dayjs().month() - birth.month();
    if (monthDiff < 0 || (monthDiff === 0 && dayjs().date() < birth.date())) a--;
    setAge(String(a));
  }

  function onAgeChange(raw: string) {
    setAge(raw);
    const n = Number(raw);
    if (raw === "" || Number.isNaN(n)) {
      setBirthday("");
      return;
    }
    const ageInt = Math.min(150, Math.max(0, Math.floor(n)));
    setAge(String(ageInt));
    const birthYear = dayjs().year() - ageInt;
    setBirthday(`${birthYear}-01-01`);
  }

  function selectSuggestion(s: AddSuggestion) {
    setPatientName(s.name);
    setPhone(s.phone);
    setChartNo(s.source);
    setBirthday(s.birthday?.trim() ?? "");
    setAge(s.age != null && !Number.isNaN(Number(s.age)) ? String(s.age) : "");
    setSuggestions([]);
    setSuggestListDismissed(true);
  }

  function addToothRow() {
    setTeeth((t) => [...t, { toothNo: "", implantBrand: "", implantModel: "", toothRemark: "" }]);
  }

  function removeToothAt(index: number) {
    setTeeth((rows) => {
      if (rows.length <= 1) {
        return [{ toothNo: "", implantBrand: "", implantModel: "", toothRemark: "" }];
      }
      return rows.filter((_, i) => i !== index);
    });
  }

  const [saving, setSaving] = React.useState(false);

  async function submit() {
    const phase2 = remark.trim();
    if (phase2 && !/^\d+$/.test(phase2)) {
      toast.warning("二期只能填写数字（月数）");
      return;
    }
    const payloadTeeth = teeth.filter(
      (t) =>
        t.toothNo.trim() || t.implantModel.trim() || t.implantBrand.trim() || t.toothRemark.trim(),
    );
    if (!payloadTeeth.length) {
      toast.warning("请至少填写一条牙位与植体");
      return;
    }
    if (!patientName.trim()) {
      toast.warning("请填写姓名");
      return;
    }
    if (!phone.trim()) {
      toast.warning("请填写手机");
      return;
    }
    if (!chartNo.trim()) {
      toast.warning("请填写病历号");
      return;
    }
    setSaving(true);
    try {
      await api("POST", "/implant/visits", {
        phone: phone.trim(),
        patientName: patientName.trim(),
        chartNo: chartNo.trim(),
        birthday: birthday.trim() || null,
        age: age.trim() ? Number(age) : null,
        visitDate,
        remark: phase2 || null,
        staff: staff.trim() || null,
        followUp: null,
        teeth: payloadTeeth.map((t) => ({
          toothNo: t.toothNo.trim() || undefined,
          implantBrand: t.implantBrand.trim() || undefined,
          implantModel: t.implantModel.trim() || undefined,
          toothRemark: t.toothRemark.trim() || undefined,
        })),
      });
      toast.success("已保存");
      resetForm();
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function addEditToothRow() {
    setEditTeeth((r) => [
      ...r,
      { toothId: null, toothNo: "", implantBrand: "", implantModel: "", toothRemark: "" },
    ]);
  }

  function removeEditToothAt(index: number) {
    setEditTeeth((prevRows) => {
      const row = prevRows[index];
      const existingToothId = row?.toothId;
      if (existingToothId != null) {
        setEditPendingDeletes((d) => [...new Set([...d, existingToothId])]);
      }
      const next = prevRows.filter((_, i) => i !== index);
      return next.length
        ? next
        : [{ toothId: null, toothNo: "", implantBrand: "", implantModel: "", toothRemark: "" }];
    });
  }

  async function saveEdit() {
    const row0 = editRowRef.current;
    if (!row0) return;
    const phase2 = editForm.remark.trim();
    if (phase2 && !/^\d+$/.test(phase2)) {
      toast.warning("二期只能填写数字（月数）");
      return;
    }
    const payloadTeeth = editTeeth.filter(
      (t) =>
        t.toothNo.trim() || t.implantModel.trim() || t.implantBrand.trim() || t.toothRemark.trim(),
    );
    if (!payloadTeeth.length) {
      toast.warning("请至少填写一条牙位与植体");
      return;
    }
    setSaving(true);
    try {
      const visitId = row0.visitId;
      const patientId = row0.patientId;
      for (const t of editTeeth) {
        if (t.toothId != null) continue;
        if (
          !t.toothNo.trim() &&
          !t.implantModel.trim() &&
          !t.implantBrand.trim() &&
          !t.toothRemark.trim()
        )
          continue;
        await api("POST", `/implant/visits/${visitId}/teeth`, {
          toothNo: t.toothNo.trim() || undefined,
          implantBrand: t.implantBrand.trim() || undefined,
          implantModel: t.implantModel.trim() || undefined,
          toothRemark: t.toothRemark.trim() || undefined,
        });
      }
      for (const tid of new Set(editPendingDeletes)) {
        const q = `?toothId=${encodeURIComponent(String(tid))}`;
        await api("DELETE", `/implant/visits/${visitId}${q}`);
      }
      for (const t of editTeeth) {
        if (t.toothId == null) continue;
        if (
          !t.toothNo.trim() &&
          !t.implantModel.trim() &&
          !t.implantBrand.trim() &&
          !t.toothRemark.trim()
        )
          continue;
        await api("PUT", `/implant/visits/${visitId}`, {
          toothId: t.toothId,
          patientId,
          patientName: editForm.patientName,
          phone: editForm.phone,
          visitDate: editForm.visitDate,
          remark: editForm.remark || null,
          staff: editForm.staff || null,
          toothNo: t.toothNo.trim() || null,
          implantBrand: t.implantBrand.trim() || null,
          implantModel: t.implantModel.trim() || null,
          toothRemark: t.toothRemark.trim() || null,
        });
      }
      toast.success("已保存");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl" showCloseButton={false}>
        <FieldSet>
          {/* 自 FieldSet 起的完整结构（调间距时对照；默认值见 @/components/ui/field）：
              说明：FieldLegend 与 FieldDescription 是兄弟，都直接挂在 FieldSet（fieldset）下；
              说明不在 legend 内（legend 只放短标题）。DOM：fieldset > legend + p（说明）+ 表单大段。
              FieldSet          → 默认 flex flex-col gap-4，管「标题/说明/下面大段」之间的竖间距
              ├── FieldLegend   → 默认 mb-1.5（与下一兄弟的间距）
              ├── FieldDescription（新增与编辑各一段文案，二选一；与 Legend 同级）
              └── [编辑] 或 [新增] 根容器
                  └── div（flex flex-col gap-4）→ 主表单块 / 牙位块 / 保存行 三大段之间的间距
                      ├── FieldGroup      → 默认 flex flex-col gap-5
                      │   └── div（grid gap-4 sm:grid-cols-2）
                      │       └── Field（orientation=vertical）→ 默认 flex-col gap-2（标签与控件）
                      │           ├── FieldLabel
                      │           └── FieldContent → 默认内部 gap-0.5
                      │               └── Input | DatePickerField | …
                      │             （仅新增）姓名为 FieldContent → div.relative → Command
                      │               → CommandInput；展开时 CommandList（absolute）→ CommandGroup → CommandItem…
                      ├── div（flex flex-col gap-2）→ 牙位行列表
                      │       └── FieldGroup（每一行）
                      │           └── div（flex items-end gap-4）→ 栅格与删除钮（新增/编辑一致）
                      │               ├── div（min-w-0 flex-1）→ div（grid 四列 gap-4）→ Field×4
                      │               └── Button 删除
                      └── div（flex justify-end gap-2）→ 添加牙位 + 保存 Button
          */}
          <FieldLegend>{isEdit ? "编辑种植记录" : "新增种植记录"}</FieldLegend>
          {!isEdit ? (
            <FieldDescription>
              保存时写入患者库与种植就诊记录。姓名可从已有患者中搜索选择。
            </FieldDescription>
          ) : (
            <FieldDescription>
              病历号、出生日期、年龄为只读。牙位与植体与新增一致：可添加条目、行内删除；保存时先删已移除的牙位，再更新已有行并提交新行。
            </FieldDescription>
          )}
          {isEdit ? (
            <div className="flex flex-col gap-4">
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field orientation="vertical">
                    <FieldLabel>日期</FieldLabel>
                    <FieldContent>
                      <DatePickerField
                        value={editForm.visitDate}
                        onValueChange={(v) => setEditForm((s) => ({ ...s, visitDate: v }))}
                      />
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>姓名</FieldLabel>
                    <FieldContent>
                      <Input
                        value={editForm.patientName}
                        onChange={(e) =>
                          setEditForm((s) => ({ ...s, patientName: e.target.value }))
                        }
                      />
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>手机</FieldLabel>
                    <FieldContent>
                      <Input
                        value={editForm.phone}
                        onChange={(e) => setEditForm((s) => ({ ...s, phone: e.target.value }))}
                      />
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>病历号</FieldLabel>
                    <FieldContent>
                      <Input
                        value={editForm.chartNo}
                        readOnly
                        disabled
                        className="pointer-events-none bg-muted/40"
                        aria-readonly
                      />
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>出生日期</FieldLabel>
                    <FieldContent>
                      <DatePickerField
                        value={editForm.birthday}
                        onValueChange={() => {}}
                        disabled
                        captionLayout="dropdown"
                        placeholder=""
                      />
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>年龄</FieldLabel>
                    <FieldContent>
                      <Input
                        value={editForm.age}
                        readOnly
                        disabled
                        className="pointer-events-none bg-muted/40"
                        aria-readonly
                      />
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>人员</FieldLabel>
                    <FieldContent>
                      <Input
                        value={editForm.staff}
                        onChange={(e) => setEditForm((s) => ({ ...s, staff: e.target.value }))}
                      />
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>二期（月数）</FieldLabel>
                    <FieldContent>
                      <Input
                        value={editForm.remark}
                        onChange={(e) => setEditForm((s) => ({ ...s, remark: e.target.value }))}
                        placeholder="仅数字表示月数"
                      />
                    </FieldContent>
                  </Field>
                </div>
              </FieldGroup>

              <div className="flex flex-col gap-2">
                {editTeeth.map((t, i) => {
                  const showToothFieldLabels = i === 0;
                  return (
                    <FieldGroup key={`${String(t.toothId ?? "new")}-${i}`}>
                      <div className="flex min-w-0 items-end gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="grid min-w-[28rem] grid-cols-4 gap-4">
                            <Field orientation="vertical">
                              {showToothFieldLabels ? <FieldLabel>牙位</FieldLabel> : null}
                              <FieldContent>
                                <Input
                                  aria-label={showToothFieldLabels ? undefined : "牙位"}
                                  value={t.toothNo}
                                  onChange={(e) =>
                                    setEditTeeth((rows) =>
                                      rows.map((x, j) =>
                                        j === i ? { ...x, toothNo: e.target.value } : x,
                                      ),
                                    )
                                  }
                                />
                              </FieldContent>
                            </Field>
                            <Field orientation="vertical">
                              {showToothFieldLabels ? <FieldLabel>品牌</FieldLabel> : null}
                              <FieldContent>
                                <ToothBrandCombobox
                                  brands={inventoryBrands}
                                  value={t.implantBrand}
                                  onValueChange={(v) =>
                                    setEditTeeth((rows) =>
                                      rows.map((x, j) => (j === i ? { ...x, implantBrand: v } : x)),
                                    )
                                  }
                                  className="w-full"
                                  inputAriaLabel={showToothFieldLabels ? undefined : "品牌"}
                                />
                              </FieldContent>
                            </Field>
                            <Field orientation="vertical">
                              {showToothFieldLabels ? <FieldLabel>植体</FieldLabel> : null}
                              <FieldContent>
                                <Input
                                  aria-label={showToothFieldLabels ? undefined : "植体"}
                                  value={t.implantModel}
                                  onChange={(e) =>
                                    setEditTeeth((rows) =>
                                      rows.map((x, j) =>
                                        j === i ? { ...x, implantModel: e.target.value } : x,
                                      ),
                                    )
                                  }
                                />
                              </FieldContent>
                            </Field>
                            <Field orientation="vertical">
                              {showToothFieldLabels ? <FieldLabel>备注</FieldLabel> : null}
                              <FieldContent>
                                <Input
                                  aria-label={showToothFieldLabels ? undefined : "备注"}
                                  value={t.toothRemark}
                                  onChange={(e) =>
                                    setEditTeeth((rows) =>
                                      rows.map((x, j) =>
                                        j === i ? { ...x, toothRemark: e.target.value } : x,
                                      ),
                                    )
                                  }
                                />
                              </FieldContent>
                            </Field>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeEditToothAt(i)}
                          aria-label={`删除第 ${i + 1} 条牙位`}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </FieldGroup>
                  );
                })}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" onClick={addEditToothRow}>
                  添加牙位
                </Button>
                <Button type="button" disabled={saving} onClick={() => void saveEdit()}>
                  {saving ? "保存中…" : "保存"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field orientation="vertical">
                    <FieldLabel>日期</FieldLabel>
                    <FieldContent>
                      <DatePickerField value={visitDate} onValueChange={setVisitDate} />
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>姓名</FieldLabel>
                    <FieldContent>
                      <div ref={nameSuggestRootRef} className="relative">
                        <Command
                          shouldFilter={false}
                          label="搜索患者"
                          className="w-full overflow-visible rounded-none bg-transparent p-0 text-foreground shadow-none"
                        >
                          <CommandInput
                            ref={nameSuggestInputRef}
                            value={patientName}
                            onValueChange={(v) => {
                              setSuggestListDismissed(false);
                              setPatientName(v);
                            }}
                            onFocus={() => setSuggestListDismissed(false)}
                            onBlur={dismissNameSuggestIfNotTyping}
                            autoComplete="off"
                          />
                          {nameSuggestOpen ? (
                            <CommandList
                              className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 rounded-md border bg-popover text-popover-foreground shadow-md"
                              onMouseDown={(e) => {
                                e.preventDefault();
                              }}
                            >
                              <CommandEmpty>未找到匹配患者</CommandEmpty>
                              <CommandGroup>
                                {suggestions.map((s) => (
                                  <CommandItem
                                    key={s.id}
                                    value={`${s.id}-${s.name}-${s.phone}`}
                                    onSelect={() => selectSuggestion(s)}
                                  >
                                    <span>{s.name}</span>
                                    <span className="text-muted-foreground">
                                      {s.phone}
                                      {s.source ? ` · ${s.source}` : ""}
                                    </span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          ) : null}
                        </Command>
                      </div>
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>手机</FieldLabel>
                    <FieldContent>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>病历号</FieldLabel>
                    <FieldContent>
                      <Input value={chartNo} onChange={(e) => setChartNo(e.target.value)} />
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>出生日期</FieldLabel>
                    <FieldContent>
                      <DatePickerField
                        value={birthday}
                        onValueChange={onBirthdayChange}
                        captionLayout="dropdown"
                        placeholder=""
                      />
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>年龄</FieldLabel>
                    <FieldContent>
                      <Input value={age} onChange={(e) => onAgeChange(e.target.value)} />
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>人员</FieldLabel>
                    <FieldContent>
                      <Input value={staff} onChange={(e) => setStaff(e.target.value)} />
                    </FieldContent>
                  </Field>
                  <Field orientation="vertical">
                    <FieldLabel>二期（月数）</FieldLabel>
                    <FieldContent>
                      <Input value={remark} onChange={(e) => setRemark(e.target.value)} />
                    </FieldContent>
                  </Field>
                </div>
              </FieldGroup>

              <div className="flex flex-col gap-2">
                {teeth.map((row, i) => {
                  const showToothFieldLabels = i === 0;
                  return (
                    <FieldGroup key={i}>
                      <div className="flex min-w-0 items-end gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="grid min-w-[28rem] grid-cols-4 gap-4">
                            <Field orientation="vertical">
                              {showToothFieldLabels ? <FieldLabel>牙位</FieldLabel> : null}
                              <FieldContent>
                                <Input
                                  aria-label={showToothFieldLabels ? undefined : "牙位"}
                                  value={row.toothNo}
                                  onChange={(e) =>
                                    setTeeth((t) =>
                                      t.map((x, j) =>
                                        j === i ? { ...x, toothNo: e.target.value } : x,
                                      ),
                                    )
                                  }
                                />
                              </FieldContent>
                            </Field>
                            <Field orientation="vertical">
                              {showToothFieldLabels ? <FieldLabel>品牌</FieldLabel> : null}
                              <FieldContent>
                                <ToothBrandCombobox
                                  brands={inventoryBrands}
                                  value={row.implantBrand}
                                  onValueChange={(v) =>
                                    setTeeth((t) =>
                                      t.map((x, j) => (j === i ? { ...x, implantBrand: v } : x)),
                                    )
                                  }
                                  className="w-full"
                                  inputAriaLabel={showToothFieldLabels ? undefined : "品牌"}
                                />
                              </FieldContent>
                            </Field>
                            <Field orientation="vertical">
                              {showToothFieldLabels ? <FieldLabel>植体</FieldLabel> : null}
                              <FieldContent>
                                <Input
                                  aria-label={showToothFieldLabels ? undefined : "植体"}
                                  value={row.implantModel}
                                  onChange={(e) =>
                                    setTeeth((t) =>
                                      t.map((x, j) =>
                                        j === i ? { ...x, implantModel: e.target.value } : x,
                                      ),
                                    )
                                  }
                                />
                              </FieldContent>
                            </Field>
                            <Field orientation="vertical">
                              {showToothFieldLabels ? <FieldLabel>备注</FieldLabel> : null}
                              <FieldContent>
                                <Input
                                  aria-label={showToothFieldLabels ? undefined : "备注"}
                                  value={row.toothRemark}
                                  onChange={(e) =>
                                    setTeeth((t) =>
                                      t.map((x, j) =>
                                        j === i ? { ...x, toothRemark: e.target.value } : x,
                                      ),
                                    )
                                  }
                                />
                              </FieldContent>
                            </Field>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeToothAt(i)}
                          aria-label={`删除第 ${i + 1} 条牙位`}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </FieldGroup>
                  );
                })}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" onClick={addToothRow}>
                  添加牙位
                </Button>
                <Button type="button" disabled={saving} onClick={() => void submit()}>
                  {saving ? "保存中…" : "保存"}
                </Button>
              </div>
            </div>
          )}
        </FieldSet>
      </DialogContent>
    </Dialog>
  );
}

export function ImplantRecordsPage() {
  const range = React.useMemo(() => defaultDateRange(), []);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState(range.from);
  const [dateTo, setDateTo] = React.useState(range.to);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [selection, setSelection] = React.useState<Set<number>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [visitDialog, setVisitDialog] = React.useState<ImplantRecordsVisitDialogState | null>(
    null,
  );

  /** 合并行依赖行顺序（与接口返回顺序一致） */
  const mergeSpans = React.useMemo(() => computeMergeSpans(rows), [rows]);

  const toggleSel = React.useCallback((i: number) => {
    setSelection((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }, []);

  const selectAllRows = React.useCallback(() => {
    setSelection(new Set(rows.map((_, i) => i)));
  }, [rows]);

  const clearSelection = React.useCallback(() => {
    setSelection(new Set());
  }, []);

  const load = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (name.trim()) params.set("name", name.trim());
      if (phone.trim()) params.set("phone", phone.trim());
      const textFilter = Boolean(name.trim() || phone.trim());
      if (!textFilter) {
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
      }
      const q = params.toString();
      const data = await api<Row[]>("GET", `/implant/records${q ? `?${q}` : ""}`);
      setRows(Array.isArray(data) ? data : []);
      setSelection(new Set());
    } catch (e) {
      toast.error(errorMessage(e));
      setRows([]);
    }
  }, [name, phone, dateFrom, dateTo]);

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 300);
    return () => window.clearTimeout(id);
  }, [load]);

  const openEdit = React.useCallback(
    (row: Row) => {
      setVisitDialog({ type: "edit", group: rowsInSameMergeGroup(rows, row) });
    },
    [rows],
  );

  async function confirmDeleteSelected() {
    const sel = rows.filter((_, i) => selection.has(i));
    if (!sel.length) {
      setDeleteDialogOpen(false);
      return;
    }
    try {
      for (const row of sel) {
        try {
          const q =
            row.toothId != null ? `?toothId=${encodeURIComponent(String(row.toothId))}` : "";
          await api("DELETE", `/implant/visits/${row.visitId}${q}`);
        } catch (e) {
          toast.error(errorMessage(e));
        }
      }
      toast.success("已删除");
      await load();
    } finally {
      setDeleteDialogOpen(false);
    }
  }

  const columns = React.useMemo<Array<ColumnDef<Row>>>(
    () => [
      {
        id: "select",
        header: ({ table }) => {
          const meta = table.options.meta;
          const modelRows = table.getRowModel().rows;
          const sel = meta?.selection;
          const allSelected = modelRows.length > 0 && modelRows.every((r) => sel?.has(r.index));
          const someSelected = modelRows.some((r) => sel?.has(r.index));
          return (
            <Checkbox
              checked={allSelected}
              indeterminate={!allSelected && someSelected}
              onCheckedChange={(value) => {
                if (value) meta?.selectAllRows?.();
                else meta?.clearSelection?.();
              }}
              aria-label="全选"
            />
          );
        },
        cell: ({ row, table }) => {
          const i = row.index;
          const sel = table.options.meta?.selection;
          const toggle = table.options.meta?.toggleSel;
          return (
            <Checkbox
              checked={sel?.has(i) ?? false}
              onCheckedChange={() => toggle?.(i)}
              onClick={(e) => e.stopPropagation()}
              aria-label="选择行"
            />
          );
        },
        enableHiding: false,
      },
      {
        id: "patientName",
        accessorKey: "patientName",
        header: "姓名",
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: "手机",
      },
      {
        id: "visitDate",
        accessorKey: "visitDate",
        header: "日期",
      },
      {
        id: "remark",
        accessorKey: "remark",
        header: "二期",
        cell: ({ row }) => phase2DisplayDate(row.original.visitDate, row.original.remark),
      },
      {
        id: "toothNo",
        accessorKey: "toothNo",
        header: "牙位",
        cell: ({ getValue }) => (getValue() as string | null) ?? "",
      },
      {
        id: "implantBrand",
        accessorKey: "implantBrand",
        header: "品牌",
        cell: ({ getValue }) => (getValue() as string | null) ?? "",
      },
      {
        id: "implantModel",
        accessorKey: "implantModel",
        header: "植体",
        cell: ({ getValue }) => (getValue() as string | null) ?? "",
      },
      {
        id: "toothRemark",
        accessorKey: "toothRemark",
        header: "备注",
        cell: ({ getValue }) => (getValue() as string | null) ?? "",
      },
      {
        id: "staff",
        accessorKey: "staff",
        header: "人员",
        cell: ({ getValue }) => (getValue() as string | null) ?? "",
      },
      {
        id: "edit",
        header: "操作",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="link"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row.original);
            }}
          >
            编辑
          </Button>
        ),
        enableSorting: false,
      },
    ],
    [openEdit],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row, index) => `${row.visitId}-${row.toothId ?? index}`,
    meta: {
      mergeSpans,
      selection,
      toggleSel,
      selectAllRows,
      clearSelection,
    },
  });

  return (
    <div className="bg-background p-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>种植记录</CardTitle>
            <CardDescription>
              未填姓名、手机时按日期区间筛选，填写任一项则不限日期，匹配全部记录。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field>
                  <FieldLabel>姓名</FieldLabel>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>手机</FieldLabel>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>日期</FieldLabel>
                  <DateRangePickerField
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    onRangeChange={(from, to) => {
                      setDateFrom(from);
                      setDateTo(to);
                    }}
                  />
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardAction>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" onClick={() => setVisitDialog({ type: "add" })}>
                  新增
                </Button>
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger
                    disabled={!selection.size}
                    render={<Button variant="destructive" />}
                  >
                    删除选中
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认删除</AlertDialogTitle>
                      <AlertDialogDescription>
                        确定删除选中的 {selection.size} 条记录吗？
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel variant="outline">取消</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => void confirmDeleteSelected()}
                      >
                        删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full min-w-0">
              <Table className="w-full min-w-[1246px] table-fixed">
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((h) => (
                        <TableHead key={h.id}>
                          {h.isPlaceholder
                            ? null
                            : flexRender(h.column.columnDef.header, h.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => {
                    const rowIndex = row.index;
                    const rowspan = mergeSpans[rowIndex] ?? 1;
                    const showMerged = rowspan > 0;
                    return (
                      <TableRow key={row.id} onDoubleClick={() => openEdit(row.original)}>
                        {row.getVisibleCells().map((cell) => {
                          const colId = cell.column.id;
                          if (MERGED_COLUMN_IDS.has(colId) && !showMerged) {
                            return null;
                          }
                          const rowSpanProps =
                            MERGED_COLUMN_IDS.has(colId) && showMerged && rowspan > 1
                              ? { rowSpan: rowspan }
                              : {};
                          return (
                            <TableCell key={cell.id} {...rowSpanProps}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>

        <ImplantRecordsVisitDialog
          state={visitDialog}
          onOpenChange={(o) => {
            if (!o) setVisitDialog(null);
          }}
          onSaved={() => void load()}
        />
      </div>
    </div>
  );
}
