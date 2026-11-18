import * as React from "react";

import { cn } from "cn";

import { formatAxisMoney, labelStep, niceMax } from "./chart-utils";

export type LineSeries = {
  label: string;
  color: string;
  values: number[];
  /** 是否画填充面积 */
  area?: boolean;
  /** 是否虚线（用于与实线重叠时仍可分辨） */
  dashed?: boolean;
};

type LineChartProps = {
  labels: string[];
  series: LineSeries[];
  formatValue: (value: number) => string;
  height?: number;
  className?: string;
};

const W = 720;
const M = { top: 16, right: 26, bottom: 30, left: 54 };

export function LineChart({
  labels,
  series,
  formatValue,
  height = 280,
  className,
}: LineChartProps) {
  const [active, setActive] = React.useState<number | null>(null);
  const gradientId = React.useId();
  const plotW = W - M.left - M.right;
  const plotH = height - M.top - M.bottom;
  const max = niceMax(Math.max(0, ...series.flatMap((item) => item.values)));
  const step = labelStep(labels.length);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const count = labels.length;

  function xOf(index: number): number {
    if (count <= 1) return M.left + plotW / 2;
    return M.left + (plotW * index) / (count - 1);
  }

  function yOf(value: number): number {
    return M.top + plotH * (1 - value / max);
  }

  if (!count) return null;

  const activeLabel = active != null ? labels[active] : null;
  const leftPct = active != null ? (xOf(active) / W) * 100 : 0;
  const translate = leftPct < 18 ? "0" : leftPct > 82 ? "-100%" : "-50%";

  return (
    <div className={cn("relative w-full", className)}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="收入趋势折线图"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={series[0]?.color ?? "var(--chart-2)"}
              stopOpacity="0.28"
            />
            <stop
              offset="100%"
              stopColor={series[0]?.color ?? "var(--chart-2)"}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

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

        {series.map((item) => {
          const points = labels.map((_, index) => ({
            x: xOf(index),
            y: yOf(item.values[index] ?? 0),
          }));
          const line = points
            .map(
              (point, index) =>
                `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
            )
            .join(" ");
          const areaPath = item.area
            ? `${line} L ${points[points.length - 1].x} ${M.top + plotH} L ${points[0].x} ${M.top + plotH} Z`
            : null;
          return (
            <g key={item.label}>
              {areaPath ? (
                <path d={areaPath} fill={`url(#${gradientId})`} />
              ) : null}
              <path
                d={line}
                fill="none"
                stroke={item.color}
                strokeWidth={2}
                strokeDasharray={item.dashed ? "5 4" : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {count <= 40
                ? points.map((point, index) => (
                    <circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r={active === index ? 4 : 2.4}
                      fill="var(--card)"
                      stroke={item.color}
                      strokeWidth={2}
                      className="transition-all duration-150"
                    />
                  ))
                : null}
            </g>
          );
        })}

        {active != null ? (
          <line
            x1={xOf(active)}
            x2={xOf(active)}
            y1={M.top}
            y2={M.top + plotH}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
        ) : null}

        {labels.map((label, index) =>
          index % step === 0 ? (
            <text
              key={`${label}-${index}`}
              x={xOf(index)}
              y={height - M.bottom + 16}
              textAnchor="middle"
              fontSize={10}
              fill="var(--muted-foreground)"
            >
              {label}
            </text>
          ) : null,
        )}
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
