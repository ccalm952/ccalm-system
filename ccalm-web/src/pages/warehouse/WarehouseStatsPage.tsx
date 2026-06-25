import * as React from "react";
import dayjs from "dayjs";

import { DateRangePickerField, type DateRangeValue } from "@/components/date-range-picker-field";
import { SortableTableHead } from "@/components/sortable-table-head";
import { TruncateCell } from "@/components/truncate-cell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
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

type StatsSortKey = "code" | "name" | "spec" | "unit" | "qty" | "unitPrice" | "amount";

type StatsSort = {
  key: StatsSortKey;
  dir: "asc" | "desc";
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

function compareStatsRows(
  a: PurchaseStats["byItem"][number],
  b: PurchaseStats["byItem"][number],
  sort: StatsSort,
): number {
  let cmp = 0;
  if (sort.key === "qty" || sort.key === "unitPrice" || sort.key === "amount") {
    cmp = a[sort.key] - b[sort.key];
  } else {
    const av = (a[sort.key] ?? "").toString();
    const bv = (b[sort.key] ?? "").toString();
    cmp = av.localeCompare(bv, "zh-CN", { numeric: true });
  }
  return sort.dir === "asc" ? cmp : -cmp;
}

export function WarehouseStatsPage() {
  const [dateRange, setDateRange] = React.useState<DateRangeValue>(defaultDateRange);
  const [stats, setStats] = React.useState<PurchaseStats | null>(null);
  const [statsSort, setStatsSort] = React.useState<StatsSort | null>(null);

  const displayRows = React.useMemo(() => {
    const rows = stats?.byItem ?? [];
    if (!statsSort) return rows;
    return [...rows].sort((a, b) => compareStatsRows(a, b, statsSort));
  }, [stats?.byItem, statsSort]);

  function toggleStatsSort(key: StatsSortKey) {
    setStatsSort((prev) => {
      if (prev?.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  }

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
                  <SortableTableHead
                    label="编码"
                    sortKey="code"
                    activeSort={statsSort}
                    onSort={toggleStatsSort}
                    className="w-[12%]"
                  />
                  <SortableTableHead
                    label="名称"
                    sortKey="name"
                    activeSort={statsSort}
                    onSort={toggleStatsSort}
                    className="w-[24%]"
                  />
                  <SortableTableHead
                    label="规格"
                    sortKey="spec"
                    activeSort={statsSort}
                    onSort={toggleStatsSort}
                    className="w-[16%]"
                  />
                  <SortableTableHead
                    label="单位"
                    sortKey="unit"
                    activeSort={statsSort}
                    onSort={toggleStatsSort}
                    className="w-[8%]"
                  />
                  <SortableTableHead
                    label="采购数量"
                    sortKey="qty"
                    activeSort={statsSort}
                    onSort={toggleStatsSort}
                    className="w-[12%]"
                    align="center"
                  />
                  <SortableTableHead
                    label="单价"
                    sortKey="unitPrice"
                    activeSort={statsSort}
                    onSort={toggleStatsSort}
                    className="w-[12%]"
                    align="center"
                  />
                  <SortableTableHead
                    label="采购金额"
                    sortKey="amount"
                    activeSort={statsSort}
                    onSort={toggleStatsSort}
                    className="w-[16%]"
                    align="center"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map((row) => (
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
