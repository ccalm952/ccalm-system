import { describe, expect, it } from "vitest"

import type { MakeupSlotType } from "./makeup-today-gate"
import {
  applyDayAttendance,
  adminMakeupSlotDenyReason,
  buildDayPunchRow,
  countMakeupButtonSlots,
  employeeMakeupSlotDenyReason,
  makeupSlotDenyMessage,
  makeupSlotsEnv,
  type MakeupSlotDenyReason,
  type PendingMakeup,
} from "./makeup-slots"
import type { DayPunchRow } from "./schedule-rest"

const env = makeupSlotsEnv()
/** 上一自然月的 1 号：一定在编辑窗口内，且一定不是今天 */
const PAST_DATE = `${env.editWindowContext.previousMonth}-01`
const TODAY = env.editWindowContext.todayYmd
const LATE = new Date(`${TODAY}T23:59:00+08:00`)
const EARLY = new Date(`${TODAY}T00:00:00+08:00`)

function row(partial: Partial<DayPunchRow> = {}): DayPunchRow {
  return {
    date: PAST_DATE,
    morningIn: null,
    morningOut: null,
    afternoonIn: null,
    afternoonOut: null,
    declaredRest: null,
    ...partial,
  }
}

describe("buildDayPunchRow", () => {
  it("把打卡记录按类型填入对应时段", () => {
    const result = buildDayPunchRow("2026-08-03", null, [
      { type: "morning_in", punchTime: new Date("2026-08-03T00:30:00Z") },
      { type: "morning_out", punchTime: new Date("2026-08-03T04:00:00Z") },
      { type: "afternoon_in", punchTime: new Date("2026-08-03T06:30:00Z") },
      { type: "afternoon_out", punchTime: new Date("2026-08-03T10:00:00Z") },
    ])
    expect(result).toEqual({
      date: "2026-08-03",
      morningIn: "08:30",
      morningOut: "12:00",
      afternoonIn: "14:30",
      afternoonOut: "18:00",
      declaredRest: null,
    })
  })

  it("没有记录时四个时段都是 null", () => {
    expect(buildDayPunchRow("2026-08-03", undefined, [])).toEqual({
      date: "2026-08-03",
      morningIn: null,
      morningOut: null,
      afternoonIn: null,
      afternoonOut: null,
      declaredRest: null,
    })
  })

  it("declaredRest 为 undefined 时回落为 null", () => {
    expect(buildDayPunchRow("2026-08-03", undefined, []).declaredRest).toBe(
      null
    )
    expect(
      buildDayPunchRow("2026-08-03", "morning_rest", []).declaredRest
    ).toBe("morning_rest")
  })

  it("同类型多条记录时后者覆盖前者", () => {
    const result = buildDayPunchRow("2026-08-03", null, [
      { type: "morning_in", punchTime: new Date("2026-08-03T00:30:00Z") },
      { type: "morning_in", punchTime: new Date("2026-08-03T01:00:00Z") },
    ])
    expect(result.morningIn).toBe("09:00")
  })

  it("未知打卡类型被忽略", () => {
    const result = buildDayPunchRow("2026-08-03", null, [
      { type: "unknown", punchTime: new Date("2026-08-03T00:30:00Z") },
    ])
    expect(result.morningIn).toBe(null)
    expect(result.afternoonOut).toBe(null)
  })

  it("接受任意可迭代对象", () => {
    const records = new Set([
      { type: "afternoon_out", punchTime: new Date("2026-08-03T10:00:00Z") },
    ])
    expect(buildDayPunchRow("2026-08-03", null, records).afternoonOut).toBe(
      "18:00"
    )
  })
})

describe("applyDayAttendance", () => {
  it("每个上班卡记半天出勤", () => {
    expect(applyDayAttendance(row())).toBe(0)
    expect(applyDayAttendance(row({ morningIn: "08:30" }))).toBe(0.5)
    expect(applyDayAttendance(row({ afternoonIn: "14:30" }))).toBe(0.5)
    expect(
      applyDayAttendance(row({ morningIn: "08:30", afternoonIn: "14:30" }))
    ).toBe(1)
  })

  it("只有下班卡不计出勤", () => {
    expect(
      applyDayAttendance(row({ morningOut: "12:00", afternoonOut: "18:00" }))
    ).toBe(0)
  })
})

