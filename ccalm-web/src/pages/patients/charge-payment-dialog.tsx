import * as React from "react";
import dayjs from "dayjs";
import { toast } from "sonner";

import { DatePickerField } from "@/components/date-picker-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatMoney, PAY_METHODS } from "@/lib/charges/charge-calc";
import { errorMessage } from "@/lib/errorMessage";
import { visitKindLabel } from "@/lib/visits/visit-options";
import type { ChargeOrder, PatientVisit } from "./patient-detail-types";

const NO_VISIT = "none";

export function ChargePaymentDialog({
  open,
  onOpenChange,
  order,
  visits,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ChargeOrder | null;
  visits: PatientVisit[];
  onSaved: () => void | Promise<void>;
}) {
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState(PAY_METHODS[0]);
  const [paidAt, setPaidAt] = React.useState("");
  const [visitId, setVisitId] = React.useState(NO_VISIT);
  const [doctor, setDoctor] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const doctorItems = [
    ...new Set(
      [order?.doctor ?? "", ...visits.map((v) => v.doctor)].filter(Boolean),
    ),
  ].map((name) => ({ value: name, label: name }));

  const visitItems = [
    { value: NO_VISIT, label: "不关联就诊" },
    ...visits.map((v) => ({
      value: String(v.id),
      label: `${v.visitDate} ${visitKindLabel(v.kind)}`,
    })),
  ];

  React.useEffect(() => {
    if (open && order) {
      setAmount(order.owed > 0 ? String(order.owed) : "");
      setMethod(PAY_METHODS[0]);
      setPaidAt(dayjs().format("YYYY-MM-DD"));
      setVisitId(NO_VISIT);
      setDoctor(order.doctor || "");
    }
  }, [open, order]);

  async function save() {
    if (!order) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("请填写收款金额");
      return;
    }
    if (value > order.owed) {
      toast.error("收款金额不能超过欠费");
      return;
    }
    setSaving(true);
    try {
      await api("POST", `/charges/${order.id}/payments`, {
        amount: value,
        method,
        doctor,
        paidAt,
        visitId: visitId === NO_VISIT ? undefined : Number(visitId),
      });
      toast.success("已收款");
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>收款</DialogTitle>
        </DialogHeader>
        {order ? (
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-2 tabular-nums">
              <div>
                <div className="text-muted-foreground">应收</div>
                <div className="font-medium">
                  {formatMoney(order.receivable)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">已收</div>
                <div className="font-medium">{formatMoney(order.paid)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">欠费</div>
                <div className="font-medium text-destructive">
                  {formatMoney(order.owed)}
                </div>
              </div>
            </div>
            {order.payments.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead>方式</TableHead>
                    <TableHead>医生</TableHead>
                    <TableHead>就诊</TableHead>
                    <TableHead>金额</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.paidAt}</TableCell>
                      <TableCell>{p.method || "—"}</TableCell>
                      <TableCell>{p.doctor || "—"}</TableCell>
                      <TableCell>
                        {p.visitDate
                          ? `${p.visitDate}${
                              p.visitKind
                                ? ` ${visitKindLabel(p.visitKind)}`
                                : ""
                            }`
                          : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatMoney(p.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
            {order.owed > 0 && order.status !== "void" ? (
              <>
                <Input
                  type="number"
                  min={0}
                  placeholder="收款金额"
                  className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    value={method}
                    onValueChange={(v: string | null) => {
                      if (v) setMethod(v);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {PAY_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <DatePickerField
                    value={paidAt}
                    onValueChange={setPaidAt}
                    placeholder="收款日期"
                  />
                </div>
                <div className="grid gap-1.5">
                  <span className="text-muted-foreground">收款医生</span>
                  <Select
                    items={doctorItems}
                    value={doctor}
                    onValueChange={(v: string | null) => setDoctor(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择医生" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {doctorItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <span className="text-muted-foreground">关联就诊</span>
                  <Select
                    items={visitItems}
                    value={visitId}
                    onValueChange={(v: string | null) => {
                      if (v) setVisitId(v);
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
                </div>
              </>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          {order && order.owed > 0 && order.status !== "void" ? (
            <Button type="button" disabled={saving} onClick={() => void save()}>
              确定
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
