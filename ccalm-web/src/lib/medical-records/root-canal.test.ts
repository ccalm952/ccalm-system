import { describe, expect, it } from "vitest";

import {
  canalPresetsForTeeth,
  canalSlotsForTeeth,
  formatCanalGroups,
  GENERIC_CANALS,
  optionalCanalPresetsForTeeth,
  parseCanalGroups,
} from "./root-canal";

describe("canalSlotsForTeeth", () => {
  it("MB2 默认不占槽位，单独作为可选根管", () => {
    expect(canalSlotsForTeeth("16")).toEqual(["近颊", "远颊", "腭"]);
    expect(optionalCanalPresetsForTeeth("16")).toEqual(["近颊2"]);
  });

  it("下颌磨牙没有可选根管", () => {
    expect(canalSlotsForTeeth("46")).toEqual(["近颊", "近舌", "远中"]);
    expect(optionalCanalPresetsForTeeth("46")).toEqual([]);
  });
});

describe("canalPresetsForTeeth", () => {
  it("前牙单根", () => {
    expect(canalPresetsForTeeth("11")).toEqual(["单根"]);
  });

  it("上颌前磨牙颊腭两根", () => {
    expect(canalPresetsForTeeth("14")).toEqual(["颊", "腭"]);
  });

  it("上颌磨牙 MB2 也算一根", () => {
    expect(canalPresetsForTeeth("16")).toEqual(["近颊", "近颊2", "远颊", "腭"]);
  });

  it("下颌磨牙近颊、近舌、远中", () => {
    expect(canalPresetsForTeeth("36")).toEqual(["近颊", "近舌", "远中"]);
  });

  it("下颌前磨牙按单根", () => {
    expect(canalPresetsForTeeth("44")).toEqual(["单根"]);
  });

  it("乳磨牙按乳牙根管", () => {
    expect(canalPresetsForTeeth("75")).toEqual(["近中", "远中"]);
    expect(canalPresetsForTeeth("55")).toEqual(["近颊", "远颊", "腭"]);
  });

  it("多牙位合并候选", () => {
    expect(canalPresetsForTeeth("36 16")).toEqual([
      "近颊",
      "近颊2",
      "远颊",
      "腭",
      "近舌",
      "远中",
    ]);
  });

  it("没牙位或牙位是自由文本时给通用候选", () => {
    expect(canalPresetsForTeeth("")).toEqual(GENERIC_CANALS);
    expect(canalPresetsForTeeth("左上后牙")).toEqual(GENERIC_CANALS);
  });
});

describe("parseCanalGroups", () => {
  it("识别旧病历里的长句，锉号一起解析", () => {
    expect(
      parseCanalGroups("根备 腭根18mm 0625 近颊16mm 0425 远颊15mm"),
    ).toEqual({
      prefix: "",
      groups: [
        {
          tooth: "",
          before: "根备",
          after: "",
          canals: [
            { name: "腭", length: "18", file: "0625" },
            { name: "近颊", length: "16", file: "0425" },
            { name: "远颊", length: "15" },
          ],
        },
      ],
    });
  });

  it("按牙位分组，各组互不干扰", () => {
    expect(
      parseCanalGroups("36：近颊18 近舌17 远中17\n37：近颊18 近舌17"),
    ).toEqual({
      prefix: "",
      groups: [
        {
          tooth: "36",
          before: "",
          after: "",
          canals: [
            { name: "近颊", length: "18" },
            { name: "近舌", length: "17" },
            { name: "远中", length: "17" },
          ],
        },
        {
          tooth: "37",
          before: "",
          after: "",
          canals: [
            { name: "近颊", length: "18" },
            { name: "近舌", length: "17" },
          ],
        },
      ],
    });
  });

  it("仍兼容旧的「；」分隔写法", () => {
    const { groups } = parseCanalGroups("36：近颊18；37：近颊19");
    expect(groups.map((g) => g.tooth)).toEqual(["36", "37"]);
  });

  it("「腭根」「颊根」「单根管」都归一成短名，不会多出一根", () => {
    const { groups } = parseCanalGroups("15：颊根22 腭根22");
    expect(groups[0].canals).toEqual([
      { name: "颊", length: "22" },
      { name: "腭", length: "22" },
    ]);
    expect(parseCanalGroups("11：单根管15").groups[0].canals).toEqual([
      { name: "单根", length: "15" },
    ]);
  });

  it("组内的其他文字按前后保留", () => {
    const { groups } = parseCanalGroups("36：根备 近颊18 近舌17 试尖");
    expect(groups[0].before).toBe("根备");
    expect(groups[0].after).toBe("试尖");
  });

  it("别名归一到规范名", () => {
    expect(
      parseCanalGroups("腭根18 近中颊16 近颊2 17").groups[0].canals,
    ).toEqual([
      { name: "腭", length: "18" },
      { name: "近颊", length: "16" },
      { name: "近颊2", length: "17" },
    ]);
  });

  it("只有根管名（长度还没填）也能识别", () => {
    expect(parseCanalGroups("近颊").groups[0].canals).toEqual([
      { name: "近颊", length: "" },
    ]);
  });

  it("自由文本里的根管名不会被误判", () => {
    expect(parseCanalGroups("36 近颊侧壁龋坏，充填")).toEqual({
      prefix: "36 近颊侧壁龋坏，充填",
      groups: [],
    });
    expect(parseCanalGroups("根管预备 36")).toEqual({
      prefix: "根管预备 36",
      groups: [],
    });
  });

  it("支持小数点与各种分隔", () => {
    expect(parseCanalGroups("近颊=18.5 远中：17mm").groups[0].canals).toEqual([
      { name: "近颊", length: "18.5" },
      { name: "远中", length: "17" },
    ]);
  });

  it("「近颊22」按 22mm 解析，不会拆成近颊2 2mm", () => {
    expect(parseCanalGroups("近颊22").groups[0].canals).toEqual([
      { name: "近颊", length: "22" },
    ]);
  });

  it("近颊2 与长度之间要空格或分隔符", () => {
    expect(parseCanalGroups("近颊2 18 远中=17").groups[0].canals).toEqual([
      { name: "近颊2", length: "18" },
      { name: "远中", length: "17" },
    ]);
  });

  it("同名根管重复时只保留一个", () => {
    expect(parseCanalGroups("近颊18 近颊17").groups[0].canals).toEqual([
      { name: "近颊", length: "17" },
    ]);
  });
});

