import { cn } from "cn";
import { groupPalmerLabels } from "@/lib/tooth-fdi";

type ToothPalmerMarkProps = {
  fdis: number[];
  className?: string;
  /** 更紧凑（保留兼容；十字图本体尺寸已统一） */
  compact?: boolean;
  large?: boolean;
  /** 左右列最小宽度（保留兼容；十字图本体尺寸已统一） */
  minColPx?: number;
};

/** 左右列宽 / 行高固定，保证所有页面十字图本体大小一致 */
const COL_PX = 30;
const ROW_PX = 18;

/** 图：十字象限 Palmer 标记；四象限固定网格 */
export function ToothPalmerMark({ fdis, className }: ToothPalmerMarkProps) {
  const g = groupPalmerLabels(fdis);
  const line = "bg-sky-300";
  const cell = "flex items-center overflow-hidden whitespace-nowrap";

  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <span
        className="grid text-xs leading-none font-medium text-foreground tabular-nums"
        style={{
          gridTemplateColumns: `${COL_PX}px 1px ${COL_PX}px`,
          gridTemplateRows: `${ROW_PX}px 1px ${ROW_PX}px`,
          width: `${COL_PX * 2 + 1}px`,
          height: `${ROW_PX * 2 + 1}px`,
        }}
      >
        <span className={cn(cell, "justify-end pr-0.5")}>
          {g.UR || "\u00a0"}
        </span>
        <span className={line} />
        <span className={cn(cell, "justify-start pl-0.5")}>
          {g.UL || "\u00a0"}
        </span>

        <span className={line} />
        <span className={line} />
        <span className={line} />

        <span className={cn(cell, "justify-end pr-0.5")}>
          {g.LR || "\u00a0"}
        </span>
        <span className={line} />
        <span className={cn(cell, "justify-start pl-0.5")}>
          {g.LL || "\u00a0"}
        </span>
      </span>
    </span>
  );
}
