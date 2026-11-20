import * as React from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "cn";

import { pieColor, sumValues } from "./chart-utils";

export type PieDatum = {
  name: string;
  value: number;
};

type PieChartProps = {
  data: PieDatum[];
  /** 图例金额格式化 */
  formatValue: (value: number) => string;
  /** 中心标题，默认「合计」 */
  centerLabel?: string;
  className?: string;
};

const VIEW = 100;
const OUTER = 44;
const INNER = 27;

function polar(radius: number, angle: number) {
  return {
    x: 50 + radius * Math.cos(angle),
    y: 50 + radius * Math.sin(angle),
  };
}

/** 环形扇区路径 */
function donutPath(start: number, end: number): string {
  const largeArc = end - start > Math.PI ? 1 : 0;
  const outerStart = polar(OUTER, start);
  const outerEnd = polar(OUTER, end);
  const innerEnd = polar(INNER, end);
  const innerStart = polar(INNER, start);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${OUTER} ${OUTER} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER} ${INNER} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

export function PieChart({
  data,
  formatValue,
  centerLabel = "合计",
  className,
}: PieChartProps) {
  const [active, setActive] = React.useState<number | null>(null);
  const slices = React.useMemo(
    () =>
      data
        .filter((item) => item.value > 0)
        .map((item, index) => ({ ...item, ...pieColor(index) })),
    [data],
  );
  const total = React.useMemo(
    () => sumValues(slices.map((item) => item.value)),
    [slices],
  );

  if (!slices.length || total <= 0) return null;

  const values = slices.map((slice) => slice.value);
  const arcs = slices.map((slice, index) => {
    const before = values
      .slice(0, index)
      .reduce((sum, value) => sum + value, 0);
    const start = -Math.PI / 2 + (before / total) * Math.PI * 2;
    const end = start + (slice.value / total) * Math.PI * 2;
    return { ...slice, start, end };
  });

  const activeSlice = active != null ? arcs[active] : null;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-6 sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="relative size-[232px] shrink-0">
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="size-full"
          role="img"
          aria-label={`${centerLabel}分布饼图`}
        >
          {arcs.length === 1 ? (
            <circle
              cx="50"
              cy="50"
              r={(OUTER + INNER) / 2}
              fill="none"
              stroke={arcs[0].color}
              strokeOpacity={arcs[0].opacity}
              strokeWidth={OUTER - INNER}
            />
          ) : (
            arcs.map((arc, index) => (
              <path
                key={arc.name}
                d={donutPath(arc.start, arc.end)}
                fill={arc.color}
                fillOpacity={arc.opacity}
                stroke="var(--card)"
                strokeWidth="0.8"
                className="cursor-pointer transition-[opacity,stroke-width] duration-150"
                style={{
                  opacity: active == null || active === index ? 1 : 0.45,
                  strokeWidth: active === index ? 1.6 : 0.8,
                }}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
              />
            ))
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-10 text-center">
          <span className="max-w-full truncate text-xs text-muted-foreground">
            {activeSlice ? activeSlice.name : centerLabel}
          </span>
          <span className="font-heading text-lg font-semibold tabular-nums">
            {formatValue(activeSlice ? activeSlice.value : total)}
          </span>
          {activeSlice ? (
            <span className="text-[11px] text-muted-foreground">
              {((activeSlice.value / total) * 100).toFixed(1)}%
            </span>
          ) : null}
        </div>
      </div>

      <ScrollArea
        className="max-h-[252px] w-full"
        viewportClassName="max-h-[252px] flex flex-col gap-1 pr-1"
      >
        {arcs.map((slice, index) => {
          const share = (slice.value / total) * 100;
          return (
            <button
              key={slice.name}
              type="button"
              className={cn(
                "flex w-full flex-col gap-1.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-muted",
                active === index && "bg-muted",
              )}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
            >
              <div className="flex w-full items-center gap-2 text-sm">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: slice.color,
                    opacity: slice.opacity,
                  }}
                />
                <span className="min-w-0 flex-1 truncate">{slice.name}</span>
                <span className="shrink-0 tabular-nums">
                  {formatValue(slice.value)}
                </span>
                <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {share.toFixed(1)}%
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${share}%`,
                    backgroundColor: slice.color,
                    opacity: slice.opacity,
                  }}
                />
              </div>
            </button>
          );
        })}
      </ScrollArea>
    </div>
  );
}
