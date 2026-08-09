import { cn } from "@/lib/utils";
import { groupPalmerLabels } from "@/lib/tooth-fdi";

type ToothPalmerMarkProps = {
  fdis: number[];
  className?: string;
  /** 更紧凑，用于表格单元格 */
  compact?: boolean;
};

/** 图1：十字象限 Palmer 标记；四格等高，整体垂直对称 */
export function ToothPalmerMark({ fdis, className, compact }: ToothPalmerMarkProps) {
  const g = groupPalmerLabels(fdis);
  const text = compact ? "text-[10px] leading-none" : "text-xs leading-none";
  const cell = compact ? "h-4 min-w-4 px-1" : "h-5 min-w-5 px-1.5";

  return (
    <span
      className={cn(
        "inline-grid shrink-0 grid-cols-2 grid-rows-2 font-medium text-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-end justify-end border-r border-b border-sky-300 pb-0.5 whitespace-nowrap",
          text,
          cell,
        )}
      >
        {g.UR || "\u00a0"}
      </span>
      <span
        className={cn(
          "flex items-end justify-start border-b border-sky-300 pb-0.5 whitespace-nowrap",
          text,
          cell,
        )}
      >
        {g.UL || "\u00a0"}
      </span>
      <span
        className={cn(
          "flex items-start justify-end border-r border-sky-300 pt-0.5 whitespace-nowrap",
          text,
          cell,
        )}
      >
        {g.LR || "\u00a0"}
      </span>
      <span
        className={cn(
          "flex items-start justify-start pt-0.5 whitespace-nowrap",
          text,
          cell,
        )}
      >
        {g.LL || "\u00a0"}
      </span>
    </span>
  );
}
