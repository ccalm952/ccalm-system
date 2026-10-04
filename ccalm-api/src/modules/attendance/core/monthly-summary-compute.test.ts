import { describe, expect, it } from "vitest";

import { attendanceDayjs, attendanceTodayStart } from "./attendance-dayjs";
import {
  computeMonthlySummaryAggregate,
  fmtOvertimeMinutes,
  monthSummaryBounds,
  overtimeMinutesForOutTimes,
} from "./monthly-summary-compute";

const SHIFT = {
  morningInWindowEnd: "09:00",
  afternoonInWindowEnd: "15:00",
  overtimeMorningNormalEnd: "12:00",
  overtimeAfternoonNormalEnd: "18:00",
};

type RestType = "full_rest" | "morning_rest" | "afternoon_rest";

function punch(punchDate: string, hm: string, type: string, source = "device") {
  return {
    punchDate,
    punchTime: new Date(`${punchDate}T${hm}:00+08:00`),
    type,
    source,
  };
}

describe("fmtOvertimeMinutes", () => {
  it("小于等于 0 显示短横线", () => {
    expect(fmtOvertimeMinutes(0)).toBe("-");
    expect(fmtOvertimeMinutes(-1)).toBe("-");
    expect(fmtOvertimeMinutes(-120)).toBe("-");
  });

  it("不足一小时只显示分钟", () => {
    expect(fmtOvertimeMinutes(1)).toBe("1分钟");
    expect(fmtOvertimeMinutes(59)).toBe("59分钟");
  });

  it("整小时不显示分钟", () => {
    expect(fmtOvertimeMinutes(60)).toBe("1小时");
    expect(fmtOvertimeMinutes(120)).toBe("2小时");
    expect(fmtOvertimeMinutes(1440)).toBe("24小时");
  });

  it("小时加分钟组合显示", () => {
    expect(fmtOvertimeMinutes(61)).toBe("1小时1分钟");
    expect(fmtOvertimeMinutes(90)).toBe("1小时30分钟");
    expect(fmtOvertimeMinutes(195)).toBe("3小时15分钟");
  });

  it("NaN 会产生 NaN 文案（无兜底）", () => {
    expect(fmtOvertimeMinutes(Number.NaN)).toBe("NaN小时NaN分钟");
  });
});

describe("overtimeMinutesForOutTimes", () => {
  it("没有下班卡时加班为 0", () => {
    expect(overtimeMinutesForOutTimes(null, null, SHIFT)).toBe(0);
  });

  it("超过标准下班时间的部分计为加班", () => {
    expect(overtimeMinutesForOutTimes("12:30", null, SHIFT)).toBe(30);
    expect(overtimeMinutesForOutTimes(null, "18:45", SHIFT)).toBe(45);
    expect(overtimeMinutesForOutTimes("13:00", "19:00", SHIFT)).toBe(120);
  });

  it("早于标准下班时间不产生负加班", () => {
    expect(overtimeMinutesForOutTimes("11:00", "17:00", SHIFT)).toBe(0);
    expect(overtimeMinutesForOutTimes("00:00", "00:00", SHIFT)).toBe(0);
  });

  it("刚好等于标准下班时间为 0", () => {
    expect(overtimeMinutesForOutTimes("12:00", "18:00", SHIFT)).toBe(0);
  });

  it("标准下班时间非法时该半天不计加班", () => {
    const bad = {
      overtimeMorningNormalEnd: "invalid",
      overtimeAfternoonNormalEnd: "",
    };
    expect(overtimeMinutesForOutTimes("13:00", "19:00", bad)).toBe(0);
  });

  it("下班卡时间非法时该半天不计加班，不会产生 NaN", () => {
    expect(overtimeMinutesForOutTimes("abc", null, SHIFT)).toBe(0);
    expect(overtimeMinutesForOutTimes(null, "abc", SHIFT)).toBe(0);
    // 一侧非法时，另一侧仍应正常计算
    expect(overtimeMinutesForOutTimes("abc", "19:00", SHIFT)).toBe(60);
  });
});

