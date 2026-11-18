import { chargeItemAmount, roundMoney, sumMoney } from "./charge-calc";

export type CoursePlanRow = {
  teeth: string;
  text: string;
  unitPrice: number | null;
  quantity: number | null;
};

export type CourseChargeItem = {
  feeItemId: null;
  name: string;
  teeth: string;
  unitPrice: number;
  quantity: number;
  amount: number;
};

/**
 * 治疗收费单的明细：只汇总治疗计划里已报价的行，未报价的行不计入并返回数量。
 * 收款不按计划行分摊，明细只是账单依据。
 */
export function courseChargeItems(rows: CoursePlanRow[]) {
  const items: CourseChargeItem[] = [];
  let unquotedCount = 0;
  for (const row of rows) {
    if (row.unitPrice == null) {
      unquotedCount += 1;
      continue;
    }
    const name = row.text.trim();
    if (!name) continue;
    const unitPrice = roundMoney(row.unitPrice);
    const quantity =
      row.quantity != null && row.quantity > 0 ? row.quantity : 1;
    items.push({
      feeItemId: null,
      name,
      teeth: row.teeth.trim(),
      unitPrice,
      quantity,
      amount: chargeItemAmount(unitPrice, quantity),
    });
  }
  return {
    items,
    unquotedCount,
    receivable: sumMoney(items.map((i) => i.amount)),
  };
}
