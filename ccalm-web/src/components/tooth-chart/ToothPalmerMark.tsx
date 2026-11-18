import * as React from "react";

import { cn } from "cn";
import { groupPalmerLabels } from "@/lib/tooth-fdi";

type ToothPalmerMarkProps = {
  fdis: number[];
  className?: string;
};

/** 图：十字象限 Palmer 标记；宽度按牙位文字动态测量，高度由字体和 padding 自然决定 */
export function ToothPalmerMark({ fdis, className }: ToothPalmerMarkProps) {
  const g = groupPalmerLabels(fdis);
  const vLine = "bg-sky-300 w-px";
  const hLine = "bg-sky-300 h-px w-full";
  const cell = "flex items-center overflow-hidden whitespace-nowrap p-[2px]";
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
    setColPx(Math.max(Math.ceil(max), 16));
  }, [measureKey]);

  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <span
        ref={measureRef}
        className="pointer-events-none absolute top-0 left-0 flex text-[14px] leading-none font-medium tabular-nums opacity-0"
        aria-hidden
      >
        {labels.map((label, i) => (
          <span key={i} data-m className={cn("px-[2px] whitespace-nowrap")}>
            {label || "\u00a0"}
          </span>
        ))}
      </span>
      <span
        className="grid text-[14px] leading-none font-medium text-foreground tabular-nums"
        style={{
          gridTemplateRows: "auto 1px auto",
          gridTemplateColumns: colPx
            ? `${colPx}px 1px ${colPx}px`
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
