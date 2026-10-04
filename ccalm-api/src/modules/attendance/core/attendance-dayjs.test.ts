import { describe, expect, it } from "vitest";

import {
  attendanceDayjs,
  attendanceTodayStart,
  formatAttendanceDate,
  formatAttendanceTime,
} from "./attendance-dayjs";

/** 用 Intl 独立算出业务时区（Asia/Shanghai）下的今天，作为对照 */
function shanghaiToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
  }).format(new Date());
}

describe("formatAttendanceDate", () => {
  it("按东八区日期输出 YYYY-MM-DD", () => {
    // UTC 2026-01-14 16:30 即北京时间 2026-01-15 00:30
    expect(formatAttendanceDate(new Date("2026-01-14T16:30:00Z"))).toBe(
      "2026-01-15",
    );
    expect(formatAttendanceDate("2026-01-14T15:59:59Z")).toBe("2026-01-14");
  });

  it("跨年边界", () => {
    expect(formatAttendanceDate("2025-12-31T16:00:00Z")).toBe("2026-01-01");
    expect(formatAttendanceDate("2025-12-31T15:59:59Z")).toBe("2025-12-31");
  });

  it("接受字符串与 dayjs 对象", () => {
    expect(formatAttendanceDate("2026-09-28T12:00:00+08:00")).toBe(
      "2026-09-28",
    );
    expect(
      formatAttendanceDate(attendanceDayjs("2026-09-28T12:00:00+08:00")),
    ).toBe("2026-09-28");
  });
});

describe("formatAttendanceTime", () => {
  it("按东八区输出 HH:mm", () => {
    expect(formatAttendanceTime(new Date("2026-01-15T00:30:00+08:00"))).toBe(
      "00:30",
    );
    expect(formatAttendanceTime(new Date("2026-01-15T23:59:00+08:00"))).toBe(
      "23:59",
    );
  });

  it("UTC 时刻会换算到东八区", () => {
    expect(formatAttendanceTime(new Date("2026-01-14T16:30:00Z"))).toBe(
      "00:30",
    );
  });

  it("只保留到分钟，丢弃秒", () => {
    expect(formatAttendanceTime(new Date("2026-01-15T08:05:59+08:00"))).toBe(
      "08:05",
    );
  });
});

describe("attendanceDayjs", () => {
  it("默认解析到业务时区", () => {
    expect(attendanceDayjs("2026-09-14T14:21:00+08:00").format("HH:mm")).toBe(
      "14:21",
    );
    expect(
      attendanceDayjs("2026-09-14T06:21:00Z").format("YYYY-MM-DD HH:mm"),
    ).toBe("2026-09-14 14:21");
  });

  it("带格式参数时仍按东八区输出", () => {
    expect(
      attendanceDayjs("2026-09-14 14:21", "YYYY-MM-DD HH:mm").format(
        "YYYY-MM-DD",
      ),
    ).toBe("2026-09-14");
  });

  it("完全无法解析的输入返回 invalid", () => {
    expect(attendanceDayjs("不是日期").isValid()).toBe(false);
    expect(attendanceDayjs("not-a-date").isValid()).toBe(false);
  });

  it("越界月日不会 invalid，而是被 dayjs 自动进位", () => {
    // 由于未加载 customParseFormat 插件，format 参数实际不生效，
    // dayjs 会做 Date 式进位：13 月 -> 次年 1 月，0 月 -> 上年 12 月。
    expect(
      attendanceDayjs("2026-13-01", "YYYY-MM-DD").format("YYYY-MM-DD"),
    ).toBe("2027-01-01");
    expect(
      attendanceDayjs("2026-00-01", "YYYY-MM-DD").format("YYYY-MM-DD"),
    ).toBe("2025-12-01");
    expect(
      attendanceDayjs("2026-02-30", "YYYY-MM-DD").format("YYYY-MM-DD"),
    ).toBe("2026-03-02");
  });

  it("空输入等价于当前时刻", () => {
    expect(attendanceDayjs().isValid()).toBe(true);
  });
});

describe("attendanceTodayStart", () => {
  it("为业务时区今日 0 点", () => {
    const today = attendanceTodayStart();
    expect(today.format("YYYY-MM-DD")).toBe(shanghaiToday());
    expect(today.format("HH:mm:ss")).toBe("00:00:00");
  });
});
