import * as React from "react";

import { ToothChartPanel } from "@/components/tooth-chart/ToothChartPanel";
import { ToothPalmerMark } from "@/components/tooth-chart/ToothPalmerMark";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatTeeth, parseTeethStrict } from "@/lib/tooth-fdi";
import { cn } from "cn";

type ToothPositionFieldProps = {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  /** 表格内更紧凑，不可点时可只展示 */
  compact?: boolean;
  large?: boolean;
  readOnly?: boolean;
  /** 无底色，未选牙位时显示空十字作为触发器 */
  plain?: boolean;
};

/**
 * 图1 触发器：可解析 FDI 时显示十字象限；否则显示原文。
 * 点击在下方展开选牙面板，点选即时生效（无可编辑文本框）。
 */
export function ToothPositionField({
  value,
  onValueChange,
  className,
  compact,
  large,
  readOnly,
  plain,
}: ToothPositionFieldProps) {
  const parsed = React.useMemo(() => parseTeethStrict(value), [value]);
  const fdis = parsed ?? [];
  const freeText = parsed == null && value.trim() !== "";

  const textClass = compact
    ? "text-xs"
    : large
      ? "text-sm"
      : "text-base md:text-sm";

  const body = freeText ? (
    <span className={cn("truncate", textClass)}>{value}</span>
  ) : fdis.length || plain ? (
    <ToothPalmerMark
      fdis={fdis}
      compact={compact}
      large={large}
      minColPx={plain ? 32 : 0}
    />
  ) : (
    <span className={cn("text-muted-foreground", textClass)}>
      {compact ? "—" : "选择牙位"}
    </span>
  );

  if (readOnly) {
    return (
      <span className={cn("inline-flex min-w-0 items-center", className)}>
        {body}
      </span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              compact || plain
                ? "h-auto min-h-8 border-0 bg-transparent px-0 py-1.5 shadow-none hover:bg-transparent aria-expanded:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
                : "h-10 items-center border-transparent bg-input/50 px-2.5 py-0 text-base leading-none font-normal hover:bg-input/50 aria-expanded:bg-input/50 md:text-sm dark:bg-input/50 dark:hover:bg-input/50",
              large ? "h-auto min-h-16 justify-center" : "justify-start",
              "w-full overflow-hidden",
              className,
            )}
          />
        }
      >
        {body}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        // plain 用于表格单元格，-8 抵消 TableCell 的 px-2
        alignOffset={plain ? -8 : 0}
        className="w-auto"
      >
        <ToothChartPanel
          value={fdis}
          onValueChange={(next) => onValueChange(formatTeeth(next))}
        />
      </PopoverContent>
    </Popover>
  );
}