describe("makeupSlotDenyMessage", () => {
  const cases: Array<[MakeupSlotDenyReason, MakeupSlotType, string]> = [
    ["window", "morning_in", "仅支持补本月或上月的缺卡"],
    ["gate", "morning_in", "需等今日上午上班打卡窗口结束后才能补卡"],
    ["gate", "morning_out", "需等今日上午上班打卡窗口结束后才能补卡"],
    ["gate", "afternoon_in", "需等今日下午上班打卡窗口结束后才能补卡"],
    ["gate", "afternoon_out", "需等今日下午上班打卡窗口结束后才能补卡"],
    ["rest", "afternoon_out", "该半天已登记休息，无法补卡"],
    ["exists", "afternoon_in", "该上班卡已存在，无需补卡"],
    ["exists", "afternoon_out", "该下班卡已存在，无需补卡"],
    ["need_in", "morning_out", "需先补上午上班，才能补上午下班"],
    ["need_in", "afternoon_out", "需先补下午上班，才能补下午下班"],
    ["pending", "morning_in", "该缺卡已有审批中的补卡申请"],
  ]

  it.each(cases)("%s + %s 返回对应提示", (reason, type, message) => {
    expect(makeupSlotDenyMessage(reason, type)).toBe(message)
  })
})

describe("employeeMakeupSlotDenyReason", () => {
  it("窗口外的日期直接返回 window", () => {
    expect(
      employeeMakeupSlotDenyReason(
        row({ date: "2000-01-01" }),
        "morning_in",
        [],
        env,
        undefined,
        LATE
      )
    ).toBe("window")
  })

  it("今日缺少 gate 配置时返回 gate", () => {
    expect(
      employeeMakeupSlotDenyReason(
        row({ date: TODAY }),
        "morning_in",
        [],
        env,
        undefined,
        LATE
      )
    ).toBe("gate")
  })

  it("gate 未通过时先于 rest 判定", () => {
    expect(
      employeeMakeupSlotDenyReason(
        row({ date: TODAY, declaredRest: "full_rest" }),
        "morning_in",
        [],
        env,
        undefined,
        EARLY
      )
    ).toBe("gate")
  })

  it("登记了对应半天休息时返回 rest", () => {
    expect(
      employeeMakeupSlotDenyReason(
        row({ declaredRest: "full_rest" }),
        "morning_in",
        [],
        env,
        undefined,
        LATE
      )
    ).toBe("rest")
    expect(
      employeeMakeupSlotDenyReason(
        row({ declaredRest: "morning_rest" }),
        "morning_out",
        [],
        env,
        undefined,
        LATE
      )
    ).toBe("rest")
    expect(
      employeeMakeupSlotDenyReason(
        row({ declaredRest: "morning_rest" }),
        "afternoon_in",
        [],
        env,
        undefined,
        LATE
      )
    ).toBe(null)
  })

  it("上班卡已存在时返回 exists", () => {
    expect(
      employeeMakeupSlotDenyReason(
        row({ morningIn: "08:30" }),
        "morning_in",
        [],
        env,
        undefined,
        LATE
      )
    ).toBe("exists")
  })

  it("补下班卡前必须先有上班卡", () => {
    expect(
      employeeMakeupSlotDenyReason(
        row(),
        "morning_out",
        [],
        env,
        undefined,
        LATE
      )
    ).toBe("need_in")
    expect(
      employeeMakeupSlotDenyReason(
        row({ morningIn: "08:30" }),
        "morning_out",
        [],
        env,
        undefined,
        LATE
      )
    ).toBe(null)
  })

  it("下班卡已存在时返回 exists（need_in 之后判定）", () => {
    expect(
      employeeMakeupSlotDenyReason(
        row({ morningIn: "08:30", morningOut: "12:00" }),
        "morning_out",
        [],
        env,
        undefined,
        LATE
      )
    ).toBe("exists")
  })

  it("存在审批中的申请时返回 pending", () => {
    const pending: PendingMakeup[] = [
      { date: PAST_DATE, type: "morning_in", status: "pending" },
    ]
    expect(
      employeeMakeupSlotDenyReason(
        row(),
        "morning_in",
        pending,
        env,
        undefined,
        LATE
      )
    ).toBe("pending")
  })

  it("非 pending 状态的申请不拦截", () => {
    const pending: PendingMakeup[] = [
      { date: PAST_DATE, type: "morning_in", status: "approved" },
      { date: PAST_DATE, type: "morning_in", status: "rejected" },
    ]
    expect(
      employeeMakeupSlotDenyReason(
        row(),
        "morning_in",
        pending,
        env,
        undefined,
        LATE
      )
    ).toBe(null)
  })

  it("pending 的日期或类型不匹配时不拦截", () => {
    const pending: PendingMakeup[] = [
      { date: "2000-01-01", type: "morning_in", status: "pending" },
      { date: PAST_DATE, type: "afternoon_in", status: "pending" },
    ]
    expect(
      employeeMakeupSlotDenyReason(
        row(),
        "morning_in",
        pending,
        env,
        undefined,
        LATE
      )
    ).toBe(null)
  })

  it("全部条件满足时返回 null 表示可申请", () => {
    expect(
      employeeMakeupSlotDenyReason(
        row(),
        "morning_in",
        [],
        env,
        undefined,
        LATE
      )
    ).toBe(null)
  })
})

