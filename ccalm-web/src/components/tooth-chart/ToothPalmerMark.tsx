import { cn } from "@/lib/utils";
import { groupPalmerLabels } from "@/lib/tooth-fdi";

type ToothPalmerMarkProps = {
  fdis: number[];
  className?: string;
  /** 更紧凑，用于表格单元格 */
  compact?: boolean;
};

/**
 * 图1：十字象限 Palmer 标记。
 * 用 gap-px + 底色画十字，避免 cell border 只在右/下导致左右上下视觉不对称。
 */
export function ToothPalmerMark({ fdis, className, compact }: ToothPalmerMarkProps) {
  const g = groupPalmerLabels(fdis);
  const text = compact ? "text-[10px] leading-none" : "text-xs leading-none";
  const cell = compact ? "p-0.5" : "p-1";

  return (
    <span
      className={cn(
        "inline-grid shrink-0 grid-cols-2 grid-rows-2 gap-px bg-sky-300 font-medium text-foreground",
        text,
        className,
      )}
    >
      <span
        className={cn(
          "flex items-end justify-end whitespace-nowrap bg-background",
          cell,
        )}
      >
        {g.UR || "\u00a0"}
      </span>
      <span
        className={cn(
          "flex items-end justify-start whitespace-nowrap bg-background",
          cell,
        )}
      >
        {g.UL || "\u00a0"}
      </span>
      <span
        className={cn(
          "flex items-start justify-end whitespace-nowrap bg-background",
          cell,
        )}
      >
        {g.LR || "\u00a0"}
      </span>
      <span
        className={cn(
          "flex items-start justify-start whitespace-nowrap bg-background",
          cell,
        )}
      >
        {g.LL || "\u00a0"}
      </span>
    </span>
  );
}
