import { describe, expect, it } from "vitest";

import {
  clean,
  pickInitialFull,
  recordType,
  teeth,
  toothSet,
  visitInfo,
} from "./ekqy-import";

describe("ekqy-import helpers", () => {
  it("clean strips html breaks", () => {
    expect(clean("a<br/>b&nbsp;c")).toBe("a\nb c");
  });

  it("teeth normalizes fdi list", () => {
    expect(teeth(" 11, 21 ,")).toBe("11,21");
    expect([...toothSet("11,21")]).toEqual([11, 21]);
  });

  it("visitInfo drops midnight time", () => {
    expect(
      visitInfo({ id: 1, appointDateTime: "2024-01-02T00:00:00" }, new Map()),
    ).toEqual({ date: "2024-01-02", time: "" });
  });

  it("recordType detects ortho first", () => {
    expect(
      recordType(
        {
          id: 1,
          firstVisit: true,
          treatmentPlanList: [{ planContent: "隐形矫治" }],
        },
        new Map(),
      ),
    ).toBe("orthoFirst");
  });

  it("pickInitialFull prefers firstVisit", () => {
    expect(
      pickInitialFull(
        [
          { id: 2, firstVisit: false, appointDateTime: "2024-02-01" },
          { id: 1, firstVisit: true, appointDateTime: "2024-01-01" },
        ],
        new Map(),
      )?.id,
    ).toBe(1);
  });
});
