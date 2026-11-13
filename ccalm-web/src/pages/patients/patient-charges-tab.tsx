import * as React from "react";
import { Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { api } from "@/lib/api";
import { CHARGE_STATE_LABELS, formatMoney } from "@/lib/charges/charge-calc";
import { errorMessage } from "@/lib/errorMessage";
import { cn } from "cn";
import { ChargeOrderEditor } from "./charge-order-editor";
import { ChargePaymentDialog } from "./charge-payment-dialog";
import type {
  ChargeOrder,
  ChargesResponse,
  PatientVisit,
} from "./patient-detail-types";

type Confirm = { order: ChargeOrder; action: "void" | "delete" };

function SummaryItem({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-2xl font-medium tabular-nums",
          danger && value > 0 && "text-destructive",
        )}
      >
        {formatMoney(value)}
      </span>
    </div>
  );
}

export function PatientChargesTab({ patientId }: { patientId: number }) {
  const [data, setData] = React.useState<ChargesResponse>({
    summary: { receivable: 0, paid: 0, owed: 0 },
    orders: [],
  });
  const [visits, setVisits] = React.useState<PatientVisit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const chargeParam = searchParams.get("charge");
  const [paying, setPaying] = React.useState<ChargeOrder | null>(null);
  const [confirm, setConfirm] = React.useState<Confirm | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [c, v] = await Promise.all([
        api<ChargesResponse>("GET", `/charges?patientId=${patientId}`),
        api<PatientVisit[]>("GET", `/visits?patientId=${patientId}`),
      ]);
      setData(c);
      setVisits(v);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function openEditor(target: number | "new" | null) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (target == null) next.delete("charge");
      else next.set("charge", String(target));
      return next;
    });
  }

  const editingOrder =
    chargeParam && chargeParam !== "new"
      ? (data.orders.find(
          (o) => o.id === Number(chargeParam) && o.status !== "void",
        ) ?? null)
      : null;

  if (chargeParam === "new" || editingOrder) {
    return (
      <ChargeOrderEditor
        key={chargeParam}
        patientId={patientId}
        order={editingOrder}
        visits={visits}
        onDone={async (saved) => {
          openEditor(null);
          if (saved) await load();
        }}
      />
    );
  }

  async function runConfirm() {
    if (!confirm) return;
    try {
      if (confirm.action === "void") {
        await api("POST", `/charges/${confirm.order.id}/void`);
        toast.success("已作废");
      } else {
        await api("DELETE", `/charges/${confirm.order.id}`);
        toast.success("已删除");
      }
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setConfirm(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>消费概览</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <SummaryItem label="应收合计" value={data.summary.receivable} />
          <SummaryItem label="实收合计" value={data.summary.paid} />
          <SummaryItem label="欠费" value={data.summary.owed} danger />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-0">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => openEditor("new")}
            >
              <Plus className="size-3.5" />
              新建收费
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <ScrollArea className="w-full max-w-full [&_[data-slot=table-container]]:w-auto [&_[data-slot=table-container]]:overflow-x-visible">
            <Table className="min-w-[960px]">
              <TableHeader>
                <TableRow>
                  <TableHead>收费日期</TableHead>
                  <TableHead>项目</TableHead>
                  <TableHead>医生</TableHead>
                  <TableHead>应收</TableHead>
                  <TableHead>实收</TableHead>
                  <TableHead>欠费</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr:nth-child(odd)]:bg-muted/30">
                {!loading && !data.orders.length ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-muted-foreground">
                      暂无收费记录
                    </TableCell>
                  </TableRow>
                ) : null}
                {data.orders.map((o) => (
                  <TableRow
                    key={o.id}
                    className={cn(
                      o.status === "void" && "text-muted-foreground",
                    )}
                  >
                    <TableCell>{o.chargeDate}</TableCell>
                    <TableCell className="max-w-48 truncate">
                      {o.items.map((i) => i.name).join("、")}
                    </TableCell>
                    <TableCell>{o.doctor}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatMoney(o.receivable)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatMoney(o.paid)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "tabular-nums",
                        o.owed > 0 && "text-destructive",
                      )}
                    >
                      {formatMoney(o.owed)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          o.state === "owing" ? "destructive" : "secondary"
                        }
                      >
                        {CHARGE_STATE_LABELS[o.state]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-32 truncate">
                      {o.remark}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setPaying(o)}
                        >
                          {o.state === "owing" ? "收款" : "收款记录"}
                        </Button>
                        {o.status !== "void" ? (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => openEditor(o.id)}
                            >
                              编辑
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() =>
                                setConfirm({ order: o, action: "void" })
                              }
                            >
                              作废
                            </Button>
                          </>
                        ) : null}
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            setConfirm({ order: o, action: "delete" })
                          }
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
              <Spinner className="size-8 opacity-60" />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ChargePaymentDialog
        open={paying != null}
        onOpenChange={(open) => {
          if (!open) setPaying(null);
        }}
        order={paying}
        onSaved={load}
      />

      <AlertDialog
        open={confirm != null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "void" ? "作废" : "删除"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "void"
                ? `确定作废 ${confirm.order.chargeDate} 的收费单吗？作废后不再计入应收和欠费。`
                : `确定删除 ${confirm?.order.chargeDate ?? ""} 的收费单吗？收款记录会一并删除。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void runConfirm()}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
