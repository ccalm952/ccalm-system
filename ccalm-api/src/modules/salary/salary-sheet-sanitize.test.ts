import { describe, expect, it } from "vitest"

import { stripLegacySalarySheet } from "./salary-sheet-sanitize"

const LEGACY_KEYS = [
  "tier1Rate",
  "tier2Rate",
  "tier3Rate",
  "tier4Rate",
  "tier5Rate",
  "tier6Rate",
  "plantingBonusPerUnit",
]

describe("stripLegacySalarySheet", () => {
  it("删除顶层 tierThresholds", () => {
    const result = stripLegacySalarySheet({
      month: "2026-09",
      tierThresholds: [1, 2, 3],
    })
    expect(result).toEqual({ month: "2026-09" })
    expect("tierThresholds" in result).toBe(false)
  })

  it("删除每个员工的旧版费率字段", () => {
    const employee: Record<string, unknown> = { name: "张三", baseSalary: 5000 }
    for (const key of LEGACY_KEYS) employee[key] = 1

    const result = stripLegacySalarySheet({
      month: "2026-09",
      employees: [employee],
    })

    expect(result.employees).toEqual([{ name: "张三", baseSalary: 5000 }])
  })

  it("保留非旧版字段与未知字段", () => {
    const result = stripLegacySalarySheet({
      month: "2026-09",
      note: "备注",
      employees: [{ name: "李四", extraUnknown: true }],
    })
    expect(result).toEqual({
      month: "2026-09",
      note: "备注",
      employees: [{ name: "李四", extraUnknown: true }],
    })
  })

  it("不修改入参（浅拷贝）", () => {
    const input: Record<string, unknown> = {
      month: "2026-09",
      tierThresholds: [1],
      employees: [{ name: "张三", tier1Rate: 10 }],
    }
    stripLegacySalarySheet(input)
    expect(input.tierThresholds).toEqual([1])
    expect(input.employees).toEqual([{ name: "张三", tier1Rate: 10 }])
  })

  it("employees 不是数组时原样保留", () => {
    const notArray = { a: 1 }
    expect(stripLegacySalarySheet({ employees: notArray }).employees).toBe(
      notArray
    )
    expect(stripLegacySalarySheet({ employees: null }).employees).toBe(null)
    expect(stripLegacySalarySheet({ employees: "x" }).employees).toBe("x")
  })

  it("缺少 employees 时不报错", () => {
    expect(stripLegacySalarySheet({ month: "2026-09" })).toEqual({
      month: "2026-09",
    })
    expect(stripLegacySalarySheet({})).toEqual({})
  })

  it("空 employees 数组保持为空数组", () => {
    expect(stripLegacySalarySheet({ employees: [] }).employees).toEqual([])
  })

  it("数组元素为 null 时只保留空对象", () => {
    const result = stripLegacySalarySheet({
      employees: [null, { name: "王五", tier2Rate: 3 }],
    })
    expect(result.employees).toEqual([{}, { name: "王五" }])
  })
})
