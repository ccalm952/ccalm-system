import { describe, expect, it } from "vitest";

import {
  passesMakeupTodayGate,
  type MakeupTodayGate,
  type MakeupSlotType,
} from "./makeup-today-gate";

const gate: MakeupTodayGate = {
  morningInWindowEnd: "09:00",
  afternoonInWindowEnd: "15:00",
};

describe("passesMakeupTodayGate", () => {
  it("非今日一律放行，且不要求 gate 配置", () => {
    for (const type of [
      "morning_in",
      "morning_out",
      "afternoon_in",
      "afternoon_out",
    ] as MakeupSlotType[]) {
      expect(passesMakeupTodayGate(false, 0, type, undefined)).toBe(true);
      expect(passesMakeupTodayGate(false, 1439, type, gate)).toBe(true);
    }
  });

  it("今日缺少 gate 配置时一律拒绝", () => {
    expect(passesMakeupTodayGate(true, 1439, "morning_in", undefined)).toBe(
      false,
    );
  });

  it("今日必须严格晚于窗口结束时刻", () => {
    expect(passesMakeupTodayGate(true, 9 * 60, "morning_in", gate)).toBe(false);
    expect(passesMakeupTodayGate(true, 9 * 60 + 1, "morning_in", gate)).toBe(
      true,
    );
  });

  it("上午班次（含上班/下班）用 morningInWindowEnd", () => {
    expect(passesMakeupTodayGate(true, 9 * 60 + 1, "morning_in", gate)).toBe(
      true,
    );
    expect(passesMakeupTodayGate(true, 9 * 60 + 1, "morning_out", gate)).toBe(
      true,
    );
    expect(passesMakeupTodayGate(true, 9 * 60 + 1, "afternoon_in", gate)).toBe(
      false,
    );
  });

  it("下午班次（含上班/下班）用 afternoonInWindowEnd", () => {
    expect(passesMakeupTodayGate(true, 15 * 60 + 1, "afternoon_in", gate)).toBe(
      true,
    );
    expect(
      passesMakeupTodayGate(true, 15 * 60 + 1, "afternoon_out", gate),
    ).toBe(true);
    expect(passesMakeupTodayGate(true, 15 * 60, "afternoon_out", gate)).toBe(
      false,
    );
  });

  it("窗口结束时间非法时按不通过处理", () => {
    const bad: MakeupTodayGate = {
      morningInWindowEnd: "invalid",
      afternoonInWindowEnd: "",
    };
    expect(passesMakeupTodayGate(true, 1439, "morning_in", bad)).toBe(false);
    expect(passesMakeupTodayGate(true, 1439, "afternoon_in", bad)).toBe(false);
  });
});