describe("formatCanalGroups", () => {
  it("单牙位写回短格式", () => {
    expect(
      formatCanalGroups("", [
        {
          tooth: "",
          before: "根备",
          after: "",
          canals: [
            { name: "近颊", length: "18" },
            { name: "近舌", length: "17" },
            { name: "远中", length: "17" },
          ],
        },
      ]),
    ).toBe("根备 近颊18 近舌17 远中17");
  });

  it("多牙位带牙位前缀，一个牙位一行", () => {
    expect(
      formatCanalGroups("", [
        {
          tooth: "36",
          before: "",
          after: "",
          canals: [{ name: "近颊", length: "18" }],
        },
        {
          tooth: "37",
          before: "",
          after: "",
          canals: [{ name: "腭", length: "16" }],
        },
      ]),
    ).toBe("36 近颊18\n37 腭16");
  });

  it("空组不写进文本", () => {
    expect(
      formatCanalGroups("", [
        { tooth: "36", before: "", after: "", canals: [] },
      ]),
    ).toBe("");
    expect(formatCanalGroups("根备", [])).toBe("根备");
  });

  it("解析后再回写不改变已规范化的文本", () => {
    const texts = [
      "36 近颊18 近舌17 远中17",
      "36 近颊18 近舌17\n37 近颊18",
      "25 颊22 腭22",
      "根备 近颊18 近舌17",
    ];
    for (const text of texts) {
      const { prefix, groups } = parseCanalGroups(text);
      expect(formatCanalGroups(prefix, groups)).toBe(text);
    }
  });

  it("旧的「牙位：」写法回写后改成空格", () => {
    const { prefix, groups } = parseCanalGroups("36：近颊18\n37：腭19");
    expect(formatCanalGroups(prefix, groups)).toBe("36 近颊18\n37 腭19");
  });

  it("旧「；」分隔的文本回写后改成一个牙位一行", () => {
    const { prefix, groups } = parseCanalGroups("36 近颊18；37 近颊19");
    expect(formatCanalGroups(prefix, groups)).toBe("36 近颊18\n37 近颊19");
  });

  it("旧长句解析后回写会去掉 mm 与冗余空格", () => {
    const { prefix, groups } = parseCanalGroups(
      "根备   腭根18mm   0625 近颊16mm 0425",
    );
    expect(formatCanalGroups(prefix, groups)).toBe(
      "根备 腭18 0625 近颊16 0425",
    );
  });
});

describe("预设根管名", () => {
  const allFdis = [
    ...[1, 2, 3, 4].flatMap((q) =>
      [1, 2, 3, 4, 5, 6, 7, 8].map((p) => q * 10 + p),
    ),
    ...[5, 6, 7, 8].flatMap((q) => [1, 2, 3, 4, 5].map((p) => q * 10 + p)),
  ];

  it("每个牙位的每个预设根管，写进文本后都能原样解析回来", () => {
    const problems: string[] = [];
    for (const fdi of allFdis) {
      for (const name of canalPresetsForTeeth(String(fdi))) {
        const text = formatCanalGroups("", [
          {
            tooth: String(fdi),
            before: "",
            after: "",
            canals: [{ name, length: "18" }],
          },
        ]);
        const parsed = parseCanalGroups(text).groups[0]?.canals ?? [];
        const got = parsed.map((c) => `${c.name}${c.length}`).join(" ");
        if (parsed.length !== 1 || got !== `${name}18`) {
          problems.push(`${fdi} ${name} → ${text} → ${got || "(空)"}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
