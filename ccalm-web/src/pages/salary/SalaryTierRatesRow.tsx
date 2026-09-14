import { TableCell, TableRow } from "@/components/ui/table";
import type { SalaryTierRates } from "@/lib/salary/types";

import { RatePercentInput } from "./salary-table-inputs";

export function SalaryTierRatesRow({
  label,
  rates,
  onChange,
}: {
  label: string;
  rates: SalaryTierRates;
  onChange: (rates: SalaryTierRates) => void;
}) {
  const tiers: (keyof SalaryTierRates)[] = [
    "tier1Rate",
    "tier2Rate",
    "tier3Rate",
    "tier4Rate",
    "tier5Rate",
    "tier6Rate",
  ];
  return (
    <TableRow>
      <TableCell>{label}</TableCell>
      {tiers.map((key) => (
        <TableCell key={key}>
          <RatePercentInput
            value={rates[key]}
            onChange={(value) => onChange({ ...rates, [key]: value })}
          />
        </TableCell>
      ))}
    </TableRow>
  );
}
