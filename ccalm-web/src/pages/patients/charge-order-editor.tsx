import * as React from "react";
import dayjs from "dayjs";
import { X } from "lucide-react";
import { toast } from "sonner";

import { DatePickerField } from "@/components/date-picker-field";
import { ToothPositionField } from "@/components/tooth-chart/ToothPositionField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  chargeItemAmount,
  formatMoney,
  PAY_METHODS,
  sumMoney,
} from "@/lib/charges/charge-calc";
import { errorMessage } from "@/lib/errorMessage";
import type { FeeCategory, FeeItem } from "@/lib/fee-catalog/types";
import { visitKindLabel, visitTimeRange } from "@/lib/visits/visit-options";
import { FeeCatalogPanel } from "./fee-catalog-panel";
import type { ChargeOrder, PatientVisit } from "./patient-detail-types";
import { StaffCombobox } from "./staff-combobox";

type ItemForm = {
  feeItemId: number | null;
  name: string;
  teeth: string;
  unitPrice: string;
  quantity: string;
};

type FormState = {
  chargeDate: string;
  doctor: string;
  visitLink: string;
  remark: string;
  items: ItemForm[];
  paidAmount: string;
  payMethod: string;
};

const NO_VISIT = "none";
const NUMBER_INPUT =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function toForm(order: ChargeOrder | null): FormState {
  return {
    chargeDate: order?.chargeDate ?? dayjs().format("YYYY-MM-DD"),
    doctor: order?.doctor ?? "",
    visitLink: order?.visitId != null ? String(order.visitId) : NO_VISIT,
    remark: order?.remark ?? "",
    items:
      order?.items.map((i) => ({
        feeItemId: i.feeItemId,
        name: i.name,
        teeth: i.teeth,
        unitPrice: String(i.unitPrice),
        quantity: String(i.quantity),
      })) ?? [],
    paidAmount: "",
    payMethod: PAY_METHODS[0],
  };
}

function itemAmount(item: ItemForm): number {
  const price = Number(item.unitPrice);
  const qty = Number(item.quantity);
  if (!Number.isFinite(price) || !Number.isFinite(qty)) return 0;
  return chargeItemAmount(price, qty);
}

export function ChargeOrderEditor({
  patientId,
  order,
  visits,
  onDone,
}: {
  patientId: number;
  order: ChargeOrder | null;
  visits: PatientVisit[];
  onDone: (saved: boolean) => void | Promise<void>;
}) {
  const [form, setForm] = React.useState<FormState>(() => toForm(order));
  const [categories, setCategories] = React.useState<FeeCategory[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    api<FeeCategory[]>("GET", "/fee-catalog")
      .then(setCategories)
      .catch((e: unknown) => toast.error(errorMessage(e)));
  }, []);

  const visitItems = [
    { value: NO_VISIT, label: "不关联就诊" },
    ...visits.map((v) => ({
      value: String(v.id),
      label: `${v.visitDate} ${visitTimeRange(v.startTime, v.endTime)} ${visitKindLabel(v.kind)}`,
    })),
  ];
  const receivable = sumMoney(form.items.map(itemAmount));

  function updateItem(index: number, patch: Partial<ItemForm>) {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addFeeItem(fee: FeeItem) {
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          feeItemId: fee.id,
          name: fee.name,
          teeth: "",
          unitPrice: String(fee.price),
          quantity: "1",
        },
      ],
    }));
  }

  async function save() {
    const items = form.items.map((i) => ({
      feeItemId: i.feeItemId,
      name: i.name,
      teeth: i.teeth,
      unitPrice: Number(i.unitPrice),
      quantity: Number(i.quantity),
    }));
    if (!items.length) {
      toast.error("请从左侧选择收费项目");
      return;
    }
    if (
      items.some(
        (i) =>
          !Number.isFinite(i.unitPrice) ||
          i.unitPrice < 0 ||
          !Number.isInteger(i.quantity) ||
          i.quantity < 1,
      )
    ) {
      toast.error("单价或数量无效");
      return;
    }
    const paidAmount = Number(form.paidAmount || 0);
    if (!order && (!Number.isFinite(paidAmount) || paidAmount < 0)) {
      toast.error("实收金额无效");
      return;
    }
    setSaving(true);
    try {
      const body = {
        patientId,
        visitId: form.visitLink === NO_VISIT ? null : Number(form.visitLink),
        chargeDate: form.chargeDate,
        doctor: form.doctor.trim(),
        remark: form.remark.trim(),
        items,
      };
      if (order) {
        await api("PUT", `/charges/${order.id}`, body);
      } else {
        await api("POST", "/charges", {
          ...body,
          paidAmount,
          payMethod: form.payMethod,
        });
      }
      toast.success("已保存");
      await onDone(true);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <FeeCatalogPanel categories={categories} onPick={addFeeItem} />
      <Card>
        <CardHeader>
          <CardTitle>{order ? "编辑收费单" : "新建收费单"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <DatePickerField
              value={form.chargeDate}
              onValueChange={(v) => setForm((f) => ({ ...f, chargeDate: v }))}
              placeholder="收费日期"
            />
            <StaffCombobox
              placeholder="医生"
              value={form.doctor}
              onValueChange={(v) => setForm((f) => ({ ...f, doctor: v }))}
            />
            <Select
              items={visitItems}
              value={form.visitLink}
              onValueChange={(v: string | null) => {
                if (!v) return;
                const visit = visits.find((x) => String(x.id) === v);
                setForm((f) => ({
                  ...f,
                  visitLink: v,
                  chargeDate: visit?.visitDate ?? f.chargeDate,
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
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">牙位</TableHead>
                <TableHead>项目</TableHead>
                <TableHead className="w-28">单价</TableHead>
                <TableHead className="w-20">数量</TableHead>
                <TableHead className="w-28">金额</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!form.items.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    从左侧选择收费项目
                  </TableCell>
                </TableRow>
              ) : null}
              {form.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <ToothPositionField
                      plain
                      className="justify-center"
                      value={item.teeth}
                      onValueChange={(teeth) => updateItem(index, { teeth })}
                    />
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      placeholder="单价"
                      className={NUMBER_INPUT}
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(index, { unitPrice: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      className={NUMBER_INPUT}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, { quantity: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatMoney(itemAmount(item))}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          items: f.items.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      <X />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end">
            <span className="font-medium tabular-nums">
              应收合计：{formatMoney(receivable)}
            </span>
          </div>

          {order ? null : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                type="number"
                min={0}
                placeholder="本次实收（不填即全部欠费）"
                className={NUMBER_INPUT}
                value={form.paidAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paidAmount: e.target.value }))
                }
              />
              <Select
                value={form.payMethod}
                onValueChange={(v: string | null) => {
                  if (v) setForm((f) => ({ ...f, payMethod: v }));
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
            </div>
          )}
          <Input
            placeholder="备注"
            value={form.remark}
            onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void onDone(false)}
            >
              取消
            </Button>
            <Button type="button" disabled={saving} onClick={() => void save()}>
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
