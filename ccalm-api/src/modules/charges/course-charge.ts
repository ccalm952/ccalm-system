import { chargeItemAmount, roundMoney, sumMoney } from "./charge-calc";

export type CoursePlanLine = {
  feeItemId: number | null;
  name: string;
  /** 明细牙位；空则用组牙位 */
  teeth: string;
  unitPrice: number | null;
  quantity: number | null;
};

export type CoursePlanGroup = {
  teeth: string;
  lines: CoursePlanLine[];
};

export type CourseChargeItem = {
  feeItemId: number | null;
  name: string;
  teeth: string;
  unitPrice: number;
  quantity: number;
  amount: number;
};

/**
 * 治疗收费单明细：展平各组已报价明细；未报价明细不计入并计数。
 * 收款不按计划组分摊，明细只是账单依据。
 */
export function courseChargeItems(groups: CoursePlanGroup[]) {
  const items: CourseChargeItem[] = [];
  let unquotedCount = 0;
  for (const group of groups) {
    const groupTeeth = group.teeth.trim();
    for (const line of group.lines) {
      if (line.unitPrice == null) {
        unquotedCount += 1;
        continue;
      }
      const name = line.name.trim();
      if (!name) continue;
      const unitPrice = roundMoney(line.unitPrice);
      const quantity =
        line.quantity != null && line.quantity > 0 ? line.quantity : 1;
      items.push({
        feeItemId: line.feeItemId,
        name,
        teeth: (line.teeth.trim() || groupTeeth).trim(),
        unitPrice,
        quantity,
        amount: chargeItemAmount(unitPrice, quantity),
      });
    }
  }
  return {
    items,
    unquotedCount,
    receivable: sumMoney(items.map((i) => i.amount)),
  };
}
