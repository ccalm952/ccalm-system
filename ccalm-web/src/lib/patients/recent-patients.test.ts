import { describe, expect, it } from "vitest";

import { pushRecentPatient } from "./recent-patients";

const p = (id: number) => ({ id, name: `患者${id}`, chartNo: "" });

describe("pushRecentPatient", () => {
  it("放到最前并去重", () => {
    expect(pushRecentPatient([p(1), p(2), p(3)], p(2))).toEqual([
      p(2),
      p(1),
      p(3),
    ]);
  });

  it("超出上限丢掉最旧的", () => {
    expect(pushRecentPatient([p(1), p(2)], p(3), 2)).toEqual([p(3), p(1)]);
  });
});
