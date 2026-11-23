import * as React from "react";

import { ToothPositionField } from "@/components/tooth-chart/tooth-chart";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/charges/charge-calc";
import {
  defaultPlanQuantity,
  discountPercentFromAmount,
  type PlanItem,
  type PlanLine,
  planItemAmount,
  planLineAmount,
  planLineEffectiveUnitPrice,
  planLineHasDiscount,
  planLineListAmount,
  planLineQuantity,
} from "@/lib/medical-records/record-types";

const NUMBER_INPUT =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function toNumber(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
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
  const quantity = planLineQuantity(line, groupTeeth);
  const amount = planLineAmount(line, groupTeeth);
  const listAmount = planLineListAmount(line, groupTeeth);
  const effectiveUnit = planLineEffectiveUnitPrice(line, groupTeeth);
  const hasDiscount = planLineHasDiscount(line, groupTeeth);
  const [amountDraft, setAmountDraft] = React.useState<string | null>(null);

  function applyAmount(nextAmount: number) {
    if (line.unitPrice == null) return;
    onChange({
      quantity,
      discountPercent: discountPercentFromAmount(
        line.unitPrice,
        quantity,
        nextAmount,
      ),
    });
  }

  return (
    <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2">
      <Input
        type="number"
        min={0}
        step={0.01}
        placeholder="标价"
        className={`w-24 ${NUMBER_INPUT}`}
        value={line.unitPrice ?? ""}
        onChange={(e) => {
          const next = toNumber(e.target.value);
          onChange({
            unitPrice: next,
            quantity,
            // 改标价后按原折扣比例重算；无折扣则保持满额
            discountPercent:
              next == null
                ? null
                : line.discountPercent != null &&
                    Number.isFinite(line.discountPercent)
                  ? line.discountPercent
                  : null,
          });
        }}
      />
      <span className="text-muted-foreground">×</span>
      <Input
        type="number"
        min={1}
        step={1}
        placeholder={String(
          defaultPlanQuantity(line.teeth.trim() || groupTeeth),
        )}
        className={`w-16 ${NUMBER_INPUT}`}
        value={line.quantity ?? ""}
        onChange={(e) => onChange({ quantity: toNumber(e.target.value) })}
      />
      <span className="text-muted-foreground">=</span>
      <span className="w-24 shrink-0 text-muted-foreground tabular-nums">
        {listAmount == null ? "—" : formatMoney(listAmount)}
      </span>
      {line.unitPrice != null ? (
        <>
          <span className="shrink-0 text-muted-foreground">折后</span>
          <Input
            type="number"
            min={0}
            step={0.01}
            placeholder="折后金额"
            className={`w-24 ${NUMBER_INPUT}`}
            value={amountDraft ?? (amount == null ? "" : String(amount))}
            onFocus={() => setAmountDraft(amount == null ? "" : String(amount))}
            onChange={(e) => {
              const raw = e.target.value;
              setAmountDraft(raw);
              const nextAmount = toNumber(raw);
              if (nextAmount != null) applyAmount(nextAmount);
            }}
            onBlur={() => {
              if (amountDraft == null) return;
              const nextAmount = toNumber(amountDraft);
              if (nextAmount == null) {
                onChange({ quantity, discountPercent: null });
              } else {
                applyAmount(nextAmount);
              }
              setAmountDraft(null);
            }}
          />
        </>
      ) : null}
      {hasDiscount && effectiveUnit != null && amount != null ? (
        <span className="shrink-0 text-primary tabular-nums">
          折后 {formatMoney(effectiveUnit)} × {quantity} = {formatMoney(amount)}
        </span>
      ) : null}
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
        const qty = planLineQuantity(line, item.teeth);
        const effectiveUnit = planLineEffectiveUnitPrice(line, item.teeth);
        const listAmount = planLineListAmount(line, item.teeth);
        const hasDiscount = planLineHasDiscount(line, item.teeth);
        return (
          <span
            key={line.id ?? i}
            className="flex flex-wrap items-center gap-3 tabular-nums"
          >
            <span className="flex w-40 shrink-0 items-center justify-center">
              {line.teeth.trim() ? (
                <ToothPositionField
                  plain
                  readOnly
                  value={line.teeth}
                  onValueChange={() => {}}
                />
              ) : null}
            </span>
            <span className="text-foreground">{line.name}</span>
            {line.unitPrice == null || listAmount == null ? (
              <span>未报价</span>
            ) : (
              <>
                <span>
                  {formatMoney(line.unitPrice)} × {qty} ={" "}
                  {formatMoney(listAmount)}
                </span>
                {hasDiscount && effectiveUnit != null && lineAmount != null ? (
                  <span className="text-primary">
                    折后 {formatMoney(effectiveUnit)} × {qty} ={" "}
                    {formatMoney(lineAmount)}
                  </span>
                ) : null}
              </>
            )}
          </span>
        );
      })}
      {amount != null && item.lines.length > 1 ? (
        <span className="tabular-nums">合计 {formatMoney(amount)}</span>
      ) : null}
    </div>
  );
}
