import * as React from "react";
import dayjs from "dayjs";

import { Card, CardContent } from "@/components/ui/card";
import { MonthPickerField } from "@/components/month-picker-field";
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
    amount: number;
  }>;
};

function formatMoney(n: number) {
  return n.toFixed(2);
}

export function WarehouseStatsPage() {
  const [month, setMonth] = React.useState(dayjs().format("YYYY-MM"));
  const [stats, setStats] = React.useState<PurchaseStats | null>(null);

  async function load(targetMonth: string) {
    try {
      const data = await api<PurchaseStats>(
        "GET",
        `/warehouse/stats/purchase?month=${encodeURIComponent(targetMonth)}`,
      );
      setStats(data);
    } catch (e) {
      toast.error(errorMessage(e));
      setStats(null);
    }
  }

  React.useEffect(() => {
    void load(month);
  }, [month]);

  return (
    <div className="bg-background p-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">月份</span>
              <MonthPickerField value={month} onValueChange={setMonth} />
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
                  <TableHead className="w-[14%]">编码</TableHead>
                  <TableHead className="w-[22%]">名称</TableHead>
                  <TableHead className="w-[18%]">规格</TableHead>
                  <TableHead className="w-[10%]">单位</TableHead>
                  <TableHead className="w-[16%] text-center">采购数量</TableHead>
                  <TableHead className="w-[20%] text-center">采购金额</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.byItem.map((row) => (
                  <TableRow key={row.itemId}>
                    <TableCell>{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.spec || "-"}</TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell className="text-center">{row.qty}</TableCell>
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
