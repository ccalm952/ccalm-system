import * as React from "react";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToothPalmerMark } from "@/components/tooth-chart/ToothPalmerMark";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/config/routes";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { parseTeethStrict } from "@/lib/tooth-fdi";
import {
  orthodonticsCategoryLabel,
  type OrthodonticsCategory,
} from "@/lib/orthodontics/categories";
import {
  visitKindLabel,
  visitStatusLabel,
  visitTimeRange,
  type VisitKind,
  type VisitStatus,
} from "@/lib/visits/visit-options";

type TodayVisit = {
  key: string;
  kind: "clinic" | "implant" | "orthodontics";
  patientId: number;
  name: string;
  phone: string;
  chartNo: string;
  detail: string;
  startTime?: string;
  endTime?: string;
  status?: VisitStatus;
  staff: string;
};

const TODAY_KIND_LABELS: Record<TodayVisit["kind"], string> = {
  clinic: "门诊",
  implant: "种植",
  orthodontics: "正畸",
};

/** 正畸就诊的「内容」取病历类型，而不是正畸档案的分类 */
const ORTHO_RECORD_LABELS: Record<string, string> = {
  orthoFirst: "正畸初诊",
  orthoReturn: "正畸复诊",
};

function todayVisitDetail(v: TodayVisit): string {
  if (v.kind === "orthodontics") {
    return [
      visitTimeRange(v.startTime ?? "", v.endTime ?? ""),
      ORTHO_RECORD_LABELS[v.detail] ?? v.detail,
      v.status ? visitStatusLabel(v.status) : "",
    ]
      .filter(Boolean)
      .join(" ");
  }
  if (v.kind === "clinic") {
    return [
      visitTimeRange(v.startTime ?? "", v.endTime ?? ""),
      visitKindLabel(v.detail as VisitKind),
      v.status ? visitStatusLabel(v.status) : "",
    ]
      .filter(Boolean)
      .join(" ");
  }
  return v.detail;
}

type FollowUp = {
  id: number;
  patientId: number;
  name: string;
  phone: string;
  chartNo: string;
  category: OrthodonticsCategory;
  applianceModel: string;
  lastVisitDate: string | null;
  daysSinceLastVisit: number | null;
  doctor: string;
};

type PendingCourse = {
  recordId: number;
  patientId: number;
  name: string;
  phone: string;
  chartNo: string;
  firstVisitDate: string;
  doneCount: number;
  totalCount: number;
  pendingItems: { teeth: string; text: string }[];
  lastVisitDate: string;
  daysSinceLastVisit: number | null;
  doctor: string;
};

type Overview = {
  date: string;
  todayVisits: TodayVisit[];
  followUps: FollowUp[];
  pendingCourses: PendingCourse[];
};

type ListTab = "today" | "followUp" | "pendingCourse";

function StatItem({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-auto flex-col items-start gap-1 px-3 py-2"
      onClick={onClick}
    >
      <span className="text-2xl font-medium">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </Button>
  );
}

function TeethCell({ teeth }: { teeth: string }) {
  const parsed = parseTeethStrict(teeth);
  if (parsed == null) {
    return <span className="truncate">{teeth}</span>;
  }
  if (!parsed.length) return null;
  return <ToothPalmerMark fdis={parsed} compact />;
}

function PatientLink({
  id,
  name,
  to = ROUTES.patients.detail(id),
}: {
  id: number;
  name: string;
  to?: string;
}) {
  return (
    <Button variant="link" nativeButton={false} render={<Link to={to} />}>
      {name}
    </Button>
  );
}

