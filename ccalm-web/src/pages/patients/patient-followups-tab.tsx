import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { CompleteFollowUpDialog } from "@/components/follow-ups/complete-follow-up-dialog";
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
import {
  followUpSatisfactionLabel,
  followUpStatusLabel,
  followUpTypeLabel,
} from "@/lib/follow-ups/options";
import type { FollowUp } from "@/lib/follow-ups/types";
import { FollowUpDialog } from "./follow-up-dialog";

export function PatientFollowUpsTab({ patientId }: { patientId: number }) {
  const [rows, setRows] = React.useState<FollowUp[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FollowUp | null>(null);
  const [completing, setCompleting] = React.useState<FollowUp | null>(null);
  const [cancelling, setCancelling] = React.useState<FollowUp | null>(null);
  const [deleting, setDeleting] = React.useState<FollowUp | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setRows(
        await api<FollowUp[]>("GET", `/follow-ups?patientId=${patientId}`),
      );
    } catch (e) {
      toast.error(errorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function cancel() {
    if (!cancelling) return;
    try {
      await api("POST", `/follow-ups/${cancelling.id}/cancel`);
      toast.success("已取消");
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setCancelling(null);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await api("DELETE", `/follow-ups/${deleting.id}`);
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
      <CardHeader className="space-y-0">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-3.5" />
            新建随访
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>计划日期</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>内容</TableHead>
              <TableHead>医生 / 经办</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>随访结果</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  暂无随访
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.planDate}</TableCell>
                  <TableCell>{followUpTypeLabel(row.type)}</TableCell>
                  <TableCell className="max-w-72 truncate">
                    {row.content}
                  </TableCell>
                  <TableCell>{row.doctor}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {followUpStatusLabel(row.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-72 truncate">
                    {row.result}
                    {row.satisfaction
                      ? `（${followUpSatisfactionLabel(row.satisfaction)}）`
                      : ""}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {row.status === "pending" ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setCompleting(row)}
                          >
                            执行
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setEditing(row);
                              setDialogOpen(true);
                            }}
                          >
                            编辑
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setCancelling(row)}
                          >
                            取消
                          </Button>
                        </>
                      ) : null}
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setDeleting(row)}
                      >
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
            <Spinner className="size-8 opacity-60" />
          </div>
        ) : null}
      </CardContent>

      <FollowUpDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={patientId}
        followUp={editing}
        onSaved={load}
      />
      <CompleteFollowUpDialog
        open={completing != null}
        onOpenChange={(open) => {
          if (!open) setCompleting(null);
        }}
        followUp={completing}
        onDone={load}
      />

      <AlertDialog
        open={cancelling != null}
        onOpenChange={(open) => {
          if (!open) setCancelling(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>取消随访</AlertDialogTitle>
            <AlertDialogDescription>
              确定取消 {cancelling?.planDate} 的随访吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>返回</AlertDialogCancel>
            <AlertDialogAction onClick={() => void cancel()}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleting != null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除随访</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除 {deleting?.planDate} 的随访吗？删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
