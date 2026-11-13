import * as React from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { formatMoney, sumMoney } from "@/lib/charges/charge-calc";
import { errorMessage } from "@/lib/errorMessage";
import {
  isEntryField,
  MEDICAL_RECORD_FIELD_LABELS,
  MEDICAL_RECORD_FIELDS,
  type MedicalRecordField,
  medicalRecordTypeLabel,
  planCourseStatus,
  type PlanItem,
} from "@/lib/medical-records/record-types";
import { MedicalRecordEditor, type ReturnPlan } from "./medical-record-editor";
import type {
  ChargeOrder,
  ChargesResponse,
  MedicalRecord,
  PatientVisit,
} from "./patient-detail-types";
import { PlanQuoteView } from "./plan-quote";
import { ToothEntriesView } from "./tooth-entries-field";

type VisitCharge = { receivable: number; owed: number };

const NO_CHARGE: VisitCharge = { receivable: 0, owed: 0 };

function addCharges(list: VisitCharge[]): VisitCharge {
  return {
    receivable: sumMoney(list.map((c) => c.receivable)),
    owed: sumMoney(list.map((c) => c.owed)),
  };
}

function ChargeSummary({
  charge,
  prefix = "",
}: {
  charge: VisitCharge;
  prefix?: string;
}) {
  return (
    <span className="flex items-center gap-3 text-muted-foreground tabular-nums">
      <span>
        {prefix}应收：{formatMoney(charge.receivable)}
      </span>
      {charge.owed > 0 ? (
        <span className="text-destructive">
          欠费：{formatMoney(charge.owed)}
        </span>
      ) : null}
    </span>
  );
}

function PlanItemStatus({
  item,
  open,
  onWriteReturn,
}: {
  item: PlanItem;
  open: boolean;
  onWriteReturn: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {item.followUpCount ? (
        <span className="flex items-center gap-1">
          已复诊 {item.followUpCount} 次
          {open ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </span>
      ) : (
        <span className="text-muted-foreground">未开始</span>
      )}
      {item.doneDate ? (
        <Badge variant="secondary" className="h-auto text-sm">
          已完成 {item.doneDate}
        </Badge>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onWriteReturn();
          }}
        >
          写复诊
        </Button>
      )}
    </div>
  );
}

