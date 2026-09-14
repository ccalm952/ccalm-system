import * as React from "react";
import dayjs from "dayjs";
import { X } from "lucide-react";
import { toast } from "sonner";

import { DatePickerField } from "@/components/date-picker-field";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, FieldContent, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";

import { ToothBrandCombobox, ToothModelCombobox } from "./implant-records-comboboxes";
import type {
  ImplantRecordRow,
  ImplantRecordsVisitDialogState,
} from "./implant-records-types";

type ToothLine = {
  toothNo: string;
  implantBrand: string;
  implantModel: string;
  toothRemark: string;
};

type EditToothLine = ToothLine & {
  visitId: number;
  toothId: number | null;
};

type PendingToothDelete = { visitId: number; toothId: number };
type InventoryRow = { brand: string; model: string };

type AddSuggestion = {
  id: number;
  name: string;
  phone: string;
  source: string;
  birthday?: string;
  age?: number | null;
  origin?: "patient" | "pending";
  originLabel?: string;
  teeth?: string;
};

const emptyTooth = (): ToothLine => ({
  toothNo: "",
  implantBrand: "",
  implantModel: "",
  toothRemark: "",
});

function emptyEditTooth(visitId: number): EditToothLine {
  return { visitId, toothId: null, ...emptyTooth() };
}

function splitPendingTeeth(raw: string): ToothLine[] | null {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (!parts.length || parts.some((part) => !/^\d+$/.test(part))) return null;
  return parts.map((toothNo) => ({ ...emptyTooth(), toothNo }));
}

function inventoryBrands(rows: InventoryRow[]) {
  return [...new Set(rows.map((row) => row.brand?.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "zh-Hans-CN"),
  );
}

function inventoryModels(rows: InventoryRow[]) {
  const result = new Map<string, string[]>();
  for (const row of rows) {
    const brand = row.brand?.trim();
    const model = row.model?.trim();
    if (!brand || !model) continue;
    const models = result.get(brand) ?? [];
    if (!models.includes(model)) models.push(model);
    result.set(brand, models);
  }
  for (const models of result.values()) models.sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  return result;
}

function isInventoryModel(modelsByBrand: Map<string, string[]>, brand: string, model: string) {
  const normalizedBrand = brand.trim();
  const normalizedModel = model.trim();
  return Boolean(
    normalizedBrand &&
      normalizedModel &&
      (modelsByBrand.get(normalizedBrand) ?? []).includes(normalizedModel),
  );
}

function inventoryValidation(
  teeth: Pick<ToothLine, "implantBrand" | "implantModel">[],
  modelsByBrand: Map<string, string[]>,
) {
  for (const tooth of teeth) {
    const brand = tooth.implantBrand.trim();
    const model = tooth.implantModel.trim();
    if (!brand && !model) continue;
    if (brand && !model) return "请为已选品牌选择植体型号";
    if (!brand && model) return "请先选择品牌";
    if (!isInventoryModel(modelsByBrand, brand, model))
      return "植体型号不在库存中，请从下拉列表重新选择";
  }
  return null;
}

function ToothRows<T extends ToothLine>({
  rows,
  brands,
  modelsByBrand,
  setRows,
  onRemove,
  addAriaLabels,
}: {
  rows: T[];
  brands: string[];
  modelsByBrand: Map<string, string[]>;
  setRows: React.Dispatch<React.SetStateAction<T[]>>;
  onRemove: (index: number) => void;
  addAriaLabels: boolean;
}) {
  function update(index: number, patch: Partial<ToothLine>) {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, index) => (
        <FieldGroup
          key={
            "toothId" in row
              ? `${String(row.toothId ?? "new")}-${index}`
              : index
          }
        >
          <div className="flex min-w-0 items-end gap-4">
            <div className="min-w-0 flex-1">
              <div className="grid grid-cols-[repeat(4,minmax(0,1fr))] gap-2 md:gap-4">
                <Field orientation="vertical">
                  <FieldContent>
                    <Input
                      placeholder="牙位"
                      aria-label={addAriaLabels ? "牙位" : undefined}
                      value={row.toothNo}
                      onChange={(event) => update(index, { toothNo: event.target.value })}
                    />
                  </FieldContent>
                </Field>
                <Field orientation="vertical">
                  <FieldContent>
                    <ToothBrandCombobox
                      brands={brands}
                      value={row.implantBrand}
                      onValueChange={(value) =>
                        update(index, { implantBrand: value, implantModel: "" })
                      }
                    />
                  </FieldContent>
                </Field>
                <Field orientation="vertical">
                  <FieldContent>
                    <ToothModelCombobox
                      models={modelsByBrand.get(row.implantBrand.trim()) ?? []}
                      brand={row.implantBrand}
                      value={row.implantModel}
                      onValueChange={(value) => update(index, { implantModel: value })}
                    />
                  </FieldContent>
                </Field>
                <Field orientation="vertical">
                  <FieldContent>
                    <Input
                      placeholder="备注"
                      aria-label={addAriaLabels ? "备注" : undefined}
                      value={row.toothRemark}
                      onChange={(event) => update(index, { toothRemark: event.target.value })}
                    />
                  </FieldContent>
                </Field>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={() => onRemove(index)}>
              <X className="size-4" />
            </Button>
          </div>
        </FieldGroup>
      ))}
    </div>
  );
}

