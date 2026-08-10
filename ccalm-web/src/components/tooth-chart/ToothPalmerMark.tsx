import * as React from "react";

import { cn } from "@/lib/utils";
import { groupPalmerLabels } from "@/lib/tooth-fdi";

type ToothPalmerMarkProps = {
  fdis: number[];
  className?: string;
  /** 更紧凑，用于表格单元格 */
  compact?: boolean;
};

/** 图1：十字象限 Palmer 标记；按实宽测左右列，等宽且保留水平 padding */
export function ToothPalmerMark({ fdis, className, compact }: ToothPalmerMarkProps) {
  const g = groupPalmerLabels(fdis);
  const text = compact ? "text-[10px] leading-[0]" : "text-xs leading-[0]";
  // 只保留左右内边距，避免上下 padding + items-start/end 造成「底多顶少」
  const cell = compact ? "px-0.5" : "px-1";
  const line = "bg-sky-300";
  const labels = [g.UR, g.UL, g.LR, g.LL] as const;
  const measureKey = `${labels.join("\0")}:${compact ? "c" : "n"}`;

  const measureRef = React.useRef<HTMLSpanElement>(null);
  const [colPx, setColPx] = React.useState(0);

  React.useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    let max = 0;
    for (const el of root.querySelectorAll<HTMLElement>("[data-m]")) {
      max = Math.max(max, el.offsetWidth);
    }
    setColPx(Math.ceil(max));
  }, [measureKey]);

  return (
    <span className={cn("relative inline-flex items-center leading-[0]", className)}>
      <span
        ref={measureRef}
        className={cn(
          "pointer-events-none absolute top-0 left-0 flex font-medium tabular-nums opacity-0 leading-[0]",
          text,
        )}
      >
        {labels.map((label, i) => (
          <span key={i} data-m className={cn("whitespace-nowrap", cell)}>
            {label || "\u00a0"}
          </span>
        ))}
      </span>
      <span
        className={cn(
          "grid shrink-0 grid-rows-[auto_1px_auto] font-medium tabular-nums leading-[0] text-foreground",
          text,
        )}
        style={
          colPx > 0
            ? { gridTemplateColumns: `${colPx}px 1px ${colPx}px` }
            : { gridTemplateColumns: "auto 1px auto" }
        }
      >
        <span className={cn("flex items-center justify-end whitespace-nowrap", cell)}>
          {g.UR || "\u00a0"}
        </span>
        <span className={line} />
        <span className={cn("flex items-center justify-start whitespace-nowrap", cell)}>
          {g.UL || "\u00a0"}
        </span>

        <span className={line} />
        <span className={line} />
        <span className={line} />

        <span className={cn("flex items-center justify-end whitespace-nowrap", cell)}>
          {g.LR || "\u00a0"}
        </span>
        <span className={line} />
        <span className={cn("flex items-center justify-start whitespace-nowrap", cell)}>
          {g.LL || "\u00a0"}
        </span>
      </span>
    </span>
  );
}
