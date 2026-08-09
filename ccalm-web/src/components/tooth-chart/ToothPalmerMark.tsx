import { cn } from "@/lib/utils";
import { groupPalmerLabels } from "@/lib/tooth-fdi";

type ToothPalmerMarkProps = {
  fdis: number[];
  className?: string;
  /** 更紧凑，用于表格单元格 */
  compact?: boolean;
};

/** 图1：十字象限 Palmer 标记；1px 轨道画十字，四向 padding 对称 */
export function ToothPalmerMark({ fdis, className, compact }: ToothPalmerMarkProps) {
  const g = groupPalmerLabels(fdis);
  const text = compact ? "text-[10px] leading-none" : "text-xs leading-none";
  const cell = compact ? "p-0.5" : "p-1";
  const line = "bg-sky-300";

  return (
    <span
      className={cn(
        "inline-grid shrink-0 grid-cols-[auto_1px_auto] grid-rows-[auto_1px_auto] font-medium text-foreground",
        text,
        className,
      )}
    >
      <span className={cn("flex items-end justify-end whitespace-nowrap", cell)}>
        {g.UR || "\u00a0"}
      </span>
      <span className={line} />
      <span className={cn("flex items-end justify-start whitespace-nowrap", cell)}>
        {g.UL || "\u00a0"}
      </span>

      <span className={line} />
      <span className={line} />
      <span className={line} />

      <span className={cn("flex items-start justify-end whitespace-nowrap", cell)}>
        {g.LR || "\u00a0"}
      </span>
      <span className={line} />
      <span className={cn("flex items-start justify-start whitespace-nowrap", cell)}>
        {g.LL || "\u00a0"}
      </span>
    </span>
  );
}
