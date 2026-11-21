import { ToothPositionField } from "@/components/tooth-chart/tooth-chart";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/charges/charge-calc";
import {
  defaultPlanQuantity,
  type PlanItem,
  type PlanLine,
  planItemAmount,
  planLineAmount,
} from "@/lib/medical-records/record-types";

const NUMBER_INPUT =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function toNumber(raw: string): number | null {
  return raw.trim() === "" ? null : Number(raw);
}

export function PlanLineQuoteInputs({
  line,
  groupTeeth,
  onChange,
}: {
  line: PlanLine;
  groupTeeth: string;
  onChange: (patch: Partial<PlanLine>) => void;
}) {
  const amount = planLineAmount(line, groupTeeth);
  const qtyPlaceholder = String(
    defaultPlanQuantity(line.teeth.trim() || groupTeeth),
  );
  return (
    <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2">
      <Input
        type="number"
        min={0}
        placeholder="单价"
        className={`w-24 ${NUMBER_INPUT}`}
        value={line.unitPrice ?? ""}
        onChange={(e) => onChange({ unitPrice: toNumber(e.target.value) })}
      />
      <span className="text-muted-foreground">×</span>
      <Input
        type="number"
        min={1}
        step={1}
        placeholder={qtyPlaceholder}
        className={`w-16 ${NUMBER_INPUT}`}
        value={line.quantity ?? ""}
        onChange={(e) => onChange({ quantity: toNumber(e.target.value) })}
      />
      <span className="w-24 shrink-0 text-muted-foreground tabular-nums">
        = {amount == null ? "—" : formatMoney(amount)}
      </span>
      <Input
        placeholder="优惠说明"
        className="min-w-28 flex-1"
        value={line.discountNote ?? ""}
        onChange={(e) => onChange({ discountNote: e.target.value })}
      />
    </div>
  );
}

export function PlanQuoteView({ item }: { item: PlanItem }) {
  const amount = planItemAmount(item);
  if (amount == null && !item.lines.length) return null;
  return (
    <div className="flex flex-col gap-1 text-muted-foreground">
      {item.lines.map((line, i) => {
        const lineAmount = planLineAmount(line, item.teeth);
        return (
          <span
            key={line.id ?? i}
            className="flex flex-wrap items-center gap-3 tabular-nums"
          >
            {line.teeth.trim() ? (
              <ToothPositionField
                plain
                readOnly
                value={line.teeth}
                onValueChange={() => {}}
              />
            ) : null}
            <span className="text-foreground">{line.name}</span>
            {lineAmount == null ? (
              <span>未报价</span>
            ) : (
              <span>
                {formatMoney(line.unitPrice!)} ×{" "}
                {line.quantity ??
                  defaultPlanQuantity(line.teeth.trim() || item.teeth)}{" "}
                = {formatMoney(lineAmount)}
              </span>
            )}
            {line.discountNote ? (
              <span className="text-primary">{line.discountNote}</span>
            ) : null}
          </span>
        );
      })}
      {amount != null && item.lines.length > 1 ? (
        <span className="tabular-nums">合计 {formatMoney(amount)}</span>
      ) : null}
    </div>
  );
}
