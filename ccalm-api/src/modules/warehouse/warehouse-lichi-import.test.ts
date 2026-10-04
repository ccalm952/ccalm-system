import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import {
  LICHI_SUPPLIER,
  lichiItemCode,
  parseLichiExcel,
} from "./warehouse-lichi-import";

type Cell = string | number;

function buildExcel(rows: Cell[][]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Sheet1");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const FULL_HEADER: Cell[] = [
  "商品编码",
  "商品名称",
  "发货日期",
  "数量",
  "含税单价",
  "品牌",
  "规格型号",
  "计量单位",
];

describe("parseLichiExcel", () => {
  it("解析完整的一行", () => {
    const rows = parseLichiExcel(
      buildExcel([
        FULL_HEADER,
        ["A-001", "氧化锆冠", "2026-01-05", 2, 128.5, "登腾", "10mm", "颗"],
      ]),
    );

    expect(rows).toEqual([
      {
        code: "A-001",
        name: "氧化锆冠",
        occurDate: "2026-01-05",
        qty: 2,
        unitPrice: 128.5,
        brand: "登腾",
        spec: "10mm",
        unit: "颗",
      },
    ]);
  });

  it("列头关键词优先匹配更具体的一列", () => {
    const rows = parseLichiExcel(
      buildExcel([
        ["编码", "商品编码", "名称", "日期", "数量", "单价"],
        ["WRONG", "RIGHT", "基台", "2026/1/5", "1", "10"],
      ]),
    );

    expect(rows[0].code).toBe("RIGHT");
    expect(rows[0].occurDate).toBe("2026-01-05");
  });

  it("列名包含关键词即可匹配（如「商品名称」「含税单价」）", () => {
    const rows = parseLichiExcel(
      buildExcel([
        ["商品编码(必填)", "商品名称", "发货日期", "数量(个)", "含税单价"],
        ["A-002", "临时冠", "2026-02-28", "3", "50"],
      ]),
    );

    expect(rows[0].code).toBe("A-002");
    expect(rows[0].qty).toBe(3);
    expect(rows[0].unitPrice).toBe(50);
  });

  it("可选列缺失时品牌/规格为空串，单位回落为「个」", () => {
    const rows = parseLichiExcel(
      buildExcel([
        ["商品编码", "商品名称", "发货日期", "数量", "含税单价"],
        ["A-003", "种植体", "2026-03-01", "1", "1000"],
      ]),
    );

    expect(rows[0]).toEqual({
      code: "A-003",
      name: "种植体",
      occurDate: "2026-03-01",
      qty: 1,
      unitPrice: 1000,
      brand: "",
      spec: "",
      unit: "个",
    });
  });

  it("数量四舍五入为整数", () => {
    const rows = parseLichiExcel(
      buildExcel([
        ["商品编码", "商品名称", "发货日期", "数量", "含税单价"],
        ["A-004", "牙冠", "2026-03-02", "2.6", "10"],
      ]),
    );
    expect(rows[0].qty).toBe(3);
  });

  it("多行数据全部解析，顺序保持", () => {
    const rows = parseLichiExcel(
      buildExcel([
        ["商品编码", "商品名称", "发货日期", "数量", "含税单价"],
        ["A-1", "牙冠", "2026-03-02", "1", "10"],
        ["A-2", "基台", "2026-03-03", "2", "20"],
      ]),
    );
    expect(rows.map((r) => r.code)).toEqual(["A-1", "A-2"]);
  });

  it("缺少必填列时报错并列出缺失列名", () => {
    expect(() =>
      parseLichiExcel(
        buildExcel([
          ["商品名称", "备注"],
          ["牙冠", "x"],
        ]),
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      parseLichiExcel(
        buildExcel([
          ["商品名称", "备注"],
          ["牙冠", "x"],
        ]),
      ),
    ).toThrow("Excel 缺少列：编码、日期、数量、单价");
  });

  it("只有表头没有数据行时报错", () => {
    expect(() => parseLichiExcel(buildExcel([FULL_HEADER]))).toThrow(
      "Excel 中没有数据行",
    );
  });

  it("缺少编码或名称时报错并给出行号", () => {
    expect(() =>
      parseLichiExcel(
        buildExcel([
          ["商品编码", "商品名称", "发货日期", "数量", "含税单价"],
          ["", "牙冠", "2026-03-02", "1", "10"],
        ]),
      ),
    ).toThrow("第 2 行缺少编码或名称");

    expect(() =>
      parseLichiExcel(
        buildExcel([
          ["商品编码", "商品名称", "发货日期", "数量", "含税单价"],
          ["A-1", "牙冠", "2026-03-02", "1", "10"],
          ["A-2", "", "2026-03-02", "1", "10"],
        ]),
      ),
    ).toThrow("第 3 行缺少编码或名称");
  });

  it("缺少日期、数量、单价时报错", () => {
    const header = ["商品编码", "商品名称", "发货日期", "数量", "含税单价"];
    expect(() =>
      parseLichiExcel(buildExcel([header, ["A-1", "牙冠", "", "1", "10"]])),
    ).toThrow("第 2 行缺少日期");
    expect(() =>
      parseLichiExcel(
        buildExcel([header, ["A-1", "牙冠", "2026-03-02", "", "10"]]),
      ),
    ).toThrow("第 2 行缺少数量");
    expect(() =>
      parseLichiExcel(
        buildExcel([header, ["A-1", "牙冠", "2026-03-02", "1", ""]]),
      ),
    ).toThrow("第 2 行缺少单价");
  });

  it("数量非法时报错", () => {
    const header = ["商品编码", "商品名称", "发货日期", "数量", "含税单价"];
    expect(() =>
      parseLichiExcel(
        buildExcel([header, ["A-1", "牙冠", "2026-03-02", "abc", "10"]]),
      ),
    ).toThrow("数量不合法：abc");
    expect(() =>
      parseLichiExcel(
        buildExcel([header, ["A-1", "牙冠", "2026-03-02", "0", "10"]]),
      ),
    ).toThrow("数量不合法：0");
    expect(() =>
      parseLichiExcel(
        buildExcel([header, ["A-1", "牙冠", "2026-03-02", "-1", "10"]]),
      ),
    ).toThrow("数量不合法：-1");
  });

  it("单价为负或非法时报错，0 合法", () => {
    const header = ["商品编码", "商品名称", "发货日期", "数量", "含税单价"];
    expect(() =>
      parseLichiExcel(
        buildExcel([header, ["A-1", "牙冠", "2026-03-02", "1", "-1"]]),
      ),
    ).toThrow("单价不合法：-1");
    expect(() =>
      parseLichiExcel(
        buildExcel([header, ["A-1", "牙冠", "2026-03-02", "1", "abc"]]),
      ),
    ).toThrow("单价不合法：abc");
    expect(
      parseLichiExcel(
        buildExcel([header, ["A-1", "牙冠", "2026-03-02", "1", "0"]]),
      )[0].unitPrice,
    ).toBe(0);
  });

  it("日期非法时报错", () => {
    const header = ["商品编码", "商品名称", "发货日期", "数量", "含税单价"];
    expect(() =>
      parseLichiExcel(
        buildExcel([header, ["A-1", "牙冠", "not-a-date", "1", "10"]]),
      ),
    ).toThrow("日期不合法：not-a-date");
  });
});

describe("lichiItemCode", () => {
  it("去除首尾空白", () => {
    expect(lichiItemCode("  A-001  ")).toBe("A-001");
    expect(lichiItemCode("A-001")).toBe("A-001");
  });

  it("空编码抛 400", () => {
    expect(() => lichiItemCode("")).toThrow(BadRequestException);
    expect(() => lichiItemCode("   ")).toThrow("存在空的编码");
  });
});

describe("LICHI_SUPPLIER", () => {
  it("固定为励齿", () => {
    expect(LICHI_SUPPLIER).toBe("励齿");
  });
});
