import { NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import {
  ChinaHolidaysService,
  type ChinaHolidayDay,
  type ChinaHolidayPeriod,
  type ChinaHolidayYear,
} from "./china-holidays.service";

type RawHolidayYear = {
  year: number;
  days: Array<{ name: string; date: string; isOffDay: boolean }>;
};

/** 通过结构类型访问类的私有方法，避免使用 any */
type HolidayInternals = {
  groupOffDayPeriods(days: ChinaHolidayDay[]): ChinaHolidayPeriod[];
  normalize(raw: RawHolidayYear): ChinaHolidayYear;
};

function internals(): HolidayInternals {
  return new ChinaHolidaysService() as unknown as HolidayInternals;
}

describe("groupOffDayPeriods", () => {
  it("连续的同类休息日合并成一个假期区间", () => {
    const periods = internals().groupOffDayPeriods([
      { date: "2026-01-01", name: "元旦", isOffDay: true },
      { date: "2026-01-02", name: "元旦", isOffDay: true },
      { date: "2026-01-03", name: "元旦", isOffDay: true },
    ]);
    expect(periods).toEqual([
      { name: "元旦", start: "2026-01-01", end: "2026-01-03" },
    ]);
  });

  it("名称不同或日期不连续时拆成多个区间", () => {
    const periods = internals().groupOffDayPeriods([
      { date: "2026-10-01", name: "国庆节", isOffDay: true },
      { date: "2026-10-02", name: "国庆节", isOffDay: true },
      { date: "2026-10-06", name: "国庆节", isOffDay: true },
      { date: "2026-10-07", name: "国庆节", isOffDay: true },
    ]);
    expect(periods).toEqual([
      { name: "国庆节", start: "2026-10-01", end: "2026-10-02" },
      { name: "国庆节", start: "2026-10-06", end: "2026-10-07" },
    ]);
  });

  it("忽略补班日（isOffDay=false）", () => {
    const periods = internals().groupOffDayPeriods([
      { date: "2026-01-04", name: "元旦", isOffDay: false },
    ]);
    expect(periods).toEqual([]);
  });

  it("输入乱序时按日期排序后再合并", () => {
    const periods = internals().groupOffDayPeriods([
      { date: "2026-01-02", name: "元旦", isOffDay: true },
      { date: "2026-01-01", name: "元旦", isOffDay: true },
    ]);
    expect(periods).toEqual([
      { name: "元旦", start: "2026-01-01", end: "2026-01-02" },
    ]);
  });

  it("跨月的连续休息日也能合并", () => {
    const periods = internals().groupOffDayPeriods([
      { date: "2026-01-31", name: "春节", isOffDay: true },
      { date: "2026-02-01", name: "春节", isOffDay: true },
    ]);
    expect(periods).toEqual([
      { name: "春节", start: "2026-01-31", end: "2026-02-01" },
    ]);
  });

  it("空数组返回空区间列表", () => {
    expect(internals().groupOffDayPeriods([])).toEqual([]);
  });
});

describe("normalize", () => {
  it("生成休息日映射、补班日与假期区间", () => {
    const result = internals().normalize({
      year: 2026,
      days: [
        { date: "2026-01-01", name: "元旦", isOffDay: true },
        { date: "2026-01-02", name: "元旦", isOffDay: true },
        { date: "2026-01-04", name: "元旦", isOffDay: false },
      ],
    });

    expect(result.year).toBe(2026);
    expect(result.days).toHaveLength(3);
    expect(result.offDayMap).toEqual({
      "2026-01-01": "元旦",
      "2026-01-02": "元旦",
    });
    expect(result.makeupDays).toEqual([
      { date: "2026-01-04", name: "元旦补班" },
    ]);
    expect(result.periods).toEqual([
      { name: "元旦", start: "2026-01-01", end: "2026-01-02" },
    ]);
  });

  it("days 缺失时各字段为空", () => {
    const raw = { year: 2026 } as unknown as RawHolidayYear;
    const result = internals().normalize(raw);
    expect(result.days).toEqual([]);
    expect(result.offDayMap).toEqual({});
    expect(result.makeupDays).toEqual([]);
    expect(result.periods).toEqual([]);
  });
});

describe("getYear 参数校验", () => {
  const service = new ChinaHolidaysService();

  it("年份早于 2000 或晚于 2100 时报 404", async () => {
    await expect(service.getYear(1999)).rejects.toThrow(NotFoundException);
    await expect(service.getYear(2101)).rejects.toThrow(NotFoundException);
  });

  it("非整数年份报 404", async () => {
    await expect(service.getYear(2020.5)).rejects.toThrow("年份不合法");
    await expect(service.getYear(Number.NaN)).rejects.toThrow("年份不合法");
  });
});
