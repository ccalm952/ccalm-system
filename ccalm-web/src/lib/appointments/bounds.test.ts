import { describe, expect, it } from "vitest";

import { computeBoardBounds } from "./bounds";

const appt = (
  visitDate: string,
  startTime: string,
  endTime?: string,
  extra: { isPending?: boolean } = {},
) => ({ visitDate, startTime, endTime, ...extra });

const base = {
  workStart: 8 * 60 + 30,
  workEnd: 18 * 60,
  from: "2026-11-16",
  to: "2026-11-22",
};

describe("computeBoardBounds", () => {
  it("没有预约时使用上下班时间", () => {
    expect(computeBoardBounds({ ...base, appointments: [] })).toEqual({
      start: 8 * 60 + 30,
      end: 18 * 60,
    });
  });

  it("有早于上班时间的预约时向上扩展", () => {
    const bounds = computeBoardBounds({
      ...base,
      appointments: [appt("2026-11-16", "07:00", "07:30")],
    });
    expect(bounds.start).toBe(7 * 60);
    expect(bounds.end).toBe(18 * 60);
  });

  it("有晚于下班时间的预约时向下扩展", () => {
    const bounds = computeBoardBounds({
      ...base,
      appointments: [appt("2026-11-16", "20:00", "20:30")],
    });
    expect(bounds.start).toBe(8 * 60 + 30);
    expect(bounds.end).toBe(20 * 60 + 30);
  });

  it("结束时间不是 15 分钟时向上取整", () => {
    const bounds = computeBoardBounds({
      ...base,
      appointments: [appt("2026-11-16", "19:05", "19:50")],
    });
    expect(bounds.end).toBe(20 * 60);
  });

  it("忽略可见日期之外的预约", () => {
    const bounds = computeBoardBounds({
      ...base,
      appointments: [appt("2026-11-23", "07:00", "07:30")],
    });
    expect(bounds).toEqual({ start: 8 * 60 + 30, end: 18 * 60 });
  });

  it("忽略待定预约", () => {
    const bounds = computeBoardBounds({
      ...base,
      appointments: [appt("2026-11-16", "07:00", "07:30", { isPending: true })],
    });
    expect(bounds).toEqual({ start: 8 * 60 + 30, end: 18 * 60 });
  });

  it("缺少结束时间时按 30 分钟计算", () => {
    const bounds = computeBoardBounds({
      ...base,
      appointments: [appt("2026-11-16", "19:00")],
    });
    expect(bounds.end).toBe(19 * 60 + 30);
  });

  it("最少显示 1 小时", () => {
    const bounds = computeBoardBounds({
      ...base,
      workStart: 8 * 60 + 30,
      workEnd: 8 * 60 + 30,
      appointments: [],
    });
    expect(bounds.end - bounds.start).toBeGreaterThanOrEqual(60);
  });
});
