import * as React from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { ToothPositionField } from "@/components/tooth-chart/tooth-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import type { FeeCategory, FeeItem } from "@/lib/fee-catalog/types";
import {
  type PlanItem,
  type PlanLine,
  planGroupLabel,
} from "@/lib/medical-records/record-types";
import { parseTeethStrict } from "@/lib/tooth-fdi";

import { FeeCatalogPanel } from "./fee-catalog-panel";
import { PlanLineQuoteInputs } from "./plan-quote";

function emptyGroup(): PlanItem {
  return { teeth: "", text: "", lines: [] };
}

function withLabel(group: PlanItem): PlanItem {
  return { ...group, text: planGroupLabel(group.lines) };
}

export function PlanGroupsField({
  value,
  onValueChange,
  renderGroupExtra,
}: {
  value: PlanItem[];
  onValueChange: (next: PlanItem[]) => void;
  /** 初诊「本次处理 / 本行已完成」等，按组 index */
  renderGroupExtra?: (
    group: PlanItem,
    index: number,
    update: (patch: Partial<PlanItem>) => void,
  ) => React.ReactNode;
}) {
  const [categories, setCategories] = React.useState<FeeCategory[]>([]);
  const groups = value.length ? value : [emptyGroup()];

  React.useEffect(() => {
    api<FeeCategory[]>("GET", "/fee-catalog")
      .then(setCategories)
      .catch((e: unknown) => toast.error(errorMessage(e)));
  }, []);

  function setGroups(next: PlanItem[]) {
    onValueChange(next.map(withLabel));
  }

  function updateGroup(index: number, patch: Partial<PlanItem>) {
    setGroups(
      groups.map((g, i) => {
        if (i !== index) return g;
        const next = { ...g, ...patch };
        if (patch.teeth != null) {
          const allowed = new Set(parseTeethStrict(patch.teeth) ?? []);
          next.lines = next.lines.map((line) => {
            const parts = (parseTeethStrict(line.teeth) ?? []).filter((n) =>
              allowed.has(n),
            );
            return {
              ...line,
              teeth: parts.length
                ? parts
                    .slice()
                    .sort((a, b) => a - b)
                    .join(",")
                : "",
            };
          });
        }
        return next;
      }),
    );
  }

  function updateLine(
    groupIndex: number,
    lineIndex: number,
    patch: Partial<PlanLine>,
  ) {
    setGroups(
      groups.map((g, i) =>
        i !== groupIndex
          ? g
          : {
              ...g,
              lines: g.lines.map((line, j) =>
                j === lineIndex ? { ...line, ...patch } : line,
              ),
            },
      ),
    );
  }

  function addFeeToGroup(groupIndex: number, fee: FeeItem) {
    setGroups(
      groups.map((g, i) =>
        i !== groupIndex
          ? g
          : {
              ...g,
              lines: [
                ...g.lines,
                {
                  feeItemId: fee.id,
                  name: fee.name,
                  teeth: "",
                  unitPrice: fee.price,
                  quantity: null,
                  discountNote: "",
                },
              ],
            },
      ),
    );
  }

  function removeLine(groupIndex: number, lineIndex: number) {
    setGroups(
      groups.map((g, i) =>
        i !== groupIndex
          ? g
          : { ...g, lines: g.lines.filter((_, j) => j !== lineIndex) },
      ),
    );
  }

  function removeGroup(index: number) {
    if (groups.length <= 1) {
      setGroups([emptyGroup()]);
      return;
    }
    setGroups(groups.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group, groupIndex) => {
        const allowedFdis = parseTeethStrict(group.teeth) ?? [];
        return (
          <div
            key={group.id ?? `new-${groupIndex}`}
            className="flex flex-col gap-3 rounded-lg border p-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-40 shrink-0">
                <ToothPositionField
                  large
                  value={group.teeth}
                  onValueChange={(teeth) => updateGroup(groupIndex, { teeth })}
                />
              </div>
              <div className="min-w-0 flex-1">
                {renderGroupExtra?.(group, groupIndex, (patch) =>
                  updateGroup(groupIndex, patch),
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => removeGroup(groupIndex)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="grid gap-3 lg:grid-cols-[16rem_1fr]">
              <div className="h-56 overflow-hidden rounded-md border">
                <FeeCatalogPanel
                  embedded
                  categories={categories}
                  onPick={(fee) => addFeeToGroup(groupIndex, fee)}
                />
              </div>
              <div className="min-w-0 overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">牙位</TableHead>
                      <TableHead>项目</TableHead>
                      <TableHead>报价</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.lines.length ? (
                      group.lines.map((line, lineIndex) => (
                        <TableRow key={line.id ?? `line-${lineIndex}`}>
                          <TableCell className="align-top">
                            <ToothPositionField
                              plain
                              value={line.teeth}
                              allowedFdis={
                                allowedFdis.length ? allowedFdis : undefined
                              }
                              onValueChange={(teeth) =>
                                updateLine(groupIndex, lineIndex, { teeth })
                              }
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <Input
                              value={line.name}
                              readOnly
                              className="border-0 bg-transparent px-0 shadow-none"
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <PlanLineQuoteInputs
                              line={line}
                              groupTeeth={group.teeth}
                              onChange={(patch) =>
                                updateLine(groupIndex, lineIndex, patch)
                              }
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLine(groupIndex, lineIndex)}
                            >
                              <X className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-muted-foreground"
                        >
                          从左侧选择收费项目；单价可先不填
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => setGroups([...groups, emptyGroup()])}
      >
        <Plus className="size-3.5" />
        添加牙位组
      </Button>
    </div>
  );
}
