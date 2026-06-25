import * as React from "react";
import dayjs from "dayjs";

import { Card, CardContent } from "@/components/ui/card";
import { DateRangePickerField, type DateRangeValue } from "@/components/date-range-picker-field";
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
import { toast } from "@/components/ui/sonner";

type PurchaseStats = {
  month: string;
  totalAmount: number;
  totalQty: number;
  txnCount: number;
  byItem: Array<{
    itemId: number;
    code: string;
    name: string;
    spec: string;
    unit: string;
    qty: number;
    unitPrice: number;
    amount: number;
  }>;
};

function formatMoney(n: number) {
  return n.toFixed(2);
}

function defaultDateRange(): DateRangeValue {
  return {
    from: dayjs().startOf("month").format("YYYY-MM-DD"),
    to: dayjs().format("YYYY-MM-DD"),
  };
}

function TruncateCell({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="truncate text-left" title={title ?? (typeof children === "string" ? children : undefined)}>
      {children}
    </div>
  );
}

export function WarehouseStatsPage() {
  const [dateRange, setDateRange] = React.useState<DateRangeValue>(defaultDateRange);
  const [stats, setStats] = React.useState<PurchaseStats | null>(null);

  async function load(targetRange: DateRangeValue) {
    try {
      const params = new URLSearchParams();
      if (targetRange.from) params.set("startDate", targetRange.from);
      if (targetRange.to) params.set("endDate", targetRange.to);
      const data = await api<PurchaseStats>(
        "GET",
        `/warehouse/stats/purchase${params.size ? `?${params.toString()}` : ""}`,
      );
      setStats(data);
    } catch (e) {
      toast.error(errorMessage(e));
      setStats(null);
    }
  }

  React.useEffect(() => {
    void load(dateRange);
  }, [dateRange]);

  return (
    <div className="bg-background p-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <DateRangePickerField value={dateRange} onValueChange={setDateRange} />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">采购金额</div>
                  <div className="text-2xl font-semibold">
                    {formatMoney(stats?.totalAmount ?? 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">采购数量</div>
                  <div className="text-2xl font-semibold">{stats?.totalQty ?? 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">采购笔数</div>
                  <div className="text-2xl font-semibold">{stats?.txnCount ?? 0}</div>
                </CardContent>
              </Card>
            </div>

            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[12%]">编码</TableHead>
                  <TableHead className="w-[24%]">名称</TableHead>
                  <TableHead className="w-[16%]">规格</TableHead>
                  <TableHead className="w-[8%]">单位</TableHead>
                  <TableHead className="w-[12%] text-center">采购数量</TableHead>
                  <TableHead className="w-[12%] text-center">单价</TableHead>
                  <TableHead className="w-[16%] text-center">采购金额</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.byItem.map((row) => (
                  <TableRow key={row.itemId}>
                    <TableCell className="max-w-0">
                      <TruncateCell title={row.code}>{row.code}</TruncateCell>
                    </TableCell>
                    <TableCell className="max-w-0">
                      <TruncateCell title={row.name}>{row.name}</TruncateCell>
                    </TableCell>
                    <TableCell className="max-w-0">
                      <TruncateCell title={row.spec || undefined}>{row.spec || "-"}</TruncateCell>
                    </TableCell>
                    <TableCell className="text-center">{row.unit}</TableCell>
                    <TableCell className="text-center">{row.qty}</TableCell>
                    <TableCell className="text-center">{formatMoney(row.unitPrice)}</TableCell>
                    <TableCell className="text-center">{formatMoney(row.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
