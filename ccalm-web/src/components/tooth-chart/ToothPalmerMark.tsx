import { cn } from "@/lib/utils";
import { groupPalmerLabels } from "@/lib/tooth-fdi";

type ToothPalmerMarkProps = {
  fdis: number[];
  className?: string;
  /** 更紧凑，用于表格单元格 */
  compact?: boolean;
};

/** 图1：十字象限 Palmer 标记（不截断，随牙位数量变宽） */
export function ToothPalmerMark({ fdis, className, compact }: ToothPalmerMarkProps) {
  const g = groupPalmerLabels(fdis);
  const text = compact ? "text-[10px] leading-tight" : "text-xs leading-tight";
  const pad = compact ? "px-1 py-0.5" : "px-1.5 py-0.5";
  const min = compact ? "min-h-3.5 min-w-4" : "min-h-4 min-w-5";

  return (
    <span
      className={cn(
        "inline-grid shrink-0 grid-cols-2 grid-rows-2 font-medium text-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "border-r border-b border-sky-300 text-right whitespace-nowrap",
          text,
          pad,
          min,
        )}
      >
        {g.UR || "\u00a0"}
      </span>
      <span
        className={cn(
          "border-b border-sky-300 text-left whitespace-nowrap",
          text,
          pad,
          min,
        )}
      >
        {g.UL || "\u00a0"}
      </span>
      <span
        className={cn(
          "border-r border-sky-300 text-right whitespace-nowrap",
          text,
          pad,
          min,
        )}
      >
        {g.LR || "\u00a0"}
      </span>
      <span className={cn("text-left whitespace-nowrap", text, pad, min)}>
        {g.LL || "\u00a0"}
      </span>
    </span>
  );
}
