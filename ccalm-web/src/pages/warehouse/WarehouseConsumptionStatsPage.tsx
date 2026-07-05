import * as React from "react";
import dayjs from "dayjs";

import { DateRangePickerField, type DateRangeValue } from "@/components/date-range-picker-field";
import { SortableTableHead } from "@/components/sortable-table-head";
import { TruncateCell } from "@/components/truncate-cell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { toast } from "sonner";

type ConsumptionStats = {
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
  a: ConsumptionStats["byItem"][number],
  b: ConsumptionStats["byItem"][number],
  sort: StatsSort,
): number {
  const cmp =
    sort.key === "qty" || sort.key === "unitPrice" || sort.key === "amount"
      ? a[sort.key] - b[sort.key]
      : (a[sort.key] ?? "").toString().localeCompare((b[sort.key] ?? "").toString(), "zh-CN", {
          numeric: true,
        });
  return sort.dir === "asc" ? cmp : -cmp;
}

export function WarehouseConsumptionStatsPage() {
  const [dateRange, setDateRange] = React.useState<DateRangeValue>(defaultDateRange);
  const [stats, setStats] = React.useState<ConsumptionStats | null>(null);
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
      const data = await api<ConsumptionStats>(
        "GET",
        `/warehouse/stats/consumption${params.size ? `?${params.toString()}` : ""}`,
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
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
      <Card className="w-full min-w-0">
        <CardHeader className="flex flex-row flex-wrap items-center gap-2 space-y-0">
          <DateRangePickerField value={dateRange} onValueChange={setDateRange} />
        </CardHeader>
        <CardContent className="[&_[data-slot=table-container]]:w-auto [&_[data-slot=table-container]]:overflow-x-visible">
          <ScrollArea className="w-full max-w-full">
            <div className="flex w-max flex-col gap-4">
              <div className="grid w-full grid-cols-3 gap-3">
                <Card className="border border-border shadow-xs ring-0">
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">消耗金额</div>
                    <div className="text-2xl font-semibold">
                      {formatMoney(stats?.totalAmount ?? 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-border shadow-xs ring-0">
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">消耗数量</div>
                    <div className="text-2xl font-semibold">{stats?.totalQty ?? 0}</div>
                  </CardContent>
                </Card>
                <Card className="border border-border shadow-xs ring-0">
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">消耗品种</div>
                    <div className="text-2xl font-semibold">{stats?.byItem.length ?? 0}</div>
                  </CardContent>
                </Card>
              </div>

              <Table className="w-max">
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      label="编码"
                      sortKey="code"
                      activeSort={statsSort}
                      onSort={toggleStatsSort}
                    />
                    <SortableTableHead
                      label="名称"
                      sortKey="name"
                      activeSort={statsSort}
                      onSort={toggleStatsSort}
                    />
                    <SortableTableHead
                      label="规格"
                      sortKey="spec"
                      activeSort={statsSort}
                      onSort={toggleStatsSort}
                    />
                    <SortableTableHead
                      label="单位"
                      sortKey="unit"
                      activeSort={statsSort}
                      onSort={toggleStatsSort}
                    />
                    <SortableTableHead
                      label="消耗数量"
                      sortKey="qty"
                      activeSort={statsSort}
                      onSort={toggleStatsSort}
                    />
                    <SortableTableHead
                      label="单价"
                      sortKey="unitPrice"
                      activeSort={statsSort}
                      onSort={toggleStatsSort}
                    />
                    <SortableTableHead
                      label="消耗金额"
                      sortKey="amount"
                      activeSort={statsSort}
                      onSort={toggleStatsSort}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRows.map((row) => (
                    <TableRow key={row.itemId}>
                      <TableCell>
                        <TruncateCell title={row.code}>{row.code}</TruncateCell>
                      </TableCell>
                      <TableCell>
                        <TruncateCell title={row.name}>{row.name}</TruncateCell>
                      </TableCell>
                      <TableCell>
                        <TruncateCell title={row.spec || undefined}>{row.spec || "-"}</TruncateCell>
                      </TableCell>
                      <TableCell>
                        <TruncateCell title={row.unit}>{row.unit}</TruncateCell>
                      </TableCell>
                      <TableCell className="text-center">{row.qty}</TableCell>
                      <TableCell className="text-center">{formatMoney(row.unitPrice)}</TableCell>
                      <TableCell className="text-center">{formatMoney(row.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
