import * as React from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { computeSalarySheet } from "@/lib/salary/calc";
import { sumMaterialLines } from "@/lib/salary/defaults";
import {
  formatScheduleLeaveDays,
  scheduleLeaveSourceMonthLabel,
} from "@/lib/salary/schedule-leave";
import type {
  SalaryMaterialLine,
  SalaryOtherCostItem,
  SalarySheetData,
} from "@/lib/salary/types";

import { NumInput, SummaryDecimalInput } from "./salary-table-inputs";

type SalarySheetComputed = ReturnType<typeof computeSalarySheet>;

type CostLinePreview = {
  id: string;
  name: string;
  amount: number;
};

type CostPreviewKey = "materials" | "other" | "grandTotal";

function newMaterialLine(): SalaryMaterialLine {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `mat-${Date.now()}`,
    name: "",
    amount: 0,
  };
}

function CostAmountPopover({
  previewKey,
  openKey,
  onOpenKeyChange,
  total,
  lines,
}: {
  previewKey: CostPreviewKey;
  openKey: CostPreviewKey | null;
  onOpenKeyChange: (key: CostPreviewKey | null) => void;
  total: number;
  lines: CostLinePreview[];
}) {
  return (
    <Popover
      open={openKey === previewKey}
      onOpenChange={(open) => onOpenKeyChange(open ? previewKey : null)}
    >
      <PopoverTrigger render={<Button variant="link" />}>{total}</PopoverTrigger>
      <PopoverContent>
        {lines.length === 0 ? (
          <div>暂无明细</div>
        ) : (
          <div className="flex flex-col gap-2">
            {lines.map((line) => (
              <div key={line.id} className="flex justify-between gap-4">
                <span>{line.name || "（未命名）"}</span>
                <span>{line.amount}</span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function SalarySummaryTable({
  sheet,
  computed,
  month,
  patchSheet,
  otherCostItems,
}: {
  sheet: SalarySheetData;
  computed: SalarySheetComputed;
  month: string;
  patchSheet: (month: string, patch: SalarySheetData) => void;
  otherCostItems: SalaryOtherCostItem[];
}) {
  const [materialsOpen, setMaterialsOpen] = React.useState(false);
  const [draftLines, setDraftLines] = React.useState<SalaryMaterialLine[]>([]);
  const [openPreview, setOpenPreview] = React.useState<CostPreviewKey | null>(null);

  function openMaterials() {
    setDraftLines(sheet.materialLines.map((line) => ({ ...line })));
    setMaterialsOpen(true);
  }

  function commitMaterials() {
    const materialLines = draftLines
      .map((line) => ({
        ...line,
        name: line.name.trim(),
        amount: Math.max(0, line.amount),
      }))
      .filter((line) => line.name.length > 0);
    const materials = sumMaterialLines(materialLines);
    patchSheet(month, {
      ...sheet,
      materialLines,
      costItems: { ...sheet.costItems, materials },
    });
    setMaterialsOpen(false);
  }

  const costGrandTotalLines: CostLinePreview[] = [
    { id: "utilities", name: "水电", amount: sheet.costItems.utilities },
    { id: "rent", name: "租金", amount: sheet.costItems.rent },
    { id: "materials", name: "材料", amount: sheet.costItems.materials },
    { id: "planting", name: "种植", amount: sheet.costItems.planting },
    { id: "processing", name: "加工", amount: sheet.costItems.processing },
    { id: "other", name: "其他", amount: computed.otherCost },
    { id: "equipment", name: "设备", amount: computed.equipmentCost },
    { id: "insurance", name: "五险一金", amount: computed.insuranceEmployerTotal },
    { id: "employee", name: "员工", amount: computed.employeePayrollTotal },
  ];

  return (
    <>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead>总收入</TableHead>
            <TableHead>实收入</TableHead>
            <TableHead>纯利润</TableHead>
            <TableHead>利润率</TableHead>
            <TableHead>陈美珍（天）</TableHead>
            <TableHead>卢彤（天）</TableHead>
            <TableHead>许桦婧（天）</TableHead>
            <TableHead>计薪工作日</TableHead>
            <TableHead>水电</TableHead>
            <TableHead>租金</TableHead>
            <TableHead>
              <Button type="button" variant="link" onClick={openMaterials}>
                材料
              </Button>
            </TableHead>
            <TableHead>种植</TableHead>
            <TableHead>加工</TableHead>
            <TableHead>其他</TableHead>
            <TableHead>设备</TableHead>
            <TableHead>五险一金</TableHead>
            <TableHead>员工</TableHead>
            <TableHead>成本总计</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <SummaryDecimalInput
                value={sheet.summary.totalIncome}
                onCommit={(totalIncome) =>
                  patchSheet(month, {
                    ...sheet,
                    summary: { ...sheet.summary, totalIncome },
                  })
                }
              />
            </TableCell>
            <TableCell>{computed.netIncome}</TableCell>
            <TableCell>{computed.remaining}</TableCell>
            <TableCell>{(computed.profitRate * 100).toFixed(2)}%</TableCell>
            <TableCell className="text-muted-foreground">
              <Tooltip>
                <TooltipTrigger render={<span />}>
                  {formatScheduleLeaveDays(sheet.leaveQuotas.chen)}
                </TooltipTrigger>
                <TooltipContent>
                  {`排班表 ${scheduleLeaveSourceMonthLabel(month)} 请假天数`}
                </TooltipContent>
              </Tooltip>
            </TableCell>
            <TableCell className="text-muted-foreground">
              <Tooltip>
                <TooltipTrigger render={<span />}>
                  {formatScheduleLeaveDays(sheet.leaveQuotas.lu)}
                </TooltipTrigger>
                <TooltipContent>
                  {`排班表 ${scheduleLeaveSourceMonthLabel(month)} 请假天数`}
                </TooltipContent>
              </Tooltip>
            </TableCell>
            <TableCell className="text-muted-foreground">
              <Tooltip>
                <TooltipTrigger render={<span />}>
                  {formatScheduleLeaveDays(sheet.leaveQuotas.xu)}
                </TooltipTrigger>
                <TooltipContent>
                  {`排班表 ${scheduleLeaveSourceMonthLabel(month)} 请假天数`}
                </TooltipContent>
              </Tooltip>
            </TableCell>
            <TableCell>
              <Input
                value={sheet.summary.workingDays}
                onChange={(e) =>
                  patchSheet(month, {
                    ...sheet,
                    summary: {
                      ...sheet.summary,
                      workingDays: Number(e.target.value),
                    },
                  })
                }
              />
            </TableCell>
            <TableCell>
              <SummaryDecimalInput
                value={sheet.costItems.utilities}
                onCommit={(utilities) =>
                  patchSheet(month, {
                    ...sheet,
                    costItems: { ...sheet.costItems, utilities },
                  })
                }
              />
            </TableCell>
            <TableCell>
              <SummaryDecimalInput
                value={sheet.costItems.rent}
                onCommit={(rent) =>
                  patchSheet(month, {
                    ...sheet,
                    costItems: { ...sheet.costItems, rent },
                  })
                }
              />
            </TableCell>
            <TableCell>
              <CostAmountPopover
                previewKey="materials"
                openKey={openPreview}
                onOpenKeyChange={setOpenPreview}
                total={sheet.costItems.materials}
                lines={sheet.materialLines}
              />
            </TableCell>
            <TableCell>
              <SummaryDecimalInput
                value={sheet.costItems.planting}
                onCommit={(planting) =>
                  patchSheet(month, {
                    ...sheet,
                    costItems: { ...sheet.costItems, planting },
                  })
                }
              />
            </TableCell>
            <TableCell>
              <SummaryDecimalInput
                value={sheet.costItems.processing}
                onCommit={(processing) =>
                  patchSheet(month, {
                    ...sheet,
                    costItems: { ...sheet.costItems, processing },
                  })
                }
              />
            </TableCell>
            <TableCell>
              <CostAmountPopover
                previewKey="other"
                openKey={openPreview}
                onOpenKeyChange={setOpenPreview}
                total={computed.otherCost}
                lines={otherCostItems}
              />
            </TableCell>
            <TableCell>
              <Tooltip>
                <TooltipTrigger render={<span />}>
                  {computed.equipmentCost}
                </TooltipTrigger>
                <TooltipContent>由设置中的设备分期计划按月自动计算</TooltipContent>
              </Tooltip>
            </TableCell>
            <TableCell>{computed.insuranceEmployerTotal}</TableCell>
            <TableCell>{computed.employeePayrollTotal}</TableCell>
            <TableCell>
              <CostAmountPopover
                previewKey="grandTotal"
                openKey={openPreview}
                onOpenKeyChange={setOpenPreview}
                total={computed.costGrandTotal}
                lines={costGrandTotalLines}
              />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Dialog open={materialsOpen} onOpenChange={setMaterialsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>材料明细（{month}）</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>金额</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {draftLines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <Input
                      value={line.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setDraftLines((prev) =>
                          prev.map((row) =>
                            row.id === line.id ? { ...row, name } : row,
                          ),
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <NumInput
                      value={line.amount}
                      onChange={(amount) =>
                        setDraftLines((prev) =>
                          prev.map((row) =>
                            row.id === line.id
                              ? { ...row, amount: Math.max(0, amount) }
                              : row,
                          ),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setDraftLines((prev) => prev.filter((row) => row.id !== line.id))
                      }
                    >
                      <X />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDraftLines((prev) => [...prev, newMaterialLine()])}
                  >
                    <Plus data-icon="inline-start" />
                    添加材料
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setMaterialsOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={commitMaterials}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
