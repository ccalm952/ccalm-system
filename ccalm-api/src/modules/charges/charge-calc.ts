export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function chargeItemAmount(unitPrice: number, quantity: number): number {
  return roundMoney(unitPrice * quantity);
}

export function sumMoney(values: number[]): number {
  return roundMoney(values.reduce((s, v) => s + v, 0));
}

export type ChargeState = "void" | "settled" | "owing";

/** 与前端 lib/charges/charge-calc.ts 一致 */
export function chargeState(
  status: string,
  receivable: number,
  paid: number,
): ChargeState {
  if (status === "void") return "void";
  return roundMoney(receivable - paid) > 0 ? "owing" : "settled";
}
