import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { round2 } from "@/lib/salary/calc";

const SUMMARY_DECIMAL_DRAFT = /^\d*(\.\d{0,2})?$/;
const RATE_PERCENT_DRAFT = /^\d*(\.\d?)?$/;

function formatSummaryDecimalValue(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return String(n);
}

function formatRatePercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return "0";
  const percent = Math.round(ratio * 1000) / 10;
  return String(percent);
}

export function SummaryDecimalInput({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = React.useState(() => formatSummaryDecimalValue(value));
  const focusedRef = React.useRef(false);

  React.useEffect(() => {
    if (!focusedRef.current) {
      setDraft(formatSummaryDecimalValue(value));
    }
  }, [value]);

  return (
    <Input
      inputMode="decimal"
      value={draft}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(e) => {
        const next = e.target.value;
        if (next === "" || SUMMARY_DECIMAL_DRAFT.test(next)) {
          setDraft(next);
        }
      }}
      onBlur={() => {
        focusedRef.current = false;
        const n = round2(Number(draft) || 0);
        onCommit(n);
        setDraft(formatSummaryDecimalValue(n));
      }}
    />
  );
}

export function NumInput(props: {
  value: number;
  onChange: (n: number) => void;
}) {
  const { value, onChange } = props;
  return (
    <Input
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
  );
}

export function RatePercentInput(props: {
  value: number;
  onChange: (ratio: number) => void;
}) {
  const { value, onChange } = props;
  const [draft, setDraft] = React.useState(() => formatRatePercent(value));
  const focusedRef = React.useRef(false);

  React.useEffect(() => {
    if (!focusedRef.current) {
      setDraft(formatRatePercent(value));
    }
  }, [value]);

  return (
    <Input
      inputMode="decimal"
      value={draft}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(e) => {
        const next = e.target.value;
        if (next === "" || RATE_PERCENT_DRAFT.test(next)) {
          setDraft(next);
        }
      }}
      onBlur={() => {
        focusedRef.current = false;
        const percent = Math.round((Number(draft) || 0) * 10) / 10;
        const ratio = percent / 100;
        onChange(ratio);
        setDraft(formatRatePercent(ratio));
      }}
    />
  );
}

export function SalaryOutlineIconButton({
  onClick,
  children,
  "aria-label": ariaLabel,
}: {
  onClick: () => void;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-8"
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