export function WorkbenchPage() {
  const [data, setData] = React.useState<Overview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<ListTab>("today");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<Overview>("GET", "/workbench");
        if (!cancelled) setData(res);
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayVisits = data?.todayVisits ?? [];
  const followUps = data?.followUps ?? [];
  const pendingCourses = data?.pendingCourses ?? [];
  const countKind = (kind: TodayVisit["kind"]) =>
    todayVisits.filter((v) => v.kind === kind).length;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>今日患者</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <StatItem
              label="今日门诊"
              value={countKind("clinic")}
              onClick={() => setTab("today")}
            />
            <StatItem
              label="今日种植"
              value={countKind("implant")}
              onClick={() => setTab("today")}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>今日任务</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <StatItem
              label="正畸待随访"
              value={followUps.length}
              onClick={() => setTab("followUp")}
            />
            <StatItem
              label="疗程待完成"
              value={pendingCourses.length}
              onClick={() => setTab("pendingCourse")}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={tab === "today" ? "default" : "outline"}
                onClick={() => setTab("today")}
              >
                今日就诊
              </Button>
              <Button
                type="button"
                variant={tab === "followUp" ? "default" : "outline"}
                onClick={() => setTab("followUp")}
              >
                待随访
              </Button>
              <Button
                type="button"
                variant={tab === "pendingCourse" ? "default" : "outline"}
                onClick={() => setTab("pendingCourse")}
              >
                待完成疗程
              </Button>
            </div>
            <span className="text-muted-foreground">
              {dayjs(data?.date).format("YYYY-MM-DD")}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {tab === "today" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>手机</TableHead>
                    <TableHead>病历号</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>内容</TableHead>
                    <TableHead>医生 / 经办</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr:nth-child(odd)]:bg-muted/30">
                  {todayVisits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        今日暂无就诊
                      </TableCell>
                    </TableRow>
                  ) : (
                    todayVisits.map((v) => (
                      <TableRow key={v.key}>
                        <TableCell>
                          <PatientLink id={v.patientId} name={v.name} />
                        </TableCell>
                        <TableCell>{v.phone}</TableCell>
                        <TableCell>{v.chartNo}</TableCell>
                        <TableCell>{TODAY_KIND_LABELS[v.kind]}</TableCell>
                        <TableCell>{todayVisitDetail(v)}</TableCell>
                        <TableCell>{v.staff}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ) : tab === "pendingCourse" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>手机</TableHead>
                    <TableHead>病历号</TableHead>
                    <TableHead>初诊日期</TableHead>
                    <TableHead>进度</TableHead>
                    <TableHead>牙位</TableHead>
                    <TableHead>待完成计划</TableHead>
                    <TableHead>上次就诊</TableHead>
                    <TableHead>距离上次就诊</TableHead>
                    <TableHead>医生</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingCourses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-muted-foreground">
                        暂无待完成疗程
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingCourses.flatMap((c) => {
                      const span = c.pendingItems.length;
                      return c.pendingItems.map((item, index) => (
                        <TableRow key={`${c.recordId}-${index}`}>
                          {index === 0 ? (
                            <>
                              <TableCell rowSpan={span}>
                                <PatientLink
                                  id={c.patientId}
                                  name={c.name}
                                  to={`${ROUTES.patients.detail(c.patientId)}?tab=records&record=${c.recordId}`}
                                />
                              </TableCell>
                              <TableCell rowSpan={span}>{c.phone}</TableCell>
                              <TableCell rowSpan={span}>{c.chartNo}</TableCell>
                              <TableCell rowSpan={span}>
                                {c.firstVisitDate}
                              </TableCell>
                              <TableCell rowSpan={span}>
                                {c.doneCount}/{c.totalCount}
                              </TableCell>
                            </>
                          ) : null}
                          <TableCell className="overflow-hidden p-0">
                            <TeethCell teeth={item.teeth} />
                          </TableCell>
                          <TableCell>{item.text}</TableCell>
                          {index === 0 ? (
                            <>
                              <TableCell rowSpan={span}>
                                {c.lastVisitDate}
                              </TableCell>
                              <TableCell rowSpan={span}>
                                {c.daysSinceLastVisit} 天
                              </TableCell>
                              <TableCell rowSpan={span}>{c.doctor}</TableCell>
                            </>
                          ) : null}
                        </TableRow>
                      ));
                    })
                  )}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>手机</TableHead>
                    <TableHead>病历号</TableHead>
                    <TableHead>标签</TableHead>
                    <TableHead>型号</TableHead>
                    <TableHead>上次就诊</TableHead>
                    <TableHead>距离上次就诊</TableHead>
                    <TableHead>医生</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr:nth-child(odd)]:bg-muted/30">
                  {followUps.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground">
                        暂无待随访
                      </TableCell>
                    </TableRow>
                  ) : (
                    followUps.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <PatientLink id={f.patientId} name={f.name} />
                        </TableCell>
                        <TableCell>{f.phone}</TableCell>
                        <TableCell>{f.chartNo}</TableCell>
                        <TableCell>
                          {orthodonticsCategoryLabel(f.category)}
                        </TableCell>
                        <TableCell>{f.applianceModel}</TableCell>
                        <TableCell>{f.lastVisitDate ?? ""}</TableCell>
                        <TableCell className="text-destructive">
                          {f.daysSinceLastVisit} 天
                        </TableCell>
                        <TableCell>{f.doctor}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
            {loading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
                <Spinner className="size-8 opacity-60" />
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
