import * as React from "react";
import dayjs from "dayjs";
import { ChevronLeft } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/config/routes";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { rememberRecentPatient } from "@/lib/patients/recent-patients";
import { PatientChargesTab } from "./patient-charges-tab";
import type { PatientDetail, PatientTab } from "./patient-detail-types";
import { PatientFollowUpsTab } from "./patient-followups-tab";
import { PatientFormDialog } from "./patient-form-dialog";
import { PatientInfoTab } from "./patient-info-tab";
import { PatientRecordsTab } from "./patient-records-tab";
import { PatientSidebar } from "./patient-sidebar";
import { PatientVisitsTab } from "./patient-visits-tab";

const TABS: { value: PatientTab; label: string }[] = [
  { value: "info", label: "患者信息" },
  { value: "visits", label: "就诊记录" },
  { value: "records", label: "电子病历" },
  { value: "followUp", label: "随访" },
  { value: "charges", label: "收费" },
];

function parseTab(raw: string | null): PatientTab {
  return TABS.some((t) => t.value === raw) ? (raw as PatientTab) : "info";
}

function patientAge(patient: PatientDetail): number | null {
  if (patient.birthday) return dayjs().diff(dayjs(patient.birthday), "year");
  return patient.age;
}

export function PatientDetailPage() {
  const { id } = useParams();
  const patientId = Number(id);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const focusRecord = Number(searchParams.get("record"));
  const [patient, setPatient] = React.useState<PatientDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRecord, setEditingRecord] = React.useState(false);
  const load = React.useCallback(async () => {
    setLoading(true);
    setPatient((prev) => (prev?.id === patientId ? prev : null));
    try {
      const p = await api<PatientDetail>("GET", `/patients/${patientId}`);
      setPatient(p);
      rememberRecentPatient({ id: p.id, name: p.name, chartNo: p.chartNo });
    } catch (e) {
      toast.error(errorMessage(e));
      setPatient(null);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function openTab(next: PatientTab, recordId?: number) {
    const params = new URLSearchParams();
    if (next !== "info") params.set("tab", next);
    if (recordId != null) params.set("record", String(recordId));
    setSearchParams(params);
  }

  const age = patient ? patientAge(patient) : null;

  return (
    <div className="flex gap-4 p-4 md:p-6">
      <PatientSidebar defaultTab="recent" currentId={patientId} />
      <div
        key={patientId}
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-4",
          editingRecord && "md:h-[calc(100svh-6.5rem)]",
        )}
      >
        {loading && !patient ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <Spinner className="size-8 opacity-60" />
          </div>
        ) : null}
        {patient ? (
          <>
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <Button
                    variant="outline"
                    size="icon"
                    nativeButton={false}
                    render={<Link to={ROUTES.patients.root} />}
                  >
                    <ChevronLeft />
                  </Button>
                  <span className="text-base font-medium">{patient.name}</span>
                  {patient.chartNo ? (
                    <span className="text-muted-foreground">
                      病历号：{patient.chartNo}
                    </span>
                  ) : null}
                  {patient.gender ? <span>{patient.gender}</span> : null}
                  {age != null ? <span>{age} 岁</span> : null}
                  {patient.phone ? <span>{patient.phone}</span> : null}
                  {patient.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(true)}
                >
                  编辑
                </Button>
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center gap-2">
              {TABS.map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  variant={tab === t.value ? "default" : "outline"}
                  onClick={() => openTab(t.value)}
                >
                  {t.label}
                </Button>
              ))}
            </div>

            {tab === "info" ? <PatientInfoTab patient={patient} /> : null}
            {tab === "visits" ? (
              <PatientVisitsTab patientId={patient.id} onOpenTab={openTab} />
            ) : null}
            {tab === "records" ? (
              <PatientRecordsTab
                patientId={patient.id}
                focusRecordId={focusRecord > 0 ? focusRecord : null}
                onEditingChange={setEditingRecord}
              />
            ) : null}
            {tab === "followUp" ? (
              <PatientFollowUpsTab patientId={patient.id} />
            ) : null}
            {tab === "charges" ? (
              <PatientChargesTab patientId={patient.id} />
            ) : null}

            <PatientFormDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              patientId={patient.id}
              initial={patient}
              onSaved={load}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
