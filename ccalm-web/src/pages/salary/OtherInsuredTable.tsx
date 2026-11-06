import { Plus, X } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createEmptyOtherInsured } from "@/lib/salary/defaults";
import type { SalaryOtherInsured } from "@/lib/salary/types";

import { SalaryOutlineIconButton } from "./salary-table-inputs";

export function OtherInsuredTable({
  rows,
  onChange,
}: {
  rows: SalaryOtherInsured[];
  onChange: (rows: SalaryOtherInsured[]) => void;
}) {
  function update(index: number, patch: Partial<SalaryOtherInsured>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">其他参保人员</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>姓名</TableHead>
            <TableHead>备注</TableHead>
            <TableHead>交社保</TableHead>
            <TableHead>交医保</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.id}>
              <TableCell>
                <Input
                  value={row.name}
                  placeholder="姓名"
                  onChange={(e) => update(index, { name: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.note}
                  placeholder="备注"
                  onChange={(e) => update(index, { note: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Checkbox
                  className="mx-auto"
                  checked={row.paySocial}
                  onCheckedChange={(checked) =>
                    update(index, { paySocial: checked })
                  }
                />
              </TableCell>
              <TableCell>
                <Checkbox
                  className="mx-auto"
                  checked={row.payMedical}
                  onCheckedChange={(checked) =>
                    update(index, { payMedical: checked })
                  }
                />
              </TableCell>
              <TableCell>
                <SalaryOutlineIconButton
                  onClick={() => onChange(rows.filter((_, i) => i !== index))}
                >
                  <X className="size-3.5" />
                </SalaryOutlineIconButton>
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell />
            <TableCell />
            <TableCell />
            <TableCell />
            <TableCell>
              <SalaryOutlineIconButton
                onClick={() => onChange([...rows, createEmptyOtherInsured()])}
              >
                <Plus className="size-3.5" />
              </SalaryOutlineIconButton>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
