import * as React from "react";
import dayjs from "dayjs";
import { Download } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { DatePickerField } from "@/components/date-picker-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { APPOINTMENT_TONES, toneOf } from "@/lib/appointments/status";
import type {
  AppointmentCard,
  AppointmentMeta,
} from "@/lib/appointments/types";
import { ROUTES } from "@/config/routes";
import { errorMessage } from "@/lib/errorMessage";

const STATUS_KEYS = ["booked", "completed", "missed", "cancelled"];

export function AppointmentListPage() {
  const [from, setFrom] = React.useState(dayjs().format("YYYY-MM-DD"));
  const [to, setTo] = React.useState(
    dayjs().add(14, "day").format("YYYY-MM-DD"),
  );
  const [statuses, setStatuses] = React.useState<string[]>([]);
  const [doctor, setDoctor] = React.useState("all");
  const [keyword, setKeyword] = React.useState("");
  const [meta, setMeta] = React.useState<AppointmentMeta | null>(null);
  const [rows, setRows] = React.useState<AppointmentCard[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api<AppointmentMeta>("GET", "/appointments/meta")
      .then(setMeta)
      .catch(() => undefined);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (statuses.length) params.set("status", statuses.join(","));
      if (doctor !== "all") params.set("doctor", doctor);
      if (keyword.trim()) params.set("q", keyword.trim());
      setRows(
        await api<AppointmentCard[]>(
          "GET",
          `/appointments/list?${params.toString()}`,
        ),
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [from, to, statuses, doctor, keyword]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function toggleStatus(key: string) {
    setStatuses((list) =>
      list.includes(key) ? list.filter((s) => s !== key) : [...list, key],
    );
  }

  function exportCsv() {
    if (!rows.length) {
      toast.error("没有可导出的数据");
      return;
    }
    const header = [
      "日期",
      "开始",
      "结束",
      "姓名",
      "病历号",
      "手机",
      "医生",
      "项目",
      "状态",
      "备注",
    ];
    const lines = rows.map((r) =>
      [
        r.visitDate,
        r.startTime,
        r.endTime,
        r.patientName,
        r.chartNo,
        r.phone,
        r.doctor,
        r.items.join("/"),
        toneOf(r).label,
        r.remark.replace(/\r?\n/g, " "),
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob(
      ["\ufeff" + [header.join(","), ...lines].join("\n")],
      {
        type: "text/csv;charset=utf-8",
      },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `预约列表_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">预约列表</h1>
        <Button
          variant="outline"
          render={<Link to={ROUTES.appointments.root} />}
        >
          返回看板
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-40">
              <DatePickerField value={from} onValueChange={setFrom} />
            </div>
            <span className="text-muted-foreground">至</span>
            <div className="w-40">
              <DatePickerField value={to} onValueChange={setTo} />
            </div>
            <Select
              items={[
                { value: "all", label: "全部医生" },
                ...(meta?.doctors ?? []).map((n) => ({ value: n, label: n })),
              ]}
              value={doctor}
              onValueChange={(v) => {
                if (v) setDoctor(v);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部医生</SelectItem>
                {(meta?.doctors ?? []).map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="姓名/手机/病历号"
              className="w-48"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_KEYS.map((key) => {
                const tone = APPOINTMENT_TONES[key];
                const active = statuses.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleStatus(key)}
                    className={`rounded-full border px-2 py-0.5 text-sm ${
                      active ? "" : "opacity-40"
                    }`}
                    style={{
                      backgroundColor: tone.bg,
                      borderColor: tone.bar,
                    }}
                  >
                    {tone.label}
                  </button>
                );
              })}
            </div>
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="secondary" onClick={exportCsv}>
                <Download className="size-4" />
                导出
              </Button>
              <Button type="button" onClick={() => void load()}>
                查询
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Spinner className="size-8 opacity-60" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>病历号</TableHead>
                  <TableHead>手机</TableHead>
                  <TableHead>医生</TableHead>
                  <TableHead>项目</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-muted-foreground"
                    >
                      没有符合条件的预约
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="tabular-nums">
                        {r.visitDate}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {r.startTime
                          ? r.endTime
                            ? `${r.startTime} - ${r.endTime}`
                            : r.startTime
                          : "未排时间"}
                      </TableCell>
                      <TableCell>{r.patientName}</TableCell>
                      <TableCell>{r.chartNo}</TableCell>
                      <TableCell>{r.phone}</TableCell>
                      <TableCell>{r.doctor || "—"}</TableCell>
                      <TableCell className="max-w-40 truncate">
                        {r.items.join("/") || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: toneOf(r).bg,
                            color: "#1d222a",
                          }}
                        >
                          {toneOf(r).label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-40 truncate">
                        {r.remark || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            共 {rows.length} 条（最多显示 1000 条）
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
