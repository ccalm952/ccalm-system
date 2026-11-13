import type * as React from "react";
import { Plus, X } from "lucide-react";
import { cn } from "cn";

import { ToothPositionField } from "@/components/tooth-chart/ToothPositionField";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ToothEntry } from "@/lib/medical-records/record-types";

export function ToothEntriesField<T extends ToothEntry>({
  value,
  onValueChange,
  renderDetail,
}: {
  value: T[];
  onValueChange: (v: T[]) => void;
  /** 文本框下方的附加输入 */
  renderDetail?: (
    entry: T,
    update: (patch: Partial<T>) => void,
  ) => React.ReactNode;
}) {
  const entries = value.length ? value : [{ teeth: "", text: "" } as T];

  function update(index: number, patch: Partial<T>) {
    onValueChange(
      entries.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry, index) => (
        <div key={index} className="flex items-stretch gap-2">
          <ToothPositionField
            large
            className="w-40 shrink-0"
            value={entry.teeth}
            onValueChange={(teeth) => update(index, { teeth } as Partial<T>)}
          />
          <div className="flex flex-1 flex-col gap-2">
            <Textarea
              value={entry.text}
              onChange={(e) =>
                update(index, { text: e.target.value } as Partial<T>)
              }
            />
            {renderDetail?.(entry, (patch) => update(index, patch))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="self-center"
            disabled={entries.length === 1}
            onClick={() => onValueChange(entries.filter((_, i) => i !== index))}
          >
            <X />
          </Button>
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onValueChange([...entries, { teeth: "", text: "" } as T])
          }
        >
          <Plus className="size-3.5" />
          添加牙位
        </Button>
      </div>
    </div>
  );
}

export function ToothEntriesView({
  entries,
  renderExtra,
  renderBelow,
  renderDetail,
  rowClick,
}: {
  entries: ToothEntry[];
  renderExtra?: (index: number) => React.ReactNode;
  /** 文本下方的附加内容 */
  renderDetail?: (index: number) => React.ReactNode;
  renderBelow?: (index: number) => React.ReactNode;
  /** 返回该行的点击处理；返回 null 表示该行不可点 */
  rowClick?: (index: number) => (() => void) | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry, index) => {
        const onClick = rowClick?.(index) ?? undefined;
        return (
          <div key={index} className="flex flex-col gap-3">
            <div
              className={cn(
                "flex items-center gap-6",
                onClick &&
                  "-mx-2 -my-1 cursor-pointer rounded-2xl px-2 py-1 transition-all hover:bg-muted dark:hover:bg-muted/50",
              )}
              onClick={onClick}
            >
              <div className="flex w-40 shrink-0 justify-center">
                {entry.teeth ? (
                  <ToothPositionField
                    large
                    readOnly
                    value={entry.teeth}
                    onValueChange={() => {}}
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <span className="whitespace-pre-wrap">{entry.text}</span>
                {renderDetail?.(index)}
              </div>
              {renderExtra?.(index)}
            </div>
            {renderBelow?.(index)}
          </div>
        );
      })}
    </div>
  );
}
