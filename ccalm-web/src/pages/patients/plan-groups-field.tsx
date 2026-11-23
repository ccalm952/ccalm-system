import * as React from "react";
import { Plus, X } from "lucide-react";

import { ToothPositionField } from "@/components/tooth-chart/tooth-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "cn";
import type { FeeItem } from "@/lib/fee-catalog/types";
import {
  type PlanItem,
  type PlanLine,
  planGroupLabel,
} from "@/lib/medical-records/record-types";
import { parseTeethStrict } from "@/lib/tooth-fdi";

import { PlanLineQuoteInputs } from "./plan-quote";

function emptyGroup(): PlanItem {
  return { teeth: "", text: "", lines: [] };
}

function withLabel(group: PlanItem): PlanItem {
  return { ...group, text: planGroupLabel(group.lines) };
}

export type PlanGroupsFieldHandle = {
  addFee: (fee: FeeItem) => void;
};

export const PlanGroupsField = React.forwardRef<
  PlanGroupsFieldHandle,
  {
    value: PlanItem[];
    onValueChange: (next: PlanItem[]) => void;
    /** 初诊「本次处理 / 本行已完成」等，按组 index */
    renderGroupExtra?: (
      group: PlanItem,
      index: number,
      update: (patch: Partial<PlanItem>) => void,
    ) => React.ReactNode;
  }
>(function PlanGroupsField({ value, onValueChange, renderGroupExtra }, ref) {
  const [activeGroupIndex, setActiveGroupIndex] = React.useState(0);
  const groups = value.length ? value : [emptyGroup()];
  const activeIndex = Math.min(activeGroupIndex, groups.length - 1);

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

  function addFeeToActive(fee: FeeItem) {
    const groupIndex = activeIndex;
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
                  discountPercent: null,
                },
              ],
            },
      ),
    );
  }

  React.useImperativeHandle(
    ref,
    () => ({
      addFee: addFeeToActive,
    }),
    // activeIndex / groups 需随最新状态进闭包
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIndex, groups],
  );

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
      setActiveGroupIndex(0);
      return;
    }
    setGroups(groups.filter((_, i) => i !== index));
    setActiveGroupIndex((prev) => {
      if (prev === index) return Math.max(0, index - 1);
      if (prev > index) return prev - 1;
      return prev;
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {groups.map((group, groupIndex) => {
        const allowedFdis = parseTeethStrict(group.teeth) ?? [];
        const selected = groupIndex === activeIndex;
        return (
          <div
            key={group.id ?? `new-${groupIndex}`}
            onClick={() => setActiveGroupIndex(groupIndex)}
            className="flex items-stretch gap-2"
          >
            <div className="w-40 shrink-0 self-stretch">
              <ToothPositionField
                large
                className="h-full min-h-10 w-full"
                value={group.teeth}
                onValueChange={(teeth) => updateGroup(groupIndex, { teeth })}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div
                className={cn(
                  "min-w-0 overflow-x-auto rounded-2xl border",
                  selected
                    ? "border-primary ring-1 ring-primary/30"
                    : "hover:border-muted-foreground/40",
                )}
              >
                <Table>
                  <TableBody>
                    {group.lines.length ? (
                      group.lines.map((line, lineIndex) => (
                        <TableRow
                          key={line.id ?? `line-${lineIndex}`}
                          className="h-10 border-b-0"
                        >
                          <TableCell className="h-10 max-h-10 w-40 overflow-hidden py-0 align-middle">
                            <ToothPositionField
                              plain
                              className="h-10 min-h-10 w-full justify-center py-0"
                              value={line.teeth}
                              allowedFdis={
                                allowedFdis.length ? allowedFdis : undefined
                              }
                              onValueChange={(teeth) =>
                                updateLine(groupIndex, lineIndex, { teeth })
                              }
                            />
                          </TableCell>
                          <TableCell className="h-10 max-h-10 overflow-hidden py-0 align-middle">
                            <Input
                              value={line.name}
                              readOnly
                              className="h-8 border-0 bg-transparent px-0 shadow-none"
                            />
                          </TableCell>
                          <TableCell className="h-10 max-h-10 overflow-hidden py-0 align-middle">
                            <PlanLineQuoteInputs
                              line={line}
                              groupTeeth={group.teeth}
                              onChange={(patch) =>
                                updateLine(groupIndex, lineIndex, patch)
                              }
                            />
                          </TableCell>
                          <TableCell className="h-10 max-h-10 overflow-hidden py-0 align-middle">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeLine(groupIndex, lineIndex);
                              }}
                            >
                              <X className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow className="h-10 border-b-0">
                        <TableCell
                          colSpan={4}
                          className="h-10 py-0 text-muted-foreground"
                        >
                          {selected
                            ? "从左侧选择收费项目；单价可先不填"
                            : "点选本组后，从左侧添加收费项目"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {renderGroupExtra?.(group, groupIndex, (patch) =>
                updateGroup(groupIndex, patch),
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 self-center"
              onClick={(e) => {
                e.stopPropagation();
                removeGroup(groupIndex);
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        );
      })}
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setGroups([...groups, emptyGroup()]);
            setActiveGroupIndex(groups.length);
          }}
        >
          <Plus className="size-3.5" />
          添加牙位组
        </Button>
      </div>
    </div>
  );
});
