import * as React from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Timeline,
  TimelineContent,
  TimelineDescription,
  TimelineIndicator,
  TimelineItem,
  TimelineTime,
  TimelineTitle,
} from "@/components/ui/timeline";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import {
  visitKindLabel,
  visitStatusLabel,
  visitTimeRange,
} from "@/lib/visits/visit-options";
import type { PatientTab, PatientVisit } from "./patient-detail-types";

export function PatientVisitsTab({
  patientId,
  onOpenTab,
}: {
  patientId: number;
  onOpenTab: (tab: PatientTab, recordId?: number) => void;
}) {
  const [visits, setVisits] = React.useState<PatientVisit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState<PatientVisit | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setVisits(
        await api<PatientVisit[]>("GET", `/visits?patientId=${patientId}`),
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await api("DELETE", `/visits/${deleting.id}`);
      toast.success("已删除");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardContent className="relative">
        {!loading && !visits.length ? (
          <div className="py-8 text-center text-muted-foreground">
            暂无就诊记录
          </div>
        ) : null}
        <Timeline className="gap-y-0">
          {visits.map((v) => (
            <TimelineItem key={v.id} className="items-stretch">
              <TimelineTime className="w-24 items-start py-4 font-medium">
                {v.visitDate}
              </TimelineTime>
              <TimelineIndicator />
              <TimelineContent className="flex-1 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <TimelineTitle className="flex flex-wrap items-center gap-2">
                    <span className="tabular-nums">
                      {visitTimeRange(v.startTime, v.endTime)}
                    </span>
                    <span>{visitKindLabel(v.kind)}</span>
                    <Badge variant="secondary">
                      {visitStatusLabel(v.status)}
                    </Badge>
                  </TimelineTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    {v.medicalRecordIds.length ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          onOpenTab("records", v.medicalRecordIds[0])
                        }
                      >
                        电子病历
                      </Button>
                    ) : null}
                    {v.chargeOrderIds.length ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onOpenTab("charges")}
                      >
                        收费
                      </Button>
                    ) : null}

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setDeleting(v)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
                <TimelineDescription className="flex flex-col gap-1">
                  {v.doctor ? <span>医生：{v.doctor}</span> : null}
                  {v.remark ? <span>备注：{v.remark}</span> : null}
                </TimelineDescription>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
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
              确定删除 {deleting?.visitDate}{" "}
              的就诊记录吗？关联的病历和收费单会保留。
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
    </Card>
  );
}
