import * as React from "react";

import { cn } from "cn";
import { groupPalmerLabels } from "@/lib/tooth-fdi";

type ToothPalmerMarkProps = {
  fdis: number[];
  className?: string;
  /** 更紧凑（保留兼容；高度已统一） */
  compact?: boolean;
  large?: boolean;
  /** 左右列最小宽度（保留兼容） */
  minColPx?: number;
};

/** 行高固定，保证所有页面十字图高度一致 */
const ROW_PX = 18;

/** 图：十字象限 Palmer 标记；宽度按牙位文字动态测量，高度固定 */
export function ToothPalmerMark({
  fdis,
  className,
  minColPx = 0,
}: ToothPalmerMarkProps) {
  const g = groupPalmerLabels(fdis);
  const line = "bg-sky-300";
  const cell = "flex items-center overflow-hidden whitespace-nowrap";
  const labels = [g.UR, g.UL, g.LR, g.LL] as const;

  const measureRef = React.useRef<HTMLSpanElement>(null);
  const [colPx, setColPx] = React.useState(0);

  const measureKey = labels.join("\0");
  React.useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    let max = 0;
    for (const el of root.querySelectorAll<HTMLElement>("[data-m]")) {
      max = Math.max(max, el.offsetWidth);
    }
    setColPx(Math.max(Math.ceil(max) + 2, minColPx, 16));
  }, [measureKey, minColPx]);

  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <span
        ref={measureRef}
        className="pointer-events-none absolute top-0 left-0 flex text-xs leading-none font-medium tabular-nums opacity-0"
        aria-hidden
      >
        {labels.map((label, i) => (
          <span key={i} data-m className={cn("px-1 whitespace-nowrap")}>
            {label || "\u00a0"}
          </span>
        ))}
      </span>
      <span
        className="grid text-xs leading-none font-medium text-foreground tabular-nums"
        style={{
          gridTemplateColumns: colPx
            ? `${colPx}px 1px ${colPx}px`
            : "auto 1px auto",
          gridTemplateRows: `${ROW_PX}px 1px ${ROW_PX}px`,
          height: `${ROW_PX * 2 + 1}px`,
        }}
      >
        <span className={cn(cell, "justify-end pr-1")}>{g.UR || "\u00a0"}</span>
        <span className={line} />
        <span className={cn(cell, "justify-start pl-1")}>
          {g.UL || "\u00a0"}
        </span>

        <span className={line} />
        <span className={line} />
        <span className={line} />

        <span className={cn(cell, "justify-end pr-1")}>{g.LR || "\u00a0"}</span>
        <span className={line} />
        <span className={cn(cell, "justify-start pl-1")}>
          {g.LL || "\u00a0"}
        </span>
      </span>
    </span>
  );
}