describe("computeMonthlySummaryAggregate", () => {
  it("按日期倒序生成行，并汇总出勤、休息、加班", () => {
    const declaredScheduleMap = new Map<string, RestType>([
      ["2020-01-01", "full_rest"],
      ["2020-01-02", "morning_rest"],
    ]);

    const result = computeMonthlySummaryAggregate({
      start: attendanceDayjs("2020-01-01"),
      end: attendanceDayjs("2020-01-03"),
      todayYmd: "2026-09-28",
      declaredScheduleMap,
      shift: SHIFT,
      records: [
        punch("2020-01-03", "08:30", "morning_in"),
        punch("2020-01-03", "14:30", "afternoon_in"),
        punch("2020-01-02", "12:00", "morning_out", "makeup"),
      ],
    });

    expect(result.rows.map((r) => r.date)).toEqual([
      "2020-01-03",
      "2020-01-02",
      "2020-01-01",
    ]);
    expect(result.attendanceDays).toBe(1);
    expect(result.restDays).toBe(1.5);
    expect(result.overtimeMinutes).toBe(0);
    expect(result.overtimeStr).toBe("-");
    // 这些日期早已超出编辑窗口，因此缺卡数为 0
    expect(result.missingSlots).toBe(0);
  });

  it("区分补卡来源与半天休息归属", () => {
    const result = computeMonthlySummaryAggregate({
      start: attendanceDayjs("2020-01-02"),
      end: attendanceDayjs("2020-01-02"),
      todayYmd: "2026-09-28",
      declaredScheduleMap: new Map<string, RestType>([
        ["2020-01-02", "afternoon_rest"],
      ]),
      shift: SHIFT,
      records: [
        punch("2020-01-02", "08:30", "morning_in"),
        punch("2020-01-02", "12:00", "morning_out", "makeup"),
        punch("2020-01-02", "18:30", "afternoon_out"),
      ],
    });

    const [r] = result.rows;
    expect(r).toBeDefined();
    expect(r.declaredRest).toBe("afternoon_rest");
    expect(r.morningOutIsMakeup).toBe(true);
    expect(r.afternoonOutIsMakeup).toBe(false);
    expect(result.restDays).toBe(0.5);
    expect(result.attendanceDays).toBe(0.5);
    expect(result.overtimeMinutes).toBe(30);
    expect(result.overtimeStr).toBe("30分钟");
  });

  it("上下午加班累加并计算文案", () => {
    const result = computeMonthlySummaryAggregate({
      start: attendanceDayjs("2020-01-05"),
      end: attendanceDayjs("2020-01-05"),
      todayYmd: "2026-09-28",
      declaredScheduleMap: new Map<string, RestType>(),
      shift: SHIFT,
      records: [
        punch("2020-01-05", "13:30", "morning_out"),
        punch("2020-01-05", "19:45", "afternoon_out", "makeup"),
      ],
    });

    expect(result.rows[0].overtimeMinutes).toBe(195);
    expect(result.rows[0].overtimeStr).toBe("3小时15分钟");
    expect(result.overtimeMinutes).toBe(195);
    expect(result.overtimeStr).toBe("3小时15分钟");
  });

  it("上班卡取最早一条，下班卡取最后一条", () => {
    const result = computeMonthlySummaryAggregate({
      start: attendanceDayjs("2020-01-06"),
      end: attendanceDayjs("2020-01-06"),
      todayYmd: "2026-09-28",
      declaredScheduleMap: new Map<string, RestType>(),
      shift: SHIFT,
      records: [
        punch("2020-01-06", "08:00", "morning_in"),
        punch("2020-01-06", "09:00", "morning_in"),
        punch("2020-01-06", "12:00", "morning_out"),
        punch("2020-01-06", "12:30", "morning_out", "makeup"),
      ],
    });

    const [r] = result.rows;
    expect(r.morningIn).toBe("08:00");
    expect(r.morningOut).toBe("12:30");
    expect(r.morningOutIsMakeup).toBe(true);
  });

  it("没有记录时全为 null 且所有汇总为 0", () => {
    const result = computeMonthlySummaryAggregate({
      start: attendanceDayjs("2020-01-07"),
      end: attendanceDayjs("2020-01-07"),
      todayYmd: "2026-09-28",
      declaredScheduleMap: new Map<string, RestType>(),
      shift: SHIFT,
      records: [],
    });

    expect(result).toEqual({
      attendanceDays: 0,
      restDays: 0,
      missingSlots: 0,
      overtimeMinutes: 0,
      overtimeStr: "-",
      rows: [
        {
          date: "2020-01-07",
          morningIn: null,
          morningOut: null,
          afternoonIn: null,
          afternoonOut: null,
          morningOutIsMakeup: false,
          afternoonOutIsMakeup: false,
          declaredRest: null,
          overtimeMinutes: 0,
          overtimeStr: "-",
        },
      ],
    });
  });

  it("跨月区间逐日展开，起止均包含", () => {
    const result = computeMonthlySummaryAggregate({
      start: attendanceDayjs("2020-02-28"),
      end: attendanceDayjs("2020-03-01"),
      todayYmd: "2026-09-28",
      declaredScheduleMap: new Map<string, RestType>(),
      shift: SHIFT,
      records: [],
    });

    expect(result.rows.map((r) => r.date)).toEqual([
      "2020-03-01",
      "2020-02-29",
      "2020-02-28",
    ]);
  });

  it("只有休息没有打卡时仍计休息天数", () => {
    const result = computeMonthlySummaryAggregate({
      start: attendanceDayjs("2020-01-08"),
      end: attendanceDayjs("2020-01-08"),
      todayYmd: "2026-09-28",
      declaredScheduleMap: new Map<string, RestType>([
        ["2020-01-08", "full_rest"],
      ]),
      shift: SHIFT,
      records: [],
    });

    expect(result.restDays).toBe(1);
    expect(result.attendanceDays).toBe(0);
  });
});

