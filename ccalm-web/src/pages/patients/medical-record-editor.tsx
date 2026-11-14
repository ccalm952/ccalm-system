import * as React from "react";
import dayjs from "dayjs";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { DatePickerField } from "@/components/date-picker-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import {
  cleanPlanItems,
  cleanToothEntries,
  hasTreatment,
  isEntryField,
  MEDICAL_RECORD_FIELD_LABELS,
  MEDICAL_RECORD_FIELDS,
  MEDICAL_RECORD_TYPE_OPTIONS,
  type MedicalRecordEntryField,
  type MedicalRecordTextField,
  type MedicalRecordType,
  type PlanItem,
  type ToothEntry,
} from "@/lib/medical-records/record-types";
import { visitKindLabel, visitTimeRange } from "@/lib/visits/visit-options";
import { pickPendingVisitId } from "@/lib/visits/pending-visit";
import type { MedicalRecord, PatientVisit } from "./patient-detail-types";
import { PhraseTextarea } from "./phrase-textarea";
import { PlanQuoteInputs } from "./plan-quote";
import { RootCanalField } from "./root-canal-field";
import { StaffCombobox } from "./staff-combobox";
import { ToothEntriesField, ToothEntriesView } from "./tooth-entries-field";

type FormState = Record<MedicalRecordTextField, string> &
  Record<Exclude<MedicalRecordEntryField, "treatmentPlan">, ToothEntry[]> & {
    treatmentPlan: PlanItem[];
    type: MedicalRecordType;
    visitLink: string;
    visitDate: string;
    visitTime: string;
    doctor: string;
    assistant: string;
    nurse: string;
    planLinks: { planItemId: number; completes: boolean }[];
  };

/** 复诊所属初诊的治疗计划；startItemId 为从哪一行点进来写复诊，doctor 为初诊医生 */
export type ReturnPlan = {
  items: PlanItem[];
  startItemId: number | null;
  doctor: string;
};

const NEW_VISIT = "new";

/** 新病历默认挂到当天还没写病历的就诊（正畸名单点过「就诊」或已挂号），没有才新建 */
function defaultVisitLink(
  record: MedicalRecord | null,
  visits: PatientVisit[],
): string {
  if (record) {
    return record.visitId != null ? String(record.visitId) : NEW_VISIT;
  }
  const pending = pickPendingVisitId(visits, dayjs().format("YYYY-MM-DD"));
  return pending == null ? NEW_VISIT : String(pending);
}

function toForm(
  record: MedicalRecord | null,
  plan: ReturnPlan | null,
  visits: PatientVisit[],
): FormState {
  return {
    type: record?.type ?? (plan ? "return" : "first"),
    visitLink: defaultVisitLink(record, visits),
    visitDate: record?.visitDate ?? dayjs().format("YYYY-MM-DD"),
    visitTime: record?.visitTime ?? dayjs().format("HH:mm"),
    doctor: record?.doctor ?? plan?.doctor ?? "",
    assistant: record?.assistant ?? "",
    nurse: record?.nurse ?? "",
    chiefComplaint: record?.chiefComplaint ?? "",
    presentIllness: record?.presentIllness ?? "",
    pastHistory: record?.pastHistory ?? "",
    oralExam: record?.oralExam ?? [],
    auxiliaryExam: record?.auxiliaryExam ?? "",
    diagnosis: record?.diagnosis ?? [],
    treatmentPlan: record?.treatmentPlan ?? [],
    treatment: record?.treatment ?? [],
    advice: record?.advice ?? "",
    remark: record?.remark ?? "",
    planLinks: record
      ? record.planLinks.map((l) => ({
          planItemId: l.planItemId,
          completes: l.completes,
        }))
      : plan?.startItemId != null
        ? [{ planItemId: plan.startItemId, completes: false }]
        : [],
  };
}

