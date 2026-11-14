import * as React from "react";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompleteFollowUpDialog } from "@/components/follow-ups/complete-follow-up-dialog";
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
import { followUpTypeLabel, type FollowUpType } from "@/lib/follow-ups/options";
import type { FollowUp as FollowUpTask } from "@/lib/follow-ups/types";
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

/** 正畸就诊的「内容」取病历类型；visited 表示正畸名单点过「就诊」但还没写病历 */
const ORTHO_RECORD_LABELS: Record<string, string> = {
  first: "初诊",
  return: "复诊",
  orthoFirst: "正畸初诊",
  orthoReturn: "正畸复诊",
  visited: "已就诊",
};

function todayVisitDetail(v: TodayVisit): string {
  if (v.kind === "orthodontics") {
    const label = ORTHO_RECORD_LABELS[v.detail] ?? v.detail;
    return [
      visitTimeRange(v.startTime ?? "", v.endTime ?? ""),
      label,
      // 「已就诊」本身就是状态，不再重复显示「已到店」
      v.detail !== "visited" && v.status ? visitStatusLabel(v.status) : "",
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
  followUpTasks: FollowUpTask[];
};

type ListTab = "today" | "followUpTask" | "followUp" | "pendingCourse";

type VisitStatusFilter = "booked" | "arrived";

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
  const [statusFilter, setStatusFilter] =
    React.useState<VisitStatusFilter | null>(null);
  const [completing, setCompleting] = React.useState<FollowUpTask | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await api<Overview>("GET", "/workbench");
      setData(res);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const todayVisits = data?.todayVisits ?? [];
  const followUps = data?.followUps ?? [];
  const pendingCourses = data?.pendingCourses ?? [];
  const followUpTasks = data?.followUpTasks ?? [];
  const countVisitStatus = (status: VisitStatusFilter) =>
    todayVisits.filter((v) => v.status === status).length;
  const visibleVisits = statusFilter
    ? todayVisits.filter((v) => v.status === statusFilter)
    : todayVisits;

  function showVisits(filter: VisitStatusFilter | null) {
    setStatusFilter(filter);
    setTab("today");
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>今日患者</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <StatItem
              label="待接诊"
              value={countVisitStatus("booked")}
              onClick={() => showVisits("booked")}
            />
            <StatItem
              label="待治疗完成"
              value={countVisitStatus("arrived")}
              onClick={() => showVisits("arrived")}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>今日任务</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <StatItem
              label="待随访"
              value={followUpTasks.length}
              onClick={() => setTab("followUpTask")}
            />
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
                onClick={() => showVisits(null)}
              >
                今日就诊
              </Button>
              <Button
                type="button"
                variant={tab === "followUpTask" ? "default" : "outline"}
                onClick={() => setTab("followUpTask")}
              >
                待随访
              </Button>
              <Button
                type="button"
                variant={tab === "followUp" ? "default" : "outline"}
                onClick={() => setTab("followUp")}
              >
                正畸待随访
              </Button>
              <Button
                type="button"
                variant={tab === "pendingCourse" ? "default" : "outline"}
                onClick={() => setTab("pendingCourse")}
              >
                待完成疗程
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {tab === "today" && statusFilter ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setStatusFilter(null)}
                >
                  {statusFilter === "booked" ? "待接诊" : "待治疗完成"} ·
                  清除筛选
                </Button>
              ) : null}
              <span className="text-muted-foreground">
                {dayjs(data?.date).format("YYYY-MM-DD")}
              </span>
            </div>
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
                  {visibleVisits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        {statusFilter === "booked"
                          ? "今日暂无待接诊患者"
                          : statusFilter === "arrived"
                            ? "今日暂无待治疗完成患者"
                            : "今日暂无就诊"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleVisits.map((v) => (
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
            ) : tab === "followUpTask" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>手机</TableHead>
                    <TableHead>病历号</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>计划日期</TableHead>
                    <TableHead>内容</TableHead>
                    <TableHead>医生 / 经办</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr:nth-child(odd)]:bg-muted/30">
                  {followUpTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground">
                        暂无待随访
                      </TableCell>
                    </TableRow>
                  ) : (
                    followUpTasks.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <PatientLink id={f.patientId} name={f.name} />
                        </TableCell>
                        <TableCell>{f.phone}</TableCell>
                        <TableCell>{f.chartNo}</TableCell>
                        <TableCell>
                          {followUpTypeLabel(f.type as FollowUpType)}
                        </TableCell>
                        <TableCell>{f.planDate}</TableCell>
                        <TableCell className="max-w-72 truncate">
                          {f.content}
                        </TableCell>
                        <TableCell>{f.doctor}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setCompleting(f)}
                          >
                            执行
                          </Button>
                        </TableCell>
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
                        暂无正畸待随访
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

      <CompleteFollowUpDialog
        open={completing != null}
        onOpenChange={(open) => {
          if (!open) setCompleting(null);
        }}
        followUp={completing}
        onDone={load}
      />
    </div>
  );
}
