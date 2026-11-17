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

/** 图：十字象限 Palmer 标记；宽度按牙位文字动态测量，高度固定 */
export function ToothPalmerMark({
  fdis,
  className,
  minColPx = 0,
}: ToothPalmerMarkProps) {
  const g = groupPalmerLabels(fdis);
  const vLine = "bg-sky-300 w-px";
  const hLine = "bg-sky-300 h-px w-full";
  const cell = "flex items-center overflow-hidden whitespace-nowrap p-1";
  const labels = [g.UR, g.UL, g.LR, g.LL] as const;

  const measureRef = React.useRef<HTMLSpanElement>(null);
  const [leftPx, setLeftPx] = React.useState(0);
  const [rightPx, setRightPx] = React.useState(0);

  const measureKey = labels.join("\0");
  React.useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const widths = [...root.querySelectorAll<HTMLElement>("[data-m]")].map(
      (el) => el.offsetWidth,
    );
    setLeftPx(
      Math.max(
        Math.ceil(Math.max(widths[0] ?? 0, widths[2] ?? 0)),
        minColPx,
        16,
      ),
    );
    setRightPx(
      Math.max(
        Math.ceil(Math.max(widths[1] ?? 0, widths[3] ?? 0)),
        minColPx,
        16,
      ),
    );
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
          gridTemplateRows: "auto 1px auto",
          gridTemplateColumns:
            leftPx || rightPx
              ? `${leftPx}px 1px ${rightPx}px`
              : "auto 1px auto",
        }}
      >
        <span className={cn(cell, "justify-end")}>{g.UR || "\u00a0"}</span>
        <span className={vLine} />
        <span className={cn(cell, "justify-start")}>{g.UL || "\u00a0"}</span>

        <span className={hLine} />
        <span className={hLine} />
        <span className={hLine} />

        <span className={cn(cell, "justify-end")}>{g.LR || "\u00a0"}</span>
        <span className={vLine} />
        <span className={cn(cell, "justify-start")}>{g.LL || "\u00a0"}</span>
      </span>
    </span>
  );
}