export function MedicalRecordEditor({
  patientId,
  record,
  plan,
  visits,
  onCancel,
  onSaved,
}: {
  patientId: number;
  record: MedicalRecord | null;
  plan: ReturnPlan | null;
  visits: PatientVisit[];
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = React.useState<FormState>(() =>
    toForm(record, plan, visits),
  );
  const [saving, setSaving] = React.useState(false);

  const isReturn = plan != null || record?.type === "return";
  const typeOptions = MEDICAL_RECORD_TYPE_OPTIONS.filter((opt) =>
    isReturn ? opt.value === "return" : opt.value !== "return",
  );

  /** 关联了已有就诊时，日期时间以该就诊为准 */
  const linkedVisit = visits.find((v) => String(v.id) === form.visitLink);
  const visitLocked = linkedVisit != null;

  React.useEffect(() => {
    const visit = visits.find((v) => String(v.id) === form.visitLink);
    if (!visit) return;
    setForm((f) => {
      const visitTime = visit.startTime ?? "";
      if (f.visitDate === visit.visitDate && f.visitTime === visitTime) {
        return f;
      }
      return { ...f, visitDate: visit.visitDate, visitTime };
    });
  }, [form.visitLink, visits]);

  const visitItems = [
    { value: NEW_VISIT, label: "新建就诊（按上面的日期时间）" },
    ...visits.map((v) => ({
      value: String(v.id),
      label: `${v.visitDate} ${visitTimeRange(v.startTime, v.endTime)} ${visitKindLabel(v.kind)}`,
    })),
  ];

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setLink(planItemId: number, link: boolean, completes: boolean) {
    setForm((f) => ({
      ...f,
      planLinks: [
        ...f.planLinks.filter((l) => l.planItemId !== planItemId),
        ...(link ? [{ planItemId, completes }] : []),
      ],
    }));
  }

  async function save() {
    const treatment = cleanToothEntries(form.treatment);
    if (
      MEDICAL_RECORD_FIELDS[form.type].includes("treatment") &&
      !hasTreatment(treatment)
    ) {
      toast.error("请填写处置");
      return;
    }
    if (plan && !form.planLinks.length) {
      toast.error("请至少勾选一行治疗计划");
      return;
    }
    setSaving(true);
    try {
      const body = {
        patientId,
        type: form.type,
        visitId: form.visitLink === NEW_VISIT ? null : Number(form.visitLink),
        createVisit: form.visitLink === NEW_VISIT,
        visitDate: linkedVisit?.visitDate ?? form.visitDate,
        visitTime: linkedVisit?.startTime ?? form.visitTime,
        doctor: form.doctor.trim(),
        assistant: form.assistant.trim(),
        nurse: form.nurse.trim(),
        chiefComplaint: form.chiefComplaint.trim(),
        presentIllness: form.presentIllness.trim(),
        pastHistory: form.pastHistory.trim(),
        oralExam: cleanToothEntries(form.oralExam),
        auxiliaryExam: form.auxiliaryExam.trim(),
        diagnosis: cleanToothEntries(form.diagnosis),
        treatmentPlan: cleanPlanItems(form.treatmentPlan),
        treatment,
        advice: form.advice.trim(),
        remark: form.remark.trim(),
        planLinks: plan ? form.planLinks : undefined,
      };
      if (record) {
        await api("PUT", `/medical-records/${record.id}`, body);
      } else {
        await api("POST", "/medical-records", body);
      }
      toast.success("已保存");
      await onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="min-h-0 flex-1">
      <CardHeader className="flex flex-col gap-4">
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onCancel}
            >
              <ChevronLeft />
            </Button>
            <CardTitle>{record ? "编辑病历" : "新建病历"}</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              取消
            </Button>
            <Button type="button" disabled={saving} onClick={() => void save()}>
              保存
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {typeOptions.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={form.type === opt.value ? "default" : "outline"}
              onClick={() => set("type", opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <ScrollArea className="min-h-0 flex-1">
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Field>
              <FieldLabel>医生</FieldLabel>
              <StaffCombobox
                value={form.doctor}
                onValueChange={(v) => set("doctor", v)}
              />
            </Field>
            <Field>
              <FieldLabel>助理</FieldLabel>
              <StaffCombobox
                value={form.assistant}
                onValueChange={(v) => set("assistant", v)}
              />
            </Field>
            <Field>
              <FieldLabel>护士</FieldLabel>
              <StaffCombobox
                value={form.nurse}
                onValueChange={(v) => set("nurse", v)}
              />
            </Field>
            <Field>
              <FieldLabel>就诊日期</FieldLabel>
              <DatePickerField
                className="h-8 justify-between rounded-2xl border-transparent bg-input/50 px-2.5 font-normal hover:bg-input/50 aria-expanded:bg-input/50 dark:bg-input/50 dark:hover:bg-input/50"
                value={form.visitDate}
                onValueChange={(v) => set("visitDate", v)}
                disabled={visitLocked}
                hideIcon
                showChevron
              />
            </Field>
            <Field>
              <FieldLabel>就诊时间</FieldLabel>
              <Input
                type="time"
                aria-label="就诊时间"
                className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                value={form.visitTime}
                onChange={(e) => set("visitTime", e.target.value)}
                disabled={visitLocked}
              />
            </Field>
            <Field>
              <FieldLabel>关联就诊</FieldLabel>
              <Select
                items={visitItems}
                value={form.visitLink}
                onValueChange={(v: string | null) => {
                  if (!v) return;
                  const visit = visits.find((x) => String(x.id) === v);
                  setForm((f) => ({
                    ...f,
                    visitLink: v,
                    doctor: f.doctor || visit?.doctor || "",
                  }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {visitItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {visitLocked ? (
                <FieldDescription>
                  已关联就诊，日期时间以该就诊为准
                </FieldDescription>
              ) : null}
            </Field>
          </div>

          {plan ? (
            <Field>
              <FieldLabel>治疗计划</FieldLabel>
              <ToothEntriesView
                entries={plan.items}
                renderExtra={(index) => {
                  const item = plan.items[index];
                  if (item.id == null) return null;
                  const id = item.id;
                  const link = form.planLinks.find((l) => l.planItemId === id);
                  const doneHere = record?.planLinks.some(
                    (l) => l.planItemId === id && l.completes,
                  );
                  if (item.doneDate && !doneHere) {
                    return (
                      <Badge variant="secondary" className="h-auto text-sm">
                        已完成 {item.doneDate}
                      </Badge>
                    );
                  }
                  return (
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={link != null}
                          onCheckedChange={(checked) =>
                            setLink(id, checked, false)
                          }
                        />
                        本次处理
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={link?.completes ?? false}
                          disabled={link == null}
                          onCheckedChange={(checked) =>
                            setLink(id, true, checked)
                          }
                        />
                        本行已完成
                      </label>
                    </div>
                  );
                }}
              />
            </Field>
          ) : null}

          {MEDICAL_RECORD_FIELDS[form.type].map((field) => (
            <Field key={field}>
              <FieldLabel>
                {MEDICAL_RECORD_FIELD_LABELS[field]}
                {field === "treatment" ? (
                  <span className="text-destructive">*</span>
                ) : null}
              </FieldLabel>
              {field === "treatmentPlan" ? (
                <ToothEntriesField
                  value={form.treatmentPlan}
                  onValueChange={(v) => set("treatmentPlan", v)}
                  phraseField="treatmentPlan"
                  renderDetail={(item, update) => (
                    <PlanQuoteInputs item={item} onChange={update} />
                  )}
                />
              ) : isEntryField(field) ? (
                <ToothEntriesField
                  value={form[field]}
                  onValueChange={(v) => set(field, v)}
                  phraseField={field}
                  renderDetail={
                    field === "treatment"
                      ? (entry, update) => (
                          <RootCanalField
                            teeth={entry.teeth}
                            text={entry.text}
                            onChange={(next) => update({ text: next })}
                          />
                        )
                      : undefined
                  }
                />
              ) : (
                <PhraseTextarea
                  field={field}
                  value={form[field]}
                  onChange={(next) => set(field, next)}
                />
              )}
            </Field>
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
