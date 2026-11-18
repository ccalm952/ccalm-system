import * as React from "react";

import { cn } from "cn";

import { formatAxisMoney, labelStep, niceMax } from "./chart-utils";

export type BarSeries = {
  label: string;
  color: string;
  values: number[];
};

type BarChartProps = {
  labels: string[];
  series: BarSeries[];
  formatValue: (value: number) => string;
  height?: number;
  className?: string;
};

const W = 720;
const M = { top: 14, right: 10, bottom: 30, left: 54 };

export function BarChart({
  labels,
  series,
  formatValue,
  height = 260,
  className,
}: BarChartProps) {
  const [active, setActive] = React.useState<number | null>(null);
  const plotW = W - M.left - M.right;
  const plotH = height - M.top - M.bottom;
  const allValues = series.flatMap((item) => item.values);
  const max = niceMax(Math.max(0, ...allValues));
  const step = labelStep(labels.length);
  const groupW = labels.length ? plotW / labels.length : plotW;
  const barW = Math.max(
    3,
    Math.min(18, (groupW * 0.62) / Math.max(1, series.length)),
  );
  const gap = 2;
  const groupInner = barW * series.length + gap * (series.length - 1);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  function yOf(value: number): number {
    return M.top + plotH * (1 - value / max);
  }

  if (!labels.length) return null;

  const activeLabel = active != null ? labels[active] : null;
  const leftPct =
    active != null ? ((M.left + groupW * (active + 0.5)) / W) * 100 : 0;
  const translate = leftPct < 18 ? "0" : leftPct > 82 ? "-100%" : "-50%";

  return (
    <div className={cn("relative w-full", className)}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="收入统计柱状图"
      >
        {ticks.map((tick) => {
          const value = max * tick;
          const y = yOf(value);
          return (
            <g key={tick}>
              <line
                x1={M.left}
                x2={W - M.right}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeDasharray={tick === 0 ? undefined : "3 3"}
              />
              <text
                x={M.left - 8}
                y={y + 3}
                textAnchor="end"
                fontSize={10}
                fill="var(--muted-foreground)"
              >
                {formatAxisMoney(value)}
              </text>
            </g>
          );
        })}

        {labels.map((label, index) => {
          const groupX = M.left + groupW * index;
          const startX = groupX + (groupW - groupInner) / 2;
          return (
            <g key={`${label}-${index}`}>
              {series.map((item, seriesIndex) => {
                const value = item.values[index] ?? 0;
                const barH = Math.max(0, M.top + plotH - yOf(value));
                return (
                  <rect
                    key={item.label}
                    x={startX + seriesIndex * (barW + gap)}
                    y={yOf(value)}
                    width={barW}
                    height={barH}
                    rx={2}
                    fill={item.color}
                    opacity={active == null || active === index ? 1 : 0.5}
                    className="transition-opacity duration-150"
                  />
                );
              })}
              {index % step === 0 ? (
                <text
                  x={groupX + groupW / 2}
                  y={height - M.bottom + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--muted-foreground)"
                >
                  {label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <div
        className="absolute flex"
        style={{
          left: `${(M.left / W) * 100}%`,
          width: `${(plotW / W) * 100}%`,
          top: `${(M.top / height) * 100}%`,
          height: `${(plotH / height) * 100}%`,
        }}
      >
        {labels.map((label, index) => (
          <div
            key={`${label}-${index}`}
            className="h-full flex-1"
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
          />
        ))}
      </div>

      {active != null ? (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-32 rounded-xl border bg-popover px-3 py-2 text-xs shadow-md"
          style={{ left: `${leftPct}%`, transform: `translateX(${translate})` }}
        >
          <div className="mb-1 font-medium">{activeLabel}</div>
          <div className="flex flex-col gap-1">
            {series.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </span>
                <span className="tabular-nums">
                  {formatValue(item.values[active] ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
