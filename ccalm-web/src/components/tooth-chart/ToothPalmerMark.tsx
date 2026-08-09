import { cn } from "@/lib/utils";
import { groupPalmerLabels } from "@/lib/tooth-fdi";

type ToothPalmerMarkProps = {
  fdis: number[];
  className?: string;
  /** 更紧凑，用于表格单元格 */
  compact?: boolean;
};

/** 图1：十字象限 Palmer 标记；左右列强制等宽，竖线居中 */
export function ToothPalmerMark({ fdis, className, compact }: ToothPalmerMarkProps) {
  const g = groupPalmerLabels(fdis);
  const text = compact ? "text-[10px] leading-none" : "text-xs leading-none";
  const cell = compact ? "p-0.5" : "p-1";
  const line = "bg-sky-300";
  const colCh = Math.max(
    Math.max(g.UR.length, g.LR.length),
    Math.max(g.UL.length, g.LL.length),
    1,
  );
  /** 左右轨道同宽 = 字符宽 + 单元格左右 padding，避免有内容一侧被撑开 */
  const padPx = compact ? 4 : 8;
  const colTrack = `calc(${colCh}ch + ${padPx}px)`;

  return (
    <span
      className={cn(
        "inline-grid shrink-0 grid-rows-[auto_1px_auto] font-medium tabular-nums text-foreground",
        text,
        className,
      )}
      style={{ gridTemplateColumns: `${colTrack} 1px ${colTrack}` }}
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
