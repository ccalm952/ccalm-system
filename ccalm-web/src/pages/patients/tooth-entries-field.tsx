import type * as React from "react";
import { Plus, X } from "lucide-react";

import { ToothPositionField } from "@/components/tooth-chart/tooth-chart";
import { Button } from "@/components/ui/button";
import type { ToothEntry } from "@/lib/medical-records/record-types";
import { PhraseTextarea } from "./phrase-textarea";

export function ToothEntriesField<T extends ToothEntry>({
  value,
  onValueChange,
  renderDetail,
  phraseField,
}: {
  value: T[];
  onValueChange: (v: T[]) => void;
  /** 这个字段的词条；不传就是普通文本框 */
  phraseField?: string;
  /** 文本框下方的附加输入 */
  renderDetail?: (
    entry: T,
    update: (patch: Partial<T>) => void,
    index: number,
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
            <PhraseTextarea
              field={phraseField}
              closeOnInsert
              value={entry.text}
              onChange={(text) => update(index, { text } as Partial<T>)}
            />
            {renderDetail?.(entry, (patch) => update(index, patch), index)}
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
  hideText,
}: {
  entries: ToothEntry[];
  renderExtra?: (index: number) => React.ReactNode;
  renderDetail?: (index: number) => React.ReactNode;
  renderBelow?: (index: number) => React.ReactNode;
  /** 治疗计划组已用明细报价展示时，隐藏组级项目名拼接 */
  hideText?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry, index) => (
        <div key={index} className="flex flex-col gap-3">
          <div className="flex min-h-10 items-start gap-6 px-4 py-1">
            <div className="flex w-40 shrink-0 items-center justify-center self-center">
              {entry.teeth ? (
                <ToothPositionField
                  large
                  readOnly
                  value={entry.teeth}
                  onValueChange={() => {}}
                />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {hideText ? null : (
                <span className="whitespace-pre-wrap">{entry.text}</span>
              )}
              {renderDetail?.(index)}
            </div>
            {renderExtra ? (
              <div className="shrink-0 self-center">{renderExtra(index)}</div>
            ) : null}
          </div>
          {renderBelow?.(index)}
        </div>
      ))}
    </div>
  );
}