describe("monthSummaryBounds", () => {
  it("历史月份取整月范围", () => {
    const feb2020 = monthSummaryBounds("2020-02");
    expect(feb2020?.startDate).toBe("2020-02-01");
    expect(feb2020?.rangeEnd).toBe("2020-02-29");

    const feb2021 = monthSummaryBounds("2021-02");
    expect(feb2021?.rangeEnd).toBe("2021-02-28");

    const dec2020 = monthSummaryBounds("2020-12");
    expect(dec2020?.rangeEnd).toBe("2020-12-31");
  });

  it("未来月份同样取整月范围，不做上限裁剪", () => {
    const future = monthSummaryBounds("2099-05");
    expect(future?.startDate).toBe("2099-05-01");
    expect(future?.rangeEnd).toBe("2099-05-31");
  });

  it("当月截止到今天", () => {
    const today = attendanceTodayStart();
    const month = today.format("YYYY-MM");
    const bounds = monthSummaryBounds(month);
    expect(bounds?.todayYmd).toBe(today.format("YYYY-MM-DD"));
    expect(bounds?.startDate).toBe(`${month}-01`);
    expect(bounds?.rangeEnd).toBe(today.format("YYYY-MM-DD"));
  });

  it("完全无法解析的月份字符串不会返回 null，而是被 dayjs 进位", () => {
    // "abcd-01" 在 dayjs 下解析为 2001-01-01，因此 isValid() 为真，
    // monthSummaryBounds 中的 null 分支实际很难触发。
    const bounds = monthSummaryBounds("abcd");
    expect(bounds).not.toBe(null);
    expect(bounds?.startDate).toBe("2001-01-01");
    expect(bounds?.rangeEnd).toBe("2001-01-31");
  });

  it("越界月份会被进位到相邻年份", () => {
    const bounds = monthSummaryBounds("2026-13");
    expect(bounds?.startDate).toBe("2027-01-01");
    expect(bounds?.rangeEnd).toBe("2027-01-31");
  });
});
