export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function chargeItemAmount(unitPrice: number, quantity: number): number {
  return roundMoney(unitPrice * quantity);
}

export function sumMoney(values: number[]): number {
  return roundMoney(values.reduce((s, v) => s + v, 0));
}

export function formatMoney(n: number): string {
  return n.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type ChargeState = "void" | "settled" | "owing";

export const CHARGE_STATE_LABELS: Record<ChargeState, string> = {
  settled: "已结清",
  owing: "欠费",
  void: "已作废",
};

/** 与后端 modules/charges/charge-calc.ts 一致 */
export function chargeState(
  status: string,
  receivable: number,
  paid: number,
): ChargeState {
  if (status === "void") return "void";
  return roundMoney(receivable - paid) > 0 ? "owing" : "settled";
}

export const PAY_METHODS = ["现金", "微信", "支付宝", "银行卡", "其他"];