function PlanFollowUps({
  planItemId,
  records,
  expanded,
  chargeByVisit,
  onEdit,
  onDelete,
}: {
  planItemId: number;
  expanded: boolean;
  records: MedicalRecord[];
  chargeByVisit: Map<number, VisitCharge>;
  onEdit: (record: MedicalRecord) => void;
  onDelete: (record: MedicalRecord) => void;
}) {
  return (
    <div className="flex flex-col divide-y rounded-lg bg-muted/50 px-4">
      {records.map((r) => (
        <div
          key={r.id}
          className="grid grid-cols-[6rem_1fr_auto_auto_auto] items-center gap-4 py-3"
        >
          <div className="text-primary tabular-nums">
            <div>{r.visitDate}</div>
            <div className="text-muted-foreground">{r.doctor}</div>
          </div>
          <div className="flex flex-col gap-2">
            {r.treatment.length ? (
              <ToothEntriesView entries={r.treatment} />
            ) : (
              <span className="text-muted-foreground">无处置</span>
            )}
            {expanded && r.advice ? (
              <div className="whitespace-pre-wrap">
                <span className="text-muted-foreground">医嘱：</span>
                {r.advice}
              </div>
            ) : null}
            {expanded && r.remark ? (
              <div className="whitespace-pre-wrap">
                <span className="text-muted-foreground">备注：</span>
                {r.remark}
              </div>
            ) : null}
          </div>
          {r.planLinks.some(
            (l) => l.planItemId === planItemId && l.completes,
          ) ? (
            <Badge variant="secondary" className="h-auto text-sm">
              本行完成
            </Badge>
          ) : (
            <span />
          )}
          {r.visitId != null && chargeByVisit.has(r.visitId) ? (
            <ChargeSummary charge={chargeByVisit.get(r.visitId)!} />
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => onEdit(r)}>
              编辑
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onDelete(r)}
            >
              删除
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecordBody({
  record,
  expanded,
  followUps,
  chargeByVisit,
  onWriteReturn,
  onEditRecord,
  onDeleteRecord,
}: {
  record: MedicalRecord;
  expanded: boolean;
  followUps: Map<number, MedicalRecord[]>;
  chargeByVisit: Map<number, VisitCharge>;
  onWriteReturn: (planItemId: number) => void;
  onEditRecord: (record: MedicalRecord) => void;
  onDeleteRecord: (record: MedicalRecord) => void;
}) {
  const followUpItemIds = () =>
    record.treatmentPlan
      .map((i) => i.id)
      .filter((id): id is number => id != null && followUps.has(id));
  const [openItems, setOpenItems] = React.useState<Set<number>>(
    () => new Set(expanded ? followUpItemIds() : []),
  );
  const [prevExpanded, setPrevExpanded] = React.useState(expanded);
  if (expanded !== prevExpanded) {
    setPrevExpanded(expanded);
    setOpenItems(new Set(expanded ? followUpItemIds() : []));
  }
  function toggleItem(id: number) {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const fields: MedicalRecordField[] = expanded
    ? MEDICAL_RECORD_FIELDS[record.type]
    : record.type === "first"
      ? ["treatmentPlan", "advice"]
      : ["treatment", "advice"];
  const rows: { key: string; label: string; content: React.ReactNode }[] = [];
  for (const field of fields) {
    let content: React.ReactNode = null;
    if (field === "treatmentPlan" && record.type === "first") {
      if (record.treatmentPlan.length) {
        content = (
          <ToothEntriesView
            entries={record.treatmentPlan}
            renderExtra={(index) => {
              const item = record.treatmentPlan[index];
              return item.id != null ? (
                <PlanItemStatus
                  item={item}
                  open={openItems.has(item.id)}
                  onWriteReturn={() => onWriteReturn(item.id as number)}
                />
              ) : null;
            }}
            renderDetail={(index) => (
              <PlanQuoteView item={record.treatmentPlan[index]} />
            )}
            rowClick={(index) => {
              const id = record.treatmentPlan[index].id;
              return id != null && followUps.has(id)
                ? () => toggleItem(id)
                : null;
            }}
            renderBelow={(index) => {
              const id = record.treatmentPlan[index].id;
              const list = id != null ? followUps.get(id) : undefined;
              return id != null && openItems.has(id) && list?.length ? (
                <PlanFollowUps
                  planItemId={id}
                  records={list}
                  expanded={expanded}
                  chargeByVisit={chargeByVisit}
                  onEdit={onEditRecord}
                  onDelete={onDeleteRecord}
                />
              ) : null;
            }}
          />
        );
      }
    } else if (isEntryField(field)) {
      if (record[field].length) {
        content = <ToothEntriesView entries={record[field]} />;
      }
    } else if (record[field]) {
      content = <span className="whitespace-pre-wrap">{record[field]}</span>;
    }
    if (content) {
      rows.push({
        key: field,
        label: MEDICAL_RECORD_FIELD_LABELS[field],
        content,
      });
    }
  }
  return (
    <div className="flex flex-col divide-y">
      {rows.map((row) => (
        <div
          key={row.key}
          className="grid grid-cols-[5rem_1fr] items-center gap-2 py-3 first:pt-0 last:pb-0"
        >
          <span className="text-muted-foreground">{row.label}</span>
          {row.content}
        </div>
      ))}
    </div>
  );
}

function recordCourseStatus(record: MedicalRecord) {
  return record.type === "first"
    ? planCourseStatus(record.treatmentPlan, record.planStoppedAt)
    : "none";
}

function planProgress(record: MedicalRecord): string | null {
  const status = recordCourseStatus(record);
  if (status === "none") return null;
  if (status === "done") return "疗程完成";
  const done = record.treatmentPlan.filter((i) => i.doneDate).length;
  const progress = `疗程进度 ${done}/${record.treatmentPlan.length}`;
  return status === "stopped"
    ? `疗程终止 ${record.planStoppedAt} · ${progress}`
    : progress;
}

export function PatientRecordsTab({
  patientId,
  focusRecordId,
  onEditingChange,
}: {
  patientId: number;
  focusRecordId: number | null;
  onEditingChange: (editing: boolean) => void;
}) {
  const [records, setRecords] = React.useState<MedicalRecord[]>([]);
  const [visits, setVisits] = React.useState<PatientVisit[]>([]);
  const [charges, setCharges] = React.useState<ChargeOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<{
    record: MedicalRecord | null;
    plan: ReturnPlan | null;
  } | null>(null);
  const [expanded, setExpanded] = React.useState<Set<number>>(
    () => new Set(focusRecordId != null ? [focusRecordId] : []),
  );
  const [deleting, setDeleting] = React.useState<MedicalRecord | null>(null);
  const [stopping, setStopping] = React.useState<MedicalRecord | null>(null);

  const isEditing = editing != null;
  React.useEffect(() => {
    onEditingChange(isEditing);
    return () => onEditingChange(false);
  }, [isEditing, onEditingChange]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [r, v, c] = await Promise.all([
        api<MedicalRecord[]>("GET", `/medical-records?patientId=${patientId}`),
        api<PatientVisit[]>("GET", `/visits?patientId=${patientId}`),
        api<ChargesResponse>("GET", `/charges?patientId=${patientId}`),
      ]);
      setRecords(r);
      setVisits(v);
      setCharges(c.orders);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await api("DELETE", `/medical-records/${deleting.id}`);
      toast.success("已删除");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(null);
    }
  }

  async function setPlanStopped(record: MedicalRecord, stopped: boolean) {
    try {
      await api("PUT", `/medical-records/${record.id}/plan-stopped`, {
        stopped,
      });
      toast.success(stopped ? "已终止疗程" : "已恢复疗程");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setStopping(null);
    }
  }

  if (editing) {
    return (
      <MedicalRecordEditor
        patientId={patientId}
        record={editing.record}
        plan={editing.plan}
        visits={visits}
        onCancel={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await load();
        }}
      />
    );
  }

  const timeline = records.filter((r) => !r.planLinks.length);
  const chargeByVisit = new Map<number, VisitCharge>();
  for (const o of charges) {
    if (o.status === "void" || o.visitId == null) continue;
    chargeByVisit.set(
      o.visitId,
      addCharges([chargeByVisit.get(o.visitId) ?? NO_CHARGE, o]),
    );
  }
  const allExpanded =
    timeline.length > 0 && timeline.every((r) => expanded.has(r.id));

  const followUps = new Map<number, MedicalRecord[]>();
  for (const r of [...records].sort((a, b) =>
    `${a.visitDate} ${a.visitTime}`.localeCompare(
      `${b.visitDate} ${b.visitTime}`,
    ),
  )) {
    for (const l of r.planLinks) {
      const list = followUps.get(l.planItemId) ?? [];
      list.push(r);
      followUps.set(l.planItemId, list);
    }
  }

  /** 初诊合计本次及所有复诊就诊的收费；无收费返回 null */
  function courseCharge(record: MedicalRecord): VisitCharge | null {
    const visitIds = new Set<number>();
    if (record.visitId != null) visitIds.add(record.visitId);
    for (const item of record.treatmentPlan) {
      if (item.id == null) continue;
      for (const r of followUps.get(item.id) ?? []) {
        if (r.visitId != null) visitIds.add(r.visitId);
      }
    }
    const amounts = [...visitIds]
      .filter((id) => chargeByVisit.has(id))
      .map((id) => chargeByVisit.get(id)!);
    return amounts.length ? addCharges(amounts) : null;
  }

  function editRecord(r: MedicalRecord) {
    const first = r.planLinks.length
      ? records.find((f) =>
          f.treatmentPlan.some((i) => i.id === r.planLinks[0].planItemId),
        )
      : undefined;
    setEditing({
      record: r,
      plan: first
        ? {
            items: first.treatmentPlan,
            startItemId: null,
            doctor: first.doctor,
          }
        : null,
    });
  }

  return (
    <Card>
      <CardHeader className="space-y-0">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!timeline.length}
            onClick={() =>
              setExpanded(
                allExpanded ? new Set() : new Set(timeline.map((r) => r.id)),
              )
            }
          >
            {allExpanded ? "全部收起" : "全部展开"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditing({ record: null, plan: null })}
          >
            <Plus className="size-3.5" />
            新建病历
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative flex flex-col gap-4">
        {!loading && !timeline.length ? (
          <div className="py-8 text-center text-muted-foreground">暂无病历</div>
        ) : null}
        <div className="flex flex-col">
          {timeline.map((record) => {
            const isOpen = expanded.has(record.id);
            return (
              <div key={record.id} className="grid grid-cols-[7rem_1fr]">
                <div className="relative border-r pt-[17px] pr-5 text-right text-primary tabular-nums">
                  <div className="flex h-8 flex-col justify-center">
                    <div>{record.visitDate}</div>
                    <div>{record.visitTime}</div>
                  </div>
                  <span className="absolute top-[27px] -right-[6.5px] size-3 rounded-full border-2 border-primary bg-background" />
                </div>
                <div className="pb-4 pl-5">
                  <div className="flex flex-col gap-3 rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="secondary" className="h-auto text-sm">
                          {medicalRecordTypeLabel(record.type)}
                        </Badge>
                        {planProgress(record) ? (
                          <Badge variant="outline" className="h-auto text-sm">
                            {planProgress(record)}
                          </Badge>
                        ) : null}
                        {record.doctor ? (
                          <span className="text-muted-foreground">
                            医生：{record.doctor}
                          </span>
                        ) : null}
                        {record.assistant ? (
                          <span className="text-muted-foreground">
                            助理：{record.assistant}
                          </span>
                        ) : null}
                        {record.nurse ? (
                          <span className="text-muted-foreground">
                            护士：{record.nurse}
                          </span>
                        ) : null}
                        {courseCharge(record) != null ? (
                          <ChargeSummary
                            charge={courseCharge(record)!}
                            prefix={record.type === "first" ? "疗程" : ""}
                          />
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => toggle(record.id)}
                        >
                          {isOpen ? "收起" : "展开详情"}
                        </Button>
                        {recordCourseStatus(record) === "pending" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setStopping(record)}
                          >
                            终止疗程
                          </Button>
                        ) : null}
                        {recordCourseStatus(record) === "stopped" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => void setPlanStopped(record, false)}
                          >
                            恢复疗程
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => editRecord(record)}
                        >
                          编辑
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setDeleting(record)}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                    <RecordBody
                      record={record}
                      expanded={isOpen}
                      followUps={followUps}
                      chargeByVisit={chargeByVisit}
                      onWriteReturn={(startItemId) =>
                        setEditing({
                          record: null,
                          plan: {
                            items: record.treatmentPlan,
                            startItemId,
                            doctor: record.doctor,
                          },
                        })
                      }
                      onEditRecord={editRecord}
                      onDeleteRecord={setDeleting}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
            <Spinner className="size-8 opacity-60" />
          </div>
        ) : null}
      </CardContent>

      <AlertDialog
        open={deleting != null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除 {deleting?.visitDate} 的
              {deleting ? medicalRecordTypeLabel(deleting.type) : ""}吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={stopping != null}
        onOpenChange={(open) => {
          if (!open) setStopping(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>终止疗程</AlertDialogTitle>
            <AlertDialogDescription>
              确定终止 {stopping?.visitDate}{" "}
              初诊的疗程吗？终止后不再出现在工作台待完成疗程中，可随时恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => stopping && void setPlanStopped(stopping, true)}
            >
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
