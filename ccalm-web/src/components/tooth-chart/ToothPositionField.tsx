import * as React from "react";

import { ToothChartDialog } from "@/components/tooth-chart/ToothChartDialog";
import { ToothPalmerMark } from "@/components/tooth-chart/ToothPalmerMark";
import { Button } from "@/components/ui/button";
import { formatTeeth, parseTeethStrict } from "@/lib/tooth-fdi";
import { cn } from "@/lib/utils";

type ToothPositionFieldProps = {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  /** 表格内更紧凑，不可点时可只展示 */
  compact?: boolean;
  readOnly?: boolean;
};

/**
 * 图1 触发器：可解析 FDI 时显示十字象限；否则显示原文。
 * 点击打开图2 选牙弹窗（无可编辑文本框）。
 */
export function ToothPositionField({
  value,
  onValueChange,
  className,
  compact,
  readOnly,
}: ToothPositionFieldProps) {
  const [open, setOpen] = React.useState(false);
  const parsed = React.useMemo(() => parseTeethStrict(value), [value]);
  const fdis = parsed ?? [];
  const freeText = parsed == null && value.trim() !== "";

  const textClass = compact ? "text-xs" : "text-base md:text-sm";

  const body = freeText ? (
    <span className={cn("truncate", textClass)}>{value}</span>
  ) : fdis.length ? (
    <ToothPalmerMark fdis={fdis} compact={compact} />
  ) : (
    <span className={cn("text-muted-foreground", textClass)}>
      {compact ? "—" : "选择牙位"}
    </span>
  );

  if (readOnly) {
    return <span className={cn("inline-flex min-w-0 items-center", className)}>{body}</span>;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn(
          compact
            ? "h-auto min-h-8 border-0 bg-transparent px-0 py-1.5 shadow-none hover:bg-transparent"
            : "h-8 border-transparent bg-input/50 px-2.5 py-0 font-normal text-base hover:bg-input/50 md:text-sm dark:bg-input/50 dark:hover:bg-input/50",
          "w-full justify-start overflow-visible",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        {body}
      </Button>
      <ToothChartDialog
        open={open}
        onOpenChange={setOpen}
        value={fdis}
        onConfirm={(next) => onValueChange(formatTeeth(next))}
      />
    </>
  );
}