function DialogActions({
  saving,
  onAdd,
  onCancel,
  onSave,
}: {
  saving: boolean;
  onAdd: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex w-full gap-4">
      <Button type="button" variant="outline" className="min-w-0 flex-1" onClick={onAdd}>
        添加牙位
      </Button>
      <Button type="button" variant="secondary" className="min-w-0 flex-1" onClick={onCancel}>
        取消
      </Button>
      <Button type="button" className="min-w-0 flex-1" disabled={saving} onClick={onSave}>
        {saving ? (
          <>
            <Spinner data-icon="inline-start" />
            保存中…
          </>
        ) : (
          "保存"
        )}
      </Button>
    </div>
  );
}

export function ImplantRecordsVisitDialog({
  state,
  onOpenChange,
  onSaved,
}: {
  state: ImplantRecordsVisitDialogState | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [surfaceMode, setSurfaceMode] = React.useState<"add" | "edit">("add");
  React.useEffect(() => {
    if (state) setSurfaceMode(state.type);
  }, [state]);
  const open = state !== null;
  const isEdit = state ? state.type === "edit" : surfaceMode === "edit";

  const [visitDate, setVisitDate] = React.useState(() => dayjs().format("YYYY-MM-DD"));
  const [patientName, setPatientName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [chartNo, setChartNo] = React.useState("");
  const [birthday, setBirthday] = React.useState("");
  const [age, setAge] = React.useState("");
  const [staff, setStaff] = React.useState("");
  const [remark, setRemark] = React.useState("");
  const [teeth, setTeeth] = React.useState<ToothLine[]>([emptyTooth()]);
  const [inventoryRows, setInventoryRows] = React.useState<InventoryRow[]>([]);
  const brands = React.useMemo(() => inventoryBrands(inventoryRows), [inventoryRows]);
  const modelsByBrand = React.useMemo(() => inventoryModels(inventoryRows), [inventoryRows]);
  const [suggestions, setSuggestions] = React.useState<AddSuggestion[]>([]);
  const [suggestDismissed, setSuggestDismissed] = React.useState(false);
  const suggestTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const suggestRootRef = React.useRef<HTMLDivElement>(null);
  const suggestInputRef = React.useRef<HTMLInputElement>(null);
  const suggestOpen = Boolean(patientName.trim()) && !suggestDismissed;
  const editRowRef = React.useRef<ImplantRecordRow | null>(null);
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
  const [editTeeth, setEditTeeth] = React.useState<EditToothLine[]>([]);
  const [pendingDeletes, setPendingDeletes] = React.useState<PendingToothDelete[]>([]);
  const [saving, setSaving] = React.useState(false);

  const resetForm = React.useCallback(() => {
    setVisitDate(dayjs().format("YYYY-MM-DD"));
    setPatientName("");
    setPhone("");
    setChartNo("");
    setBirthday("");
    setAge("");
    setStaff("");
    setRemark("");
    setTeeth([emptyTooth()]);
    setSuggestDismissed(false);
    setSuggestions([]);
  }, []);

  React.useEffect(() => {
    if (!open || (state?.type !== "add" && state?.type !== "edit")) return;
    let cancelled = false;
    void api<InventoryRow[]>("GET", "/implant/inventory")
      .then((rows) => {
        if (!cancelled) setInventoryRows(rows ?? []);
      })
      .catch(() => {
        if (!cancelled) setInventoryRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, state?.type]);

  React.useEffect(() => {
    if (open && state?.type === "add") resetForm();
  }, [open, state?.type, resetForm]);

  React.useEffect(() => {
    if (!open) setPendingDeletes([]);
  }, [open]);

  React.useLayoutEffect(() => {
    if (state?.type !== "edit") return;
    const row = state.group[0];
    if (!row) return;
    editRowRef.current = row;
    setPendingDeletes([]);
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
      state.group.map((item) => ({
        visitId: item.visitId,
        toothId: item.toothId,
        toothNo: item.toothNo ?? "",
        implantBrand: item.implantBrand ?? "",
        implantModel: item.implantModel ?? "",
        toothRemark: item.toothRemark ?? "",
      })),
    );
  }, [state]);

  React.useEffect(() => {
    if (!open || !inventoryRows.length || state?.type !== "edit") return;
    setEditTeeth((rows) =>
      rows.map((tooth) => ({
        ...tooth,
        implantModel: isInventoryModel(
          modelsByBrand,
          tooth.implantBrand,
          tooth.implantModel,
        )
          ? tooth.implantModel
          : "",
      })),
    );
  }, [open, state?.type, inventoryRows, modelsByBrand]);

  const dismissSuggestIfNotTyping = React.useCallback(() => {
    window.setTimeout(() => {
      const input = suggestInputRef.current;
      const active = document.activeElement;
      if (input && active instanceof Node && input.contains(active)) return;
      setSuggestDismissed(true);
    }, 0);
  }, []);

  React.useEffect(() => {
    if (!suggestOpen) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (
        !(target instanceof Node) ||
        !suggestRootRef.current ||
        suggestRootRef.current.contains(target)
      )
        return;
      setSuggestDismissed(true);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [suggestOpen]);

  React.useEffect(() => {
    if (!suggestOpen) return;
    function onFocusIn() {
      dismissSuggestIfNotTyping();
    }
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [suggestOpen, dismissSuggestIfNotTyping]);

  React.useEffect(() => {
    const query = patientName.trim();
    clearTimeout(suggestTimer.current);
    if (!query) {
      setSuggestions([]);
      return;
    }
    suggestTimer.current = setTimeout(() => {
      void api<{ list: AddSuggestion[] }>(
        "GET",
        `/implant/patient-list?keyword=${encodeURIComponent(query)}&pageSize=20`,
      )
        .then((result) => setSuggestions(result.list ?? []))
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(suggestTimer.current);
  }, [patientName]);

  function onBirthdayChange(value: string) {
    setBirthday(value);
    if (!value) return setAge("");
    const birth = dayjs(value);
    if (!birth.isValid()) return;
    let nextAge = dayjs().diff(birth, "year");
    const monthDiff = dayjs().month() - birth.month();
    if (monthDiff < 0 || (monthDiff === 0 && dayjs().date() < birth.date())) nextAge--;
    setAge(String(nextAge));
  }

  function onAgeChange(raw: string) {
    setAge(raw);
    const value = Number(raw);
    if (raw === "" || Number.isNaN(value)) return setBirthday("");
    const nextAge = Math.min(150, Math.max(0, Math.floor(value)));
    setAge(String(nextAge));
    setBirthday(`${dayjs().year() - nextAge}-01-01`);
  }

  function selectSuggestion(suggestion: AddSuggestion) {
    setPatientName(suggestion.name);
    setPhone(suggestion.phone);
    setChartNo(suggestion.source);
    setBirthday(suggestion.birthday?.trim() ?? "");
    setAge(
      suggestion.age != null && !Number.isNaN(Number(suggestion.age))
        ? String(suggestion.age)
        : "",
    );
    if (suggestion.origin === "pending") {
      const pendingTeeth = splitPendingTeeth(suggestion.teeth ?? "");
      if (pendingTeeth) setTeeth(pendingTeeth);
    }
    setSuggestions([]);
    setSuggestDismissed(true);
  }

  function removeAddTooth(index: number) {
    setTeeth((rows) => (rows.length <= 1 ? [emptyTooth()] : rows.filter((_, i) => i !== index)));
  }

  function removeEditTooth(index: number) {
    setEditTeeth((rows) => {
      const row = rows[index];
      if (row?.toothId != null) {
        setPendingDeletes((deletes) => {
          const key = `${row.visitId}:${row.toothId}`;
          return deletes.some((item) => `${item.visitId}:${item.toothId}` === key)
            ? deletes
            : [...deletes, { visitId: row.visitId, toothId: row.toothId! }];
        });
      }
      const next = rows.filter((_, i) => i !== index);
      const visitId = row?.visitId ?? editRowRef.current?.visitId;
      return next.length ? next : visitId != null ? [emptyEditTooth(visitId)] : [];
    });
  }

  async function submitAdd() {
    const phase2 = remark.trim();
    if (phase2 && !/^\d+$/.test(phase2)) return toast.warning("二期只能填写数字（月数）");
    const payloadTeeth = teeth.filter((tooth) =>
      [tooth.toothNo, tooth.implantModel, tooth.implantBrand, tooth.toothRemark].some((v) =>
        v.trim(),
      ),
    );
    if (!payloadTeeth.length) return toast.warning("请至少填写一条牙位与植体");
    const inventoryError = inventoryValidation(payloadTeeth, modelsByBrand);
    if (inventoryError) return toast.warning(inventoryError);
    if (!patientName.trim()) return toast.warning("请填写姓名");
    if (!phone.trim()) return toast.warning("请填写手机");
    if (!chartNo.trim()) return toast.warning("请填写病历号");
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
        teeth: payloadTeeth.map((tooth) => ({
          toothNo: tooth.toothNo.trim() || undefined,
          implantBrand: tooth.implantBrand.trim() || undefined,
          implantModel: tooth.implantModel.trim() || undefined,
          toothRemark: tooth.toothRemark.trim() || undefined,
        })),
      });
      toast.success("已保存");
      resetForm();
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit() {
    const baseRow = editRowRef.current;
    if (!baseRow) return;
    const phase2 = editForm.remark.trim();
    if (phase2 && !/^\d+$/.test(phase2)) return toast.warning("二期只能填写数字（月数）");
    const payloadTeeth = editTeeth.filter((tooth) =>
      [tooth.toothNo, tooth.implantModel, tooth.implantBrand, tooth.toothRemark].some((v) =>
        v.trim(),
      ),
    );
    if (!payloadTeeth.length) return toast.warning("请至少填写一条牙位与植体");
    const inventoryError = inventoryValidation(payloadTeeth, modelsByBrand);
    if (inventoryError) return toast.warning(inventoryError);
    setSaving(true);
    try {
      const visitIds = new Set([
        ...editTeeth.map((tooth) => tooth.visitId),
        ...pendingDeletes.map((item) => item.visitId),
        baseRow.visitId,
      ]);
      for (const visitId of visitIds) {
        for (const tooth of editTeeth) {
          if (tooth.toothId != null || tooth.visitId !== visitId) continue;
          if (![tooth.toothNo, tooth.implantModel, tooth.implantBrand, tooth.toothRemark].some((v) => v.trim()))
            continue;
          await api("POST", `/implant/visits/${visitId}/teeth`, {
            toothNo: tooth.toothNo.trim() || undefined,
            implantBrand: tooth.implantBrand.trim() || undefined,
            implantModel: tooth.implantModel.trim() || undefined,
            toothRemark: tooth.toothRemark.trim() || undefined,
          });
        }
        for (const item of pendingDeletes) {
          if (item.visitId === visitId)
            await api(
              "DELETE",
              `/implant/visits/${visitId}?toothId=${encodeURIComponent(String(item.toothId))}`,
            );
        }
        for (const tooth of editTeeth) {
          if (tooth.toothId == null || tooth.visitId !== visitId) continue;
          if (![tooth.toothNo, tooth.implantModel, tooth.implantBrand, tooth.toothRemark].some((v) => v.trim()))
            continue;
          await api("PUT", `/implant/visits/${visitId}`, {
            toothId: tooth.toothId,
            patientId: baseRow.patientId,
            patientName: editForm.patientName,
            phone: editForm.phone,
            visitDate: editForm.visitDate,
            remark: editForm.remark || null,
            staff: editForm.staff || null,
            toothNo: tooth.toothNo.trim() || null,
            implantBrand: tooth.implantBrand.trim() || null,
            implantModel: tooth.implantModel.trim() || null,
            toothRemark: tooth.toothRemark.trim() || null,
          });
        }
      }
      toast.success("已保存");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const editFields = [
    ["姓名", editForm.patientName, "patientName"],
    ["手机", editForm.phone, "phone"],
    ["病历号", editForm.chartNo, "chartNo"],
    ["年龄", editForm.age, "age"],
    ["人员", editForm.staff, "staff"],
    ["二期（月数）", editForm.remark, "remark"],
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="text-base md:max-w-3xl md:text-sm [&_button]:text-base md:[&_button]:text-sm [&_input]:text-base md:[&_input]:text-sm [&_label]:text-base md:[&_label]:text-sm [&_[data-slot=field-description]]:text-base md:[&_[data-slot=field-description]]:text-sm [&_[data-slot=field-label]]:text-base md:[&_[data-slot=field-label]]:text-sm [&_[data-slot=field-legend]]:text-base md:[&_[data-slot=field-legend]]:text-sm"
        showCloseButton={false}
      >
        <FieldSet>
          {isEdit ? null : <FieldLegend className="sr-only">新增种植记录</FieldLegend>}
          <div className="flex flex-col gap-4">
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Field orientation="vertical">
                  <FieldContent>
                    <DatePickerField
                      value={isEdit ? editForm.visitDate : visitDate}
                      onValueChange={
                        isEdit
                          ? (value) => setEditForm((form) => ({ ...form, visitDate: value }))
                          : setVisitDate
                      }
                      placeholder={isEdit ? "日期" : ""}
                      aria-label={isEdit ? undefined : "日期"}
                      className={
                        isEdit
                          ? undefined
                          : "border-transparent bg-input/50 hover:bg-input/50 dark:hover:bg-input/50"
                      }
                    />
                  </FieldContent>
                </Field>
                {isEdit ? (
                  <>
                    {editFields.slice(0, 2).map(([placeholder, value, key]) => (
                      <Field orientation="vertical" key={key}>
                        <FieldContent>
                          <Input
                            placeholder={placeholder}
                            value={value}
                            onChange={(event) =>
                              setEditForm((form) => ({ ...form, [key]: event.target.value }))
                            }
                          />
                        </FieldContent>
                      </Field>
                    ))}
                    <Field orientation="vertical">
                      <FieldContent>
                        <Input
                          placeholder="病历号"
                          value={editForm.chartNo}
                          readOnly
                          className="border-border bg-muted/30 focus-visible:border-border focus-visible:ring-0"
                        />
                      </FieldContent>
                    </Field>
                    <Field orientation="vertical">
                      <FieldContent>
                        <DatePickerField
                          value={editForm.birthday}
                          onValueChange={() => {}}
                          disabled
                          captionLayout="dropdown"
                          emptyMonth={new Date(2000, 0)}
                          placeholder="出生日期"
                          className="border-border bg-muted/30 disabled:opacity-100"
                        />
                      </FieldContent>
                    </Field>
                    <Field orientation="vertical">
                      <FieldContent>
                        <Input
                          placeholder="年龄"
                          value={editForm.age}
                          readOnly
                          className="border-border bg-muted/30 focus-visible:border-border focus-visible:ring-0"
                        />
                      </FieldContent>
                    </Field>
                    {editFields.slice(4).map(([placeholder, value, key]) => (
                      <Field orientation="vertical" key={key}>
                        <FieldContent>
                          <Input
                            placeholder={placeholder}
                            value={value}
                            onChange={(event) =>
                              setEditForm((form) => ({ ...form, [key]: event.target.value }))
                            }
                          />
                        </FieldContent>
                      </Field>
                    ))}
                  </>
                ) : (
                  <>
                    <Field orientation="vertical">
                      <FieldContent>
                        <div ref={suggestRootRef} className="relative">
                          <Command
                            shouldFilter={false}
                            label="搜索患者"
                            className="w-full overflow-visible rounded-none bg-transparent p-0 text-foreground shadow-none [&_[data-slot=command-input-wrapper]]:p-0"
                          >
                            <CommandInput
                              ref={suggestInputRef}
                              placeholder="姓名"
                              aria-label="姓名"
                              value={patientName}
                              onValueChange={(value) => {
                                setSuggestDismissed(false);
                                setPatientName(value);
                              }}
                              onFocus={() => setSuggestDismissed(false)}
                              onBlur={dismissSuggestIfNotTyping}
                              autoComplete="off"
                            />
                            {suggestOpen ? (
                              <CommandList
                                className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 rounded-md border bg-popover text-popover-foreground shadow-md"
                                onMouseDown={(event) => event.preventDefault()}
                              >
                                <CommandEmpty>未找到匹配患者</CommandEmpty>
                                <CommandGroup>
                                  {suggestions.map((suggestion) => (
                                    <CommandItem
                                      key={`${suggestion.origin ?? "patient"}-${suggestion.id}`}
                                      value={`${suggestion.origin ?? "patient"}-${suggestion.id}-${suggestion.name}-${suggestion.phone}`}
                                      onSelect={() => selectSuggestion(suggestion)}
                                    >
                                      <span>{suggestion.name}</span>
                                      <span className="text-muted-foreground">
                                        {suggestion.originLabel ?? "患者库"}
                                        {suggestion.phone ? ` · ${suggestion.phone}` : ""}
                                        {suggestion.source ? ` · ${suggestion.source}` : ""}
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
                    {[
                      ["手机", phone, setPhone],
                      ["病历号", chartNo, setChartNo],
                    ].map(([placeholder, value, setter]) => (
                      <Field orientation="vertical" key={placeholder as string}>
                        <FieldContent>
                          <Input
                            placeholder={placeholder as string}
                            aria-label={placeholder as string}
                            value={value as string}
                            onChange={(event) =>
                              (setter as React.Dispatch<React.SetStateAction<string>>)(
                                event.target.value,
                              )
                            }
                          />
                        </FieldContent>
                      </Field>
                    ))}
                    <Field orientation="vertical">
                      <FieldContent>
                        <DatePickerField
                          value={birthday}
                          onValueChange={onBirthdayChange}
                          captionLayout="dropdown"
                          emptyMonth={new Date(2000, 0)}
                          placeholder="出生日期"
                          aria-label="出生日期"
                        />
                      </FieldContent>
                    </Field>
                    {[
                      ["年龄", age, onAgeChange],
                      ["人员", staff, setStaff],
                      ["二期（月数）", remark, setRemark],
                    ].map(([placeholder, value, setter]) => (
                      <Field orientation="vertical" key={placeholder as string}>
                        <FieldContent>
                          <Input
                            placeholder={placeholder as string}
                            aria-label={placeholder as string}
                            value={value as string}
                            onChange={(event) =>
                              (setter as (next: string) => void)(event.target.value)
                            }
                          />
                        </FieldContent>
                      </Field>
                    ))}
                  </>
                )}
              </div>
            </FieldGroup>
            {isEdit ? (
              <ToothRows
                rows={editTeeth}
                brands={brands}
                modelsByBrand={modelsByBrand}
                setRows={setEditTeeth}
                onRemove={removeEditTooth}
                addAriaLabels={false}
              />
            ) : (
              <ToothRows
                rows={teeth}
                brands={brands}
                modelsByBrand={modelsByBrand}
                setRows={setTeeth}
                onRemove={removeAddTooth}
                addAriaLabels
              />
            )}
            <DialogActions
              saving={saving}
              onAdd={() =>
                isEdit
                  ? editRowRef.current &&
                    setEditTeeth((rows) => [
                      ...rows,
                      emptyEditTooth(editRowRef.current!.visitId),
                    ])
                  : setTeeth((rows) => [...rows, emptyTooth()])
              }
              onCancel={() => onOpenChange(false)}
              onSave={() => void (isEdit ? submitEdit() : submitAdd())}
            />
          </div>
        </FieldSet>
      </DialogContent>
    </Dialog>
  );
}
