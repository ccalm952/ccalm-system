import * as React from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { DEFAULT_SHIFT, isValidHHMM, minutesFromMidnight } from "@/lib/attendance/shift";
import type { AttendanceShiftFullConfig } from "@/lib/attendance/types";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { toast } from "@/components/ui/sonner";

type BackendShiftDto = {
  morningLabel: string;
  morningRangeStart: string;
  morningRangeEnd: string;
  afternoonLabel: string;
  afternoonRangeStart: string;
  afternoonRangeEnd: string;
  morningInWindowStart: string;
  morningInWindowEnd: string;
  morningOutWindowStart: string;
  morningOutWindowEnd: string;
  afternoonInWindowStart: string;
  afternoonInWindowEnd: string;
  afternoonOutWindowStart: string;
  afternoonOutWindowEnd: string;
  overtimeMorningNormalEnd: string;
  overtimeAfternoonNormalEnd: string;
};

function shiftFromBackend(d: BackendShiftDto): AttendanceShiftFullConfig {
  return {
    morning: {
      label: d.morningLabel,
      rangeStart: d.morningRangeStart,
      rangeEnd: d.morningRangeEnd,
    },
    afternoon: {
      label: d.afternoonLabel,
      rangeStart: d.afternoonRangeStart,
      rangeEnd: d.afternoonRangeEnd,
    },
    morningInWindowStart: d.morningInWindowStart,
    morningInWindowEnd: d.morningInWindowEnd,
    morningOutWindowStart: d.morningOutWindowStart,
    morningOutWindowEnd: d.morningOutWindowEnd,
    afternoonInWindowStart: d.afternoonInWindowStart,
    afternoonInWindowEnd: d.afternoonInWindowEnd,
    afternoonOutWindowStart: d.afternoonOutWindowStart,
    afternoonOutWindowEnd: d.afternoonOutWindowEnd,
    overtimeMorningNormalEnd: d.overtimeMorningNormalEnd,
    overtimeAfternoonNormalEnd: d.overtimeAfternoonNormalEnd,
  };
}

function cloneShift(v: AttendanceShiftFullConfig): AttendanceShiftFullConfig {
  return JSON.parse(JSON.stringify(v)) as AttendanceShiftFullConfig;
}

type MeRole = { role: "user" | "admin" };

