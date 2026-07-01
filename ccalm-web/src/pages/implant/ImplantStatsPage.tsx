import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
import { errorMessage } from "@/lib/errorMessage";
import { toast } from "sonner";

type StaffRow = { name: string; count: number };

export function ImplantStatsPage() {
  const [staffRows, setStaffRows] = React.useState<StaffRow[]>([]);
  const [monthItems, setMonthItems] = React.useState<{ label: string; value: string }[]>([]);
  const [month, setMonth] = React.useState("");
  const [monthTotal, setMonthTotal] = React.useState(0);

  /** 与所选月份一致：人员次数、植体数量均按该月统计 */
  async function loadMonthStats(m: string) {
    if (!m) {
      setStaffRows([]);
      setMonthTotal(0);
      return;
    }
    try {
      const [staffRes, n] = await Promise.all([
        api<StaffRow[]>("GET", `/implant/stats/staff?month=${encodeURIComponent(m)}`),
        api<number>("GET", `/implant/stats/month-total?month=${encodeURIComponent(m)}`),
      ]);
      setStaffRows(Array.isArray(staffRes) ? staffRes : []);
      setMonthTotal(typeof n === "number" ? n : 0);
    } catch {
      setStaffRows([]);
      setMonthTotal(0);
    }
  }

  async function loadAll() {
    try {
      const monthsRes = await api<string[]>("GET", "/implant/stats/months");
      const mlist = Array.isArray(monthsRes) ? monthsRes : [];
      setMonthItems(mlist.map((x) => ({ label: x, value: x })));
      const first = mlist[0] ?? "";
      setMonth(first);
      await loadMonthStats(first);
    } catch (e) {
      toast.error(errorMessage(e));
      setStaffRows([]);
      setMonthItems([]);
    }
  }

  React.useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅进入页面拉一次全量月份
  }, []);

  return (
    <div className="bg-background p-4">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">月份</span>
            <Select
              value={month}
              onValueChange={(v: string | null) => {
                if (!v) return;
                setMonth(v);
                void loadMonthStats(v);
              }}
              items={monthItems}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="选择月份" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {monthItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <span className="inline-flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">植体数量</span>
              <span className="inline-flex h-8 items-center rounded-lg border border-input bg-transparent px-2.5 font-medium tabular-nums text-foreground dark:bg-input/30">
                {monthTotal}
              </span>
            </span>
          </div>

          <ScrollArea className="w-full max-w-full [&_[data-slot=table-container]]:w-auto [&_[data-slot=table-container]]:overflow-x-visible">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2 text-center">人员</TableHead>
                  <TableHead className="w-1/2 text-center">次数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffRows.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="w-1/2 text-center">{r.name}</TableCell>
                    <TableCell className="w-1/2 text-center">{r.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