describe("adminMakeupSlotDenyReason", () => {
  it("忽略审批中的申请，不返回 pending", () => {
    // 员工版会因 pending 被拦截，管理员版没有 pending 概念
    expect(
      adminMakeupSlotDenyReason(row(), "morning_in", env, undefined, LATE)
    ).toBe(null)
    expect(
      employeeMakeupSlotDenyReason(
        row(),
        "morning_in",
        [{ date: PAST_DATE, type: "morning_in", status: "pending" }],
        env,
        undefined,
        LATE
      )
    ).toBe("pending")
  })

  it("窗口外返回 window，休息返回 rest", () => {
    expect(
      adminMakeupSlotDenyReason(
        row({ date: "2000-01-01" }),
        "morning_in",
        env,
        undefined,
        LATE
      )
    ).toBe("window")
    expect(
      adminMakeupSlotDenyReason(
        row({ declaredRest: "full_rest" }),
        "afternoon_out",
        env,
        undefined,
        LATE
      )
    ).toBe("rest")
  })

  it("缺少上班卡时下班卡返回 need_in", () => {
    expect(
      adminMakeupSlotDenyReason(row(), "afternoon_out", env, undefined, LATE)
    ).toBe("need_in")
  })
})

describe("countMakeupButtonSlots", () => {
  it("空记录且无 gate 时只统计两个上班卡", () => {
    expect(countMakeupButtonSlots(row(), [], undefined, LATE)).toBe(2)
  })

  it("只有上午上班卡时可补上午下班与下午上班", () => {
    expect(
      countMakeupButtonSlots(row({ morningIn: "08:30" }), [], undefined, LATE)
    ).toBe(2)
  })

  it("四个时段齐全时为 0", () => {
    expect(
      countMakeupButtonSlots(
        row({
          morningIn: "08:30",
          morningOut: "12:00",
          afternoonIn: "14:30",
          afternoonOut: "18:00",
        }),
        [],
        undefined,
        LATE
      )
    ).toBe(0)
  })

  it("半天休息会去掉对应两个按钮", () => {
    expect(
      countMakeupButtonSlots(
        row({ declaredRest: "full_rest" }),
        [],
        undefined,
        LATE
      )
    ).toBe(0)
    expect(
      countMakeupButtonSlots(
        row({ declaredRest: "morning_rest" }),
        [],
        undefined,
        LATE
      )
    ).toBe(1)
  })

  it("审批中的申请不再计入缺卡", () => {
    const pending: PendingMakeup[] = [
      { date: PAST_DATE, type: "morning_in", status: "pending" },
    ]
    expect(countMakeupButtonSlots(row(), pending, undefined, LATE)).toBe(1)
  })

  it("窗口外的日期不计任何缺卡", () => {
    expect(
      countMakeupButtonSlots(row({ date: "2000-01-01" }), [], undefined, LATE)
    ).toBe(0)
  })

  it("今日在打卡窗口结束前不可补，窗口结束后正常统计", () => {
    const gate = {
      morningInWindowEnd: "09:00",
      afternoonInWindowEnd: "15:00",
    }
    expect(countMakeupButtonSlots(row({ date: TODAY }), [], gate, EARLY)).toBe(
      0
    )
    expect(countMakeupButtonSlots(row({ date: TODAY }), [], gate, LATE)).toBe(2)
  })
})