export function AttendanceShiftSettingsPage() {
  const navigate = useNavigate();
  const [ready, setReady] = React.useState(false);
  const [form, setForm] = React.useState<AttendanceShiftFullConfig>(() =>
    cloneShift(DEFAULT_SHIFT),
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api<MeRole>("GET", "/auth/me");
        if (cancelled) return;
        if (me.role !== "admin") {
          navigate("/attendance", { replace: true });
          return;
        }
        const d = await api<BackendShiftDto>("GET", "/attendance/shift");
        if (cancelled) return;
        setForm(cloneShift(shiftFromBackend(d)));
        setReady(true);
      } catch {
        window.location.href = "/login";
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  function update<K extends keyof AttendanceShiftFullConfig>(
    k: K,
    v: AttendanceShiftFullConfig[K],
  ) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function updateMorning<K extends keyof AttendanceShiftFullConfig["morning"]>(k: K, v: string) {
    setForm((s) => ({ ...s, morning: { ...s.morning, [k]: v } }));
  }

  function updateAfternoon<K extends keyof AttendanceShiftFullConfig["afternoon"]>(
    k: K,
    v: string,
  ) {
    setForm((s) => ({ ...s, afternoon: { ...s.afternoon, [k]: v } }));
  }

  function validate(): boolean {
    const m = form.morning;
    const a = form.afternoon;
    const pairs: Array<[string, string]> = [
      ["上午开始", m.rangeStart],
      ["上午结束", m.rangeEnd],
      ["下午开始", a.rangeStart],
      ["下午结束", a.rangeEnd],
      ["上午加班起算", form.overtimeMorningNormalEnd],
      ["下午加班起算", form.overtimeAfternoonNormalEnd],
      ["上午上班可打开始", form.morningInWindowStart],
      ["上午上班可打结束", form.morningInWindowEnd],
      ["上午下班可打开始", form.morningOutWindowStart],
      ["上午下班可打结束", form.morningOutWindowEnd],
      ["下午上班可打开始", form.afternoonInWindowStart],
      ["下午上班可打结束", form.afternoonInWindowEnd],
      ["下午下班可打开始", form.afternoonOutWindowStart],
      ["下午下班可打结束", form.afternoonOutWindowEnd],
    ];
    for (const [label, value] of pairs) {
      const trimmed = String(value || "").trim();
      if (!trimmed) {
        toast.error(`${label}不能为空`);
        return false;
      }
      if (!isValidHHMM(trimmed)) {
        toast.error(`${label}格式不正确`);
        return false;
      }
    }
    const inStart = minutesFromMidnight(form.morningInWindowStart.trim());
    const inEnd = minutesFromMidnight(form.morningInWindowEnd.trim());
    if (inStart > inEnd) {
      toast.error("上午上班可打开始须早于或等于结束时间");
      return false;
    }
    const outStart = minutesFromMidnight(form.morningOutWindowStart.trim());
    const outEnd = minutesFromMidnight(form.morningOutWindowEnd.trim());
    if (outStart > outEnd) {
      toast.error("上午下班可打开始须早于或等于结束时间");
      return false;
    }
    const aInStart = minutesFromMidnight(form.afternoonInWindowStart.trim());
    const aInEnd = minutesFromMidnight(form.afternoonInWindowEnd.trim());
    if (aInStart > aInEnd) {
      toast.error("下午上班可打开始须早于或等于结束时间");
      return false;
    }
    const aOutStart = minutesFromMidnight(form.afternoonOutWindowStart.trim());
    const aOutEnd = minutesFromMidnight(form.afternoonOutWindowEnd.trim());
    if (aOutStart > aOutEnd) {
      toast.error("下午下班可打开始须早于或等于结束时间");
      return false;
    }
    return true;
  }

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background p-4">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 text-sm">
          <section className="rounded-lg border border-border p-4">
            <div className="mb-3 text-sm font-semibold text-muted-foreground">上午班次</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">标签</label>
                <Input
                  value={form.morning.label}
                  onChange={(e) => updateMorning("label", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">开始时间</label>
                <Input
                  value={form.morning.rangeStart}
                  onChange={(e) => updateMorning("rangeStart", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">结束时间</label>
                <Input
                  value={form.morning.rangeEnd}
                  onChange={(e) => updateMorning("rangeEnd", e.target.value)}
                />
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">上午上班可打开始</label>
                <Input
                  value={form.morningInWindowStart}
                  onChange={(e) => update("morningInWindowStart", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">上午上班可打结束</label>
                <Input
                  value={form.morningInWindowEnd}
                  onChange={(e) => update("morningInWindowEnd", e.target.value)}
                />
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">上午下班可打开始</label>
                <Input
                  value={form.morningOutWindowStart}
                  onChange={(e) => update("morningOutWindowStart", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">上午下班可打结束</label>
                <Input
                  value={form.morningOutWindowEnd}
                  onChange={(e) => update("morningOutWindowEnd", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border p-4">
            <div className="mb-3 text-sm font-semibold text-muted-foreground">下午班次</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">标签</label>
                <Input
                  value={form.afternoon.label}
                  onChange={(e) => updateAfternoon("label", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">开始时间</label>
                <Input
                  value={form.afternoon.rangeStart}
                  onChange={(e) => updateAfternoon("rangeStart", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">结束时间</label>
                <Input
                  value={form.afternoon.rangeEnd}
                  onChange={(e) => updateAfternoon("rangeEnd", e.target.value)}
                />
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">下午上班可打开始</label>
                <Input
                  value={form.afternoonInWindowStart}
                  onChange={(e) => update("afternoonInWindowStart", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">下午上班可打结束</label>
                <Input
                  value={form.afternoonInWindowEnd}
                  onChange={(e) => update("afternoonInWindowEnd", e.target.value)}
                />
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">下午下班可打开始</label>
                <Input
                  value={form.afternoonOutWindowStart}
                  onChange={(e) => update("afternoonOutWindowStart", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">下午下班可打结束</label>
                <Input
                  value={form.afternoonOutWindowEnd}
                  onChange={(e) => update("afternoonOutWindowEnd", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border p-4">
            <div className="mb-3 text-sm font-semibold text-muted-foreground">加班</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">上午正常下班（加班起算）</label>
                <Input
                  value={form.overtimeMorningNormalEnd}
                  onChange={(e) => update("overtimeMorningNormalEnd", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">下午正常下班（加班起算）</label>
                <Input
                  value={form.overtimeAfternoonNormalEnd}
                  onChange={(e) => update("overtimeAfternoonNormalEnd", e.target.value)}
                />
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                if (!validate()) return;
                void (async () => {
                  try {
                    await api("PUT", "/attendance/shift", {
                      morningLabel: form.morning.label,
                      morningRangeStart: form.morning.rangeStart,
                      morningRangeEnd: form.morning.rangeEnd,
                      afternoonLabel: form.afternoon.label,
                      afternoonRangeStart: form.afternoon.rangeStart,
                      afternoonRangeEnd: form.afternoon.rangeEnd,
                      morningInWindowStart: form.morningInWindowStart,
                      morningInWindowEnd: form.morningInWindowEnd,
                      morningOutWindowStart: form.morningOutWindowStart,
                      morningOutWindowEnd: form.morningOutWindowEnd,
                      afternoonInWindowStart: form.afternoonInWindowStart,
                      afternoonInWindowEnd: form.afternoonInWindowEnd,
                      afternoonOutWindowStart: form.afternoonOutWindowStart,
                      afternoonOutWindowEnd: form.afternoonOutWindowEnd,
                      overtimeMorningNormalEnd: form.overtimeMorningNormalEnd,
                      overtimeAfternoonNormalEnd: form.overtimeAfternoonNormalEnd,
                    });
                    toast.success("已保存");
                  } catch (e) {
                    toast.error(errorMessage(e));
                  }
                })();
              }}
            >
              保存
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setForm(cloneShift(DEFAULT_SHIFT));
                void (async () => {
                  try {
                    await api("PUT", "/attendance/shift", {
                      morningLabel: DEFAULT_SHIFT.morning.label,
                      morningRangeStart: DEFAULT_SHIFT.morning.rangeStart,
                      morningRangeEnd: DEFAULT_SHIFT.morning.rangeEnd,
                      afternoonLabel: DEFAULT_SHIFT.afternoon.label,
                      afternoonRangeStart: DEFAULT_SHIFT.afternoon.rangeStart,
                      afternoonRangeEnd: DEFAULT_SHIFT.afternoon.rangeEnd,
                      morningInWindowStart: DEFAULT_SHIFT.morningInWindowStart,
                      morningInWindowEnd: DEFAULT_SHIFT.morningInWindowEnd,
                      morningOutWindowStart: DEFAULT_SHIFT.morningOutWindowStart,
                      morningOutWindowEnd: DEFAULT_SHIFT.morningOutWindowEnd,
                      afternoonInWindowStart: DEFAULT_SHIFT.afternoonInWindowStart,
                      afternoonInWindowEnd: DEFAULT_SHIFT.afternoonInWindowEnd,
                      afternoonOutWindowStart: DEFAULT_SHIFT.afternoonOutWindowStart,
                      afternoonOutWindowEnd: DEFAULT_SHIFT.afternoonOutWindowEnd,
                      overtimeMorningNormalEnd: DEFAULT_SHIFT.overtimeMorningNormalEnd,
                      overtimeAfternoonNormalEnd: DEFAULT_SHIFT.overtimeAfternoonNormalEnd,
                    });
                    toast.success("已恢复默认");
                  } catch (e) {
                    toast.error(errorMessage(e));
                  }
                })();
              }}
            >
              恢复默认
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
