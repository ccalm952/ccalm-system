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

  const body = freeText ? (
    <span className={cn("truncate text-sm", compact && "text-xs")}>{value}</span>
  ) : fdis.length ? (
    <ToothPalmerMark fdis={fdis} compact={compact} />
  ) : (
    <span className="text-sm text-muted-foreground">{compact ? "—" : "选择牙位"}</span>
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
          "h-auto min-h-9 w-full justify-start overflow-visible px-2 py-1.5 font-normal",
          "[&>span]:inline-flex [&>span]:items-center",
          compact && "min-h-8 border-0 bg-transparent px-0 shadow-none hover:bg-transparent",
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
