import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function PlantingStatsPage() {
  const [loading, setLoading] = React.useState(false);
  const [staffRows, setStaffRows] = React.useState<StaffRow[]>([]);
  const [monthItems, setMonthItems] = React.useState<{ label: string; value: string }[]>([]);
  const [month, setMonth] = React.useState("");
  const [monthTotal, setMonthTotal] = React.useState(0);

  /** 与上面所选月份一致：人员次数、植体数量均按该月统计 */
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
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅进入页面拉一次全量月份
  }, []);

  return (
    <div className="bg-background p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>统计</CardTitle>
            <CardDescription>人员次数与植体数量均按上方所选月份统计</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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
              <span className="text-sm text-muted-foreground">
                植体数量：<strong className="text-foreground">{monthTotal}</strong>
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={() => void loadAll()}
              >
                刷新
              </Button>
            </div>

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
