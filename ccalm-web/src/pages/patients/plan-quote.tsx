import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/charges/charge-calc";
import {
  defaultPlanQuantity,
  type PlanItem,
  planItemAmount,
} from "@/lib/medical-records/record-types";

const NUMBER_INPUT =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function toNumber(raw: string): number | null {
  return raw.trim() === "" ? null : Number(raw);
}

export function PlanQuoteInputs({
  item,
  onChange,
}: {
  item: PlanItem;
  onChange: (patch: Partial<PlanItem>) => void;
}) {
  const amount = planItemAmount(item);
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        placeholder="单价"
        className={`w-28 ${NUMBER_INPUT}`}
        value={item.unitPrice ?? ""}
        onChange={(e) => onChange({ unitPrice: toNumber(e.target.value) })}
      />
      <span className="text-muted-foreground">×</span>
      <Input
        type="number"
        min={1}
        step={1}
        placeholder={String(defaultPlanQuantity(item.teeth))}
        className={`w-20 ${NUMBER_INPUT}`}
        value={item.quantity ?? ""}
        onChange={(e) => onChange({ quantity: toNumber(e.target.value) })}
      />
      <span className="w-28 shrink-0 text-muted-foreground tabular-nums">
        = {amount == null ? "—" : formatMoney(amount)}
      </span>
      <Input
        placeholder="优惠说明"
        value={item.discountNote ?? ""}
        onChange={(e) => onChange({ discountNote: e.target.value })}
      />
    </div>
  );
}

export function PlanQuoteView({ item }: { item: PlanItem }) {
  const amount = planItemAmount(item);
  if (amount == null) return null;
  return (
    <span className="flex items-center gap-3 text-muted-foreground tabular-nums">
      <span>
        {formatMoney(item.unitPrice!)} ×{" "}
        {item.quantity ?? defaultPlanQuantity(item.teeth)} ={" "}
        {formatMoney(amount)}
      </span>
      {item.discountNote ? (
        <span className="text-primary">{item.discountNote}</span>
      ) : null}
    </span>
  );
}
