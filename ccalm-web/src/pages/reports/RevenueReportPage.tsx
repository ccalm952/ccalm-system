import * as React from "react";
import dayjs from "dayjs";
import { Download, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { BarChart } from "@/components/reports/bar-chart";
import { LineChart } from "@/components/reports/line-chart";
import { PieChart } from "@/components/reports/pie-chart";
import { DateRangePickerField } from "@/components/date-range-picker-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROUTES } from "@/config/routes";
import { api, type ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/charges/charge-calc";
import { errorMessage } from "@/lib/errorMessage";
import type {
  RevenueDistributionRow,
  RevenueGranularity,
  RevenueReport,
} from "@/lib/reports/revenue";
import { cn } from "cn";

type RangeValue = { from: string; to: string };

type DistributionKey = "doctor" | "method" | "category" | "feeItem";

type Metric = "received" | "receivable";

type TabKey = "overview" | "stats" | "trend";

const GRANULARITIES: { value: RevenueGranularity; label: string }[] = [
  { value: "day", label: "日" },
  { value: "week", label: "周" },
  { value: "month", label: "月" },
];

const DISTRIBUTIONS: {
  value: DistributionKey;
  label: string;
  hint: string;
}[] = [
  { value: "doctor", label: "医生", hint: "按收款医生统计" },
  { value: "method", label: "收费方式", hint: "按收款方式统计" },
  { value: "category", label: "收费大类", hint: "按收费项目所属大类统计" },
  { value: "feeItem", label: "收费项目", hint: "按具体收费项目统计" },
];

const METRICS: { value: Metric; label: string }[] = [
  { value: "received", label: "实收" },
  { value: "receivable", label: "应收" },
];

const RECEIVED_COLOR = "var(--chart-4)";
const RECEIVABLE_COLOR = "oklch(0.7 0.14 195)";

function todayKey(): string {
  return dayjs().format("YYYY-MM-DD");
}

function monthRange(): RangeValue {
  return {
    from: dayjs().startOf("month").format("YYYY-MM-DD"),
    to: todayKey(),
  };
}

function metricValue(row: RevenueDistributionRow, metric: Metric): number {
  return metric === "received" ? row.received : row.receivable;
}

/** 饼图最多展示 6 项，其余合并为「其他」 */
function pieSlices(rows: RevenueDistributionRow[], metric: Metric) {
  const values = rows
    .map((row) => ({ name: row.name, value: metricValue(row, metric) }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  if (values.length <= 7) return values;
  const head = values.slice(0, 6);
  const rest = values.slice(6);
  const restValue = rest.reduce((sum, item) => sum + item.value, 0);
  return [...head, { name: `其他（${rest.length} 项）`, value: restValue }];
}

function csvCell(value: string | number): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function quickRanges(): { label: string; range: RangeValue }[] {
  const today = dayjs();
  return [
    { label: "今日", range: { from: todayKey(), to: todayKey() } },
    {
      label: "近 7 天",
      range: {
        from: today.subtract(6, "day").format("YYYY-MM-DD"),
        to: todayKey(),
      },
    },
    { label: "本月", range: monthRange() },
    {
      label: "上月",
      range: {
        from: today.subtract(1, "month").startOf("month").format("YYYY-MM-DD"),
        to: today.subtract(1, "month").endOf("month").format("YYYY-MM-DD"),
      },
    },
    {
      label: "近 30 天",
      range: {
        from: today.subtract(29, "day").format("YYYY-MM-DD"),
        to: todayKey(),
      },
    },
    {
      label: "今年",
      range: {
        from: today.startOf("year").format("YYYY-MM-DD"),
        to: todayKey(),
      },
    },
  ];
}

function granularityLabel(granularity: RevenueGranularity): string {
  return granularity === "day" ? "日" : granularity === "week" ? "周" : "月";
}

export function RevenueReportPage() {
  const [range, setRange] = React.useState<RangeValue>(monthRange);
  const [granularity, setGranularity] =
    React.useState<RevenueGranularity>("day");
  const [tab, setTab] = React.useState<TabKey>("overview");
  const [distribution, setDistribution] =
    React.useState<DistributionKey>("doctor");
  const [metric, setMetric] = React.useState<Metric>("received");
  const [data, setData] = React.useState<RevenueReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [forbidden, setForbidden] = React.useState(false);
  const requestRef = React.useRef(0);

  const load = React.useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const query = new URLSearchParams({
        from: range.from,
        to: range.to,
        granularity,
      });
      const res = await api<RevenueReport>(
        "GET",
        `/reports/revenue?${query.toString()}`,
      );
      if (requestRef.current === requestId) {
        setData(res);
        setForbidden(false);
      }
    } catch (e) {
      if (requestRef.current === requestId) {
        if ((e as ApiError).status === 403) setForbidden(true);
        else toast.error(errorMessage(e));
      }
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [range.from, range.to, granularity]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (forbidden) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <h1 className="font-heading text-xl font-semibold">营收分析</h1>
        <Card>
          <CardContent>
            <Empty className="h-48">
              <EmptyHeader>
                <EmptyTitle>暂无查看权限</EmptyTitle>
                <EmptyDescription>
                  当前账号没有「查看报表」权限，请联系管理员授权
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
    );
  }

  const quick = quickRanges();
  const activeQuick = quick.find(
    (item) => item.range.from === range.from && item.range.to === range.to,
  );
  const trend = data?.trend ?? [];
  const labels = trend.map((point) => point.label);
  const trendEmpty =
    trend.length === 0 ||
    trend.every((point) => point.received === 0 && point.receivable === 0);
  const distributionRows = data?.distributions[distribution] ?? [];
  const slices = pieSlices(distributionRows, metric);

  const statsSeries = [
    {
      label: "实收",
      color: RECEIVED_COLOR,
      values: trend.map((point) => point.received),
    },
    {
      label: "应收",
      color: RECEIVABLE_COLOR,
      values: trend.map((point) => point.receivable),
    },
  ];
  const trendSeries = [
    {
      label: "实收",
      color: RECEIVED_COLOR,
      values: trend.map((point) => point.received),
      area: true,
    },
    {
      label: "应收",
      color: RECEIVABLE_COLOR,
      values: trend.map((point) => point.receivable),
      dashed: true,
    },
  ];

  function exportCsv() {
    if (!data) return;
    const header = [
      "收费日期",
      "患者",
      "收费项目",
      "应收",
      "实收",
      "欠费",
      "状态",
    ];
    const lines = data.recentOrders.map((order) =>
      [
        order.chargeDate,
        order.patientName,
        order.items.join("，"),
        order.receivable.toFixed(2),
        order.paid.toFixed(2),
        order.owed.toFixed(2),
        order.state === "settled" ? "已结清" : "欠费",
      ]
        .map(csvCell)
        .join(","),
    );
    const summary = [
      `营收分析,${data.range.from} 至 ${data.range.to}`,
      `实收总额,${data.summary.received.toFixed(2)}`,
      `应收总额,${data.summary.receivable.toFixed(2)}`,
      `欠费金额,${data.summary.outstanding.toFixed(2)}`,
      `收费单数,${data.summary.orderCount}`,
      `患者数,${data.summary.patientCount}`,
      "",
    ];
    const csv = `\ufeff${[...summary, header.join(","), ...lines].join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `营收分析_${data.range.from}_${data.range.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-xl font-semibold">营收分析</h1>
          <p className="text-sm text-muted-foreground">
            按收费单（应收）与收款记录（实收）统计期间收入
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePickerField
            value={range}
            onValueChange={(next) => {
              if (next.from && next.to) setRange(next);
            }}
            className="w-[270px]"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={cn(loading && "animate-spin")} />
            刷新
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={!data?.recentOrders.length}
          >
            <Download />
            导出
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {quick.map((item) => (
          <Button
            key={item.label}
            size="xs"
            variant={activeQuick?.label === item.label ? "secondary" : "ghost"}
            onClick={() => setRange(item.range)}
          >
            {item.label}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground">
          {range.from} 至 {range.to}
        </span>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as TabKey)}
        className="gap-4"
      >
        <TabsList>
          <TabsTrigger value="overview">营收分析</TabsTrigger>
          <TabsTrigger value="stats">收入统计</TabsTrigger>
          <TabsTrigger value="trend">收入趋势</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard
              label="实收总额"
              value={data?.summary.received}
              hint={data ? `${data.summary.paymentCount} 笔收款` : undefined}
              loading={loading && !data}
            />
            <SummaryCard
              label="应收总额"
              value={data?.summary.receivable}
              hint={data ? `${data.summary.orderCount} 张收费单` : undefined}
              loading={loading && !data}
            />
            <SummaryCard
              label="欠费金额"
              value={data?.summary.outstanding}
              hint="期间开单未收部分"
              loading={loading && !data}
            />
            <SummaryCard
              label="客单价"
              value={data?.summary.averageTicket}
              hint={data ? `${data.summary.patientCount} 位患者` : undefined}
              loading={loading && !data}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <CardTitle>收入构成</CardTitle>
                <CardDescription>
                  {
                    DISTRIBUTIONS.find((item) => item.value === distribution)
                      ?.hint
                  }
                  ，{metric === "received" ? "按实收金额" : "按开单应收金额"}
                  占比
                </CardDescription>
              </div>
              <Tabs
                value={metric}
                onValueChange={(value) => setMetric(value as Metric)}
              >
                <TabsList>
                  {METRICS.filter(
                    (item) =>
                      distribution !== "doctor" || item.value === "received",
                  ).map((item) => (
                    <TabsTrigger key={item.value} value={item.value}>
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Tabs
                value={distribution}
                onValueChange={(value) => {
                  const next = value as DistributionKey;
                  setDistribution(next);
                  if (next === "doctor") setMetric("received");
                }}
              >
                <TabsList>
                  {DISTRIBUTIONS.map((item) => (
                    <TabsTrigger key={item.value} value={item.value}>
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {!data ? (
                <Skeleton className="h-56 w-full" />
              ) : slices.length === 0 ? (
                <Empty className="h-56">
                  <EmptyHeader>
                    <EmptyTitle>暂无数据</EmptyTitle>
                    <EmptyDescription>
                      该区间没有对应的
                      {metric === "received" ? "实收" : "应收"}明细
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <PieChart data={slices} formatValue={formatMoney} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-1">
              <CardTitle>期间收费单</CardTitle>
              <CardDescription>按收费日期倒序，最多展示 20 张</CardDescription>
            </CardHeader>
            <CardContent>
              {!data ? (
                <Skeleton className="h-40 w-full" />
              ) : data.recentOrders.length === 0 ? (
                <Empty className="h-40">
                  <EmptyHeader>
                    <EmptyTitle>暂无收费单</EmptyTitle>
                    <EmptyDescription>该区间没有收费记录</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>收费日期</TableHead>
                        <TableHead>患者</TableHead>
                        <TableHead>医生</TableHead>
                        <TableHead>收费项目</TableHead>
                        <TableHead className="text-right">应收</TableHead>
                        <TableHead className="text-right">实收</TableHead>
                        <TableHead className="text-right">欠费</TableHead>
                        <TableHead className="text-right">状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="whitespace-nowrap tabular-nums">
                            {order.chargeDate}
                          </TableCell>
                          <TableCell className="max-w-40 truncate">
                            <Link
                              to={ROUTES.patients.detail(order.patientId)}
                              className="hover:underline"
                            >
                              {order.patientName}
                            </Link>
                          </TableCell>
                          <TableCell className="max-w-28 truncate">
                            {order.doctor || "—"}
                          </TableCell>
                          <TableCell
                            className="max-w-64 truncate"
                            title={order.items.join("，")}
                          >
                            {order.items.join("，") || "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(order.receivable)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(order.paid)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right tabular-nums",
                              order.owed > 0 && "text-destructive",
                            )}
                          >
                            {order.owed > 0 ? formatMoney(order.owed) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {order.state === "settled" ? (
                              <Badge variant="secondary">已结清</Badge>
                            ) : (
                              <Badge variant="destructive">欠费</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <CardTitle>收入统计</CardTitle>
                <CardDescription>
                  按{granularityLabel(granularity)}对比应收与实收
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">
                    总计应收{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {formatMoney(data?.summary.receivable ?? 0)}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    总计实收{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {formatMoney(data?.summary.received ?? 0)}
                    </span>
                  </span>
                </div>
                <GranularityPicker
                  value={granularity}
                  onChange={setGranularity}
                />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ChartLegend
                items={[
                  { label: "实收", color: RECEIVED_COLOR },
                  { label: "应收", color: RECEIVABLE_COLOR },
                ]}
              />
              {!data ? (
                <Skeleton className="h-64 w-full" />
              ) : trendEmpty ? (
                <Empty className="h-64">
                  <EmptyHeader>
                    <EmptyTitle>该区间暂无收入数据</EmptyTitle>
                    <EmptyDescription>
                      换一个时间段，或先在患者详情页开单收费
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <BarChart
                  labels={labels}
                  series={statsSeries}
                  formatValue={formatMoney}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend" className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <CardTitle>收入趋势</CardTitle>
                <CardDescription>
                  按{granularityLabel(granularity)}查看应收与实收走势
                </CardDescription>
              </div>
              <GranularityPicker
                value={granularity}
                onChange={setGranularity}
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ChartLegend
                items={[
                  { label: "实收", color: RECEIVED_COLOR },
                  { label: "应收", color: RECEIVABLE_COLOR },
                ]}
              />
              {!data ? (
                <Skeleton className="h-72 w-full" />
              ) : trendEmpty ? (
                <Empty className="h-72">
                  <EmptyHeader>
                    <EmptyTitle>该区间暂无收入数据</EmptyTitle>
                    <EmptyDescription>
                      换一个时间段，或先在患者详情页开单收费
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <LineChart
                  labels={labels}
                  series={trendSeries}
                  formatValue={formatMoney}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value?: number;
  hint?: string;
  loading: boolean;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <span className="font-heading text-2xl font-semibold tabular-nums">
            {formatMoney(value ?? 0)}
          </span>
        )}
        {hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function GranularityPicker({
  value,
  onChange,
}: {
  value: RevenueGranularity;
  onChange: (value: RevenueGranularity) => void;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onChange(next as RevenueGranularity)}
    >
      <TabsList>
        {GRANULARITIES.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
