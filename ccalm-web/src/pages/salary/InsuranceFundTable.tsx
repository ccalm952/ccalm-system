import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { computeInsuranceTable } from "@/lib/salary/calc";
import type {
  SalaryHousingFundInput,
  SalaryInsuranceInput,
} from "@/lib/salary/types";

import { NumInput, RatePercentInput } from "./salary-table-inputs";

export function InsuranceFundTable({
  insurance,
  housingFund,
  onInsuranceChange,
  onHousingChange,
}: {
  insurance: SalaryInsuranceInput;
  housingFund: SalaryHousingFundInput;
  onInsuranceChange: (patch: Partial<SalaryInsuranceInput>) => void;
  onHousingChange: (patch: Partial<SalaryHousingFundInput>) => void;
}) {
  const { lines, groupTotals, groupSubtotals } = computeInsuranceTable(
    insurance,
    housingFund,
  );
  const socialLines = lines.filter((line) => line.group === "social");
  const medicalLines = lines.filter((line) => line.group === "medical");
  const housingLine = lines.find((line) => line.group === "housing")!;

  function renderInsuranceRow(
    line: (typeof lines)[number],
    rowIndex: number,
    groupLines: typeof lines,
    groupTotal: number,
    groupSubtotal: { employer: number; personal: number | null },
    patchBase: (value: number) => void,
    patchEmployer: (patch: { rate?: number; count?: number }) => void,
    patchPersonal: (patch: { rate?: number; count?: number }) => void,
  ) {
    return (
      <TableRow key={line.key}>
        {rowIndex === 0 ? (
          <TableCell rowSpan={groupLines.length}>{line.groupLabel}</TableCell>
        ) : null}
        <TableCell>{line.label}</TableCell>
        <TableCell>
          <NumInput value={line.base} onChange={patchBase} />
        </TableCell>
        <TableCell>
          <RatePercentInput
            value={line.employerRate}
            onChange={(rate) => patchEmployer({ rate })}
          />
        </TableCell>
        <TableCell>{line.employerPayment}</TableCell>
        {rowIndex === 0 ? (
          <TableCell rowSpan={groupLines.length}>
            {groupSubtotal.employer}
          </TableCell>
        ) : null}
        <TableCell>
          <NumInput
            value={line.employerCount}
            onChange={(count) => patchEmployer({ count })}
          />
        </TableCell>
        <TableCell>
          {line.personalRate != null ? (
            <RatePercentInput
              value={line.personalRate}
              onChange={(rate) => patchPersonal({ rate })}
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>
          {line.personalPayment != null ? (
            line.personalPayment
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        {rowIndex === 0 ? (
          <TableCell rowSpan={groupLines.length}>
            {groupSubtotal.personal != null ? (
              groupSubtotal.personal
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
        ) : null}
        <TableCell>
          {line.personalCount != null ? (
            <NumInput
              value={line.personalCount}
              onChange={(count) => patchPersonal({ count })}
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>{line.rowTotal}</TableCell>
        {rowIndex === 0 ? (
          <TableCell rowSpan={groupLines.length}>{groupTotal}</TableCell>
        ) : null}
      </TableRow>
    );
  }

  const socialPatches = [
    {
      line: socialLines[0],
      base: (v: number) => onInsuranceChange({ pensionBase: v }),
      employer: (p: { rate?: number; count?: number }) =>
        onInsuranceChange({
          ...(p.rate != null ? { pensionEmployerRate: p.rate } : {}),
          ...(p.count != null ? { pensionEmployerCount: p.count } : {}),
        }),
      personal: (p: { rate?: number; count?: number }) =>
        onInsuranceChange({
          ...(p.rate != null ? { pensionPersonalRate: p.rate } : {}),
          ...(p.count != null ? { pensionPersonalCount: p.count } : {}),
        }),
    },
    {
      line: socialLines[1],
      base: (v: number) => onInsuranceChange({ unemploymentBase: v }),
      employer: (p: { rate?: number; count?: number }) =>
        onInsuranceChange({
          ...(p.rate != null ? { unemploymentEmployerRate: p.rate } : {}),
          ...(p.count != null ? { unemploymentEmployerCount: p.count } : {}),
        }),
      personal: (p: { rate?: number; count?: number }) =>
        onInsuranceChange({
          ...(p.rate != null ? { unemploymentPersonalRate: p.rate } : {}),
          ...(p.count != null ? { unemploymentPersonalCount: p.count } : {}),
        }),
    },
    {
      line: socialLines[2],
      base: (v: number) => onInsuranceChange({ injuryBase: v }),
      employer: (p: { rate?: number; count?: number }) =>
        onInsuranceChange({
          ...(p.rate != null ? { injuryEmployerRate: p.rate } : {}),
          ...(p.count != null ? { injuryEmployerCount: p.count } : {}),
        }),
      personal: () => undefined,
    },
  ];

  const medicalPatches = [
    {
      line: medicalLines[0],
      base: (v: number) => onInsuranceChange({ medicalBase: v }),
      employer: (p: { rate?: number; count?: number }) =>
        onInsuranceChange({
          ...(p.rate != null ? { medicalEmployerRate: p.rate } : {}),
          ...(p.count != null ? { medicalEmployerCount: p.count } : {}),
        }),
      personal: (p: { rate?: number; count?: number }) =>
        onInsuranceChange({
          ...(p.rate != null ? { medicalPersonalRate: p.rate } : {}),
          ...(p.count != null ? { medicalPersonalCount: p.count } : {}),
        }),
    },
    {
      line: medicalLines[1],
      base: (v: number) => onInsuranceChange({ maternityBase: v }),
      employer: (p: { rate?: number; count?: number }) =>
        onInsuranceChange({
          ...(p.rate != null ? { maternityEmployerRate: p.rate } : {}),
          ...(p.count != null ? { maternityEmployerCount: p.count } : {}),
        }),
      personal: () => undefined,
    },
  ];

  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead colSpan={2}>险种</TableHead>
          <TableHead rowSpan={2}>缴费基数</TableHead>
          <TableHead colSpan={4}>单位</TableHead>
          <TableHead colSpan={4}>个人</TableHead>
          <TableHead rowSpan={2}>合计</TableHead>
          <TableHead rowSpan={2}>总计</TableHead>
        </TableRow>
        <TableRow>
          <TableHead>类别</TableHead>
          <TableHead>项目</TableHead>
          <TableHead>缴费比例</TableHead>
          <TableHead>单位缴费</TableHead>
          <TableHead>小计</TableHead>
          <TableHead>缴费人数</TableHead>
          <TableHead>缴费比例</TableHead>
          <TableHead>个人缴费</TableHead>
          <TableHead>小计</TableHead>
          <TableHead>缴费人数</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {socialPatches.map((row, idx) =>
          renderInsuranceRow(
            row.line,
            idx,
            socialLines,
            groupTotals.social,
            groupSubtotals.social,
            row.base,
            row.employer,
            row.personal,
          ),
        )}
        {medicalPatches.map((row, idx) =>
          renderInsuranceRow(
            row.line,
            idx,
            medicalLines,
            groupTotals.medical,
            groupSubtotals.medical,
            row.base,
            row.employer,
            row.personal,
          ),
        )}
        <TableRow key="housing">
          <TableCell>公积金</TableCell>
          <TableCell>{housingLine.label}</TableCell>
          <TableCell>
            <NumInput
              value={housingLine.base}
              onChange={(base) => onHousingChange({ base })}
            />
          </TableCell>
          <TableCell>
            <RatePercentInput
              value={housingLine.employerRate}
              onChange={(employerRate) => onHousingChange({ employerRate })}
            />
          </TableCell>
          <TableCell>{housingLine.employerPayment}</TableCell>
          <TableCell>{groupSubtotals.housing.employer}</TableCell>
          <TableCell>
            <NumInput
              value={housingLine.employerCount}
              onChange={(employerCount) => onHousingChange({ employerCount })}
            />
          </TableCell>
          <TableCell>
            <RatePercentInput
              value={housingLine.personalRate!}
              onChange={(personalRate) => onHousingChange({ personalRate })}
            />
          </TableCell>
          <TableCell>{housingLine.personalPayment!}</TableCell>
          <TableCell>{groupSubtotals.housing.personal}</TableCell>
          <TableCell>
            <NumInput
              value={housingLine.personalCount!}
              onChange={(personalCount) => onHousingChange({ personalCount })}
            />
          </TableCell>
          <TableCell>{housingLine.rowTotal}</TableCell>
          <TableCell>{groupTotals.housing}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
