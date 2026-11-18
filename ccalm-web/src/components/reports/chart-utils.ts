/** 饼图配色：以品牌紫为主，搭配区分度更高的辅助色 */
export const PIE_COLORS = [
  "oklch(0.585 0.233 277.117)",
  "oklch(0.7 0.14 195)",
  "oklch(0.78 0.15 80)",
  "oklch(0.65 0.19 25)",
  "oklch(0.62 0.13 155)",
  "oklch(0.72 0.12 330)",
  "oklch(0.62 0.05 265)",
];

/** 取第 index 个扇区颜色；超过 5 项时降低透明度循环使用 */
export function pieColor(index: number): { color: string; opacity: number } {
  if (index < PIE_COLORS.length) {
    return { color: PIE_COLORS[index], opacity: 1 };
  }
  return {
    color: PIE_COLORS[index % PIE_COLORS.length],
    opacity: index % 2 === 0 ? 0.55 : 0.4,
  };
}

export function sumValues(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

/** 金额轴刻度缩写：50万 / 20,000 */
export function formatAxisMoney(value: number): string {
  if (Math.abs(value) >= 100000) {
    const v = value / 10000;
    return `${v >= 100 ? Math.round(v) : Number(v.toFixed(1))}万`;
  }
  return Math.round(value).toLocaleString("zh-CN");
}

/** 取一个比 max 稍大的「好看」上限，便于画 4 等分刻度 */
export function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const padded = value * 1.05;
  const exponent = Math.floor(Math.log10(padded));
  const base = Math.pow(10, exponent);
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  for (const step of steps) {
    if (padded <= step * base) return step * base;
  }
  return 10 * base;
}

/** 横轴标签过密时抽稀 */
export function labelStep(count: number, maxLabels = 12): number {
  if (count <= maxLabels) return 1;
  return Math.ceil(count / maxLabels);
}
