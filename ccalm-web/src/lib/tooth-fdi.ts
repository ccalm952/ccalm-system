/** FDI 牙位：恒牙 11–48，乳牙 51–85 */

/** 界面象限（牙医视角：左=患者右） */
export type UiQuadrant = "UR" | "UL" | "LR" | "LL";

const PERM_BY_UI: Record<UiQuadrant, number[]> = {
  // 患者右上：从外侧 8 → 中线 1
  UR: [18, 17, 16, 15, 14, 13, 12, 11],
  // 患者左上：中线 1 → 外侧 8
  UL: [21, 22, 23, 24, 25, 26, 27, 28],
  LR: [48, 47, 46, 45, 44, 43, 42, 41],
  LL: [31, 32, 33, 34, 35, 36, 37, 38],
};

const DEC_BY_UI: Record<UiQuadrant, number[]> = {
  UR: [55, 54, 53, 52, 51],
  UL: [61, 62, 63, 64, 65],
  LR: [85, 84, 83, 82, 81],
  LL: [71, 72, 73, 74, 75],
};

const DEC_LABEL = ["A", "B", "C", "D", "E"] as const;

export const ALL_PERMANENT: number[] = [
  ...PERM_BY_UI.UR,
  ...PERM_BY_UI.UL,
  ...PERM_BY_UI.LL,
  ...PERM_BY_UI.LR,
];

export const ALL_DECIDUOUS: number[] = [
  ...DEC_BY_UI.UR,
  ...DEC_BY_UI.UL,
  ...DEC_BY_UI.LL,
  ...DEC_BY_UI.LR,
];

export function isValidFdi(n: number): boolean {
  return ALL_PERMANENT.includes(n) || ALL_DECIDUOUS.includes(n);
}

export function isDeciduousFdi(n: number): boolean {
  return ALL_DECIDUOUS.includes(n);
}

/** Palmer 区内显示：恒牙末位 1–8；乳牙 A–E */
export function palmerLabel(fdi: number): string {
  const pos = fdi % 10;
  if (isDeciduousFdi(fdi)) {
    return DEC_LABEL[pos - 1] ?? String(pos);
  }
  return String(pos);
}

export function uiQuadrantOf(fdi: number): UiQuadrant | null {
  for (const q of ["UR", "UL", "LR", "LL"] as const) {
    if (PERM_BY_UI[q].includes(fdi) || DEC_BY_UI[q].includes(fdi)) return q;
  }
  return null;
}

export function permanentInUi(q: UiQuadrant): number[] {
  return PERM_BY_UI[q];
}

export function deciduousInUi(q: UiQuadrant): number[] {
  return DEC_BY_UI[q];
}

/** 前牙：每象限 1–3；后牙：4–8（乳牙后牙 D–E = 4–5） */
export function shortcutPermanent(kind: "all" | "upper" | "lower" | "front" | "back"): number[] {
  const upper = [...PERM_BY_UI.UR, ...PERM_BY_UI.UL];
  const lower = [...PERM_BY_UI.LR, ...PERM_BY_UI.LL];
  if (kind === "all") return ALL_PERMANENT;
  if (kind === "upper") return upper;
  if (kind === "lower") return lower;
  if (kind === "front") {
    return ALL_PERMANENT.filter((n) => n % 10 <= 3);
  }
  return ALL_PERMANENT.filter((n) => n % 10 >= 4);
}

export function shortcutDeciduous(kind: "all" | "upper" | "lower" | "front" | "back"): number[] {
  const upper = [...DEC_BY_UI.UR, ...DEC_BY_UI.UL];
  const lower = [...DEC_BY_UI.LR, ...DEC_BY_UI.LL];
  if (kind === "all") return ALL_DECIDUOUS;
  if (kind === "upper") return upper;
  if (kind === "lower") return lower;
  if (kind === "front") {
    return ALL_DECIDUOUS.filter((n) => n % 10 <= 3);
  }
  return ALL_DECIDUOUS.filter((n) => n % 10 >= 4);
}

export function formatTeeth(fdis: number[]): string {
  const uniq = [...new Set(fdis.filter(isValidFdi))].sort((a, b) => a - b);
  return uniq.join(" ");
}

/**
 * 仅当整段都能解析为有效 FDI 时返回列表；否则 null（自由文本）。
 * 分隔：空格 / 顿号 / 逗号 / 斜杠
 */
export function parseTeethStrict(raw: string): number[] | null {
  const s = raw.trim();
  if (!s) return [];
  const parts = s.split(/[\s、，,/]+/).filter(Boolean);
  if (!parts.length) return [];
  const nums: number[] = [];
  for (const p of parts) {
    if (!/^\d{2}$/.test(p)) return null;
    const n = Number(p);
    if (!isValidFdi(n)) return null;
    nums.push(n);
  }
  return [...new Set(nums)].sort((a, b) => a - b);
}

/** 按象限分组，区内标签按从中线到外侧或保持选择序：用 Palmer 数字/字母拼接 */
export function groupPalmerLabels(fdis: number[]): Record<UiQuadrant, string> {
  const buckets: Record<UiQuadrant, number[]> = {
    UR: [],
    UL: [],
    LR: [],
    LL: [],
  };
  for (const n of fdis) {
    const q = uiQuadrantOf(n);
    if (q) buckets[q].push(n);
  }
  const out: Record<UiQuadrant, string> = { UR: "", UL: "", LR: "", LL: "" };
  for (const q of ["UR", "UL", "LR", "LL"] as const) {
    const list = buckets[q];
    // 显示顺序：恒牙按牙位号，乳牙按 A–E；同区混合时恒牙在前
    list.sort((a, b) => {
      const da = isDeciduousFdi(a) ? 1 : 0;
      const db = isDeciduousFdi(b) ? 1 : 0;
      if (da !== db) return da - db;
      return (a % 10) - (b % 10);
    });
    out[q] = list.map(palmerLabel).join("");
  }
  return out;
}
