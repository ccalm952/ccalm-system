import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 纵向时间轴（可组合子组件）。
 *
 * 默认间距使用 Tailwind 的 `gap-*` / `pl-*`（需要微调时，直接在对应组件上传 `className` 覆盖即可）。
 *
 * 每条 `TimelineItem` 默认 `items-center`：左侧时间、圆点、右侧内容在同一行内垂直居中。
 * 若要改回顶对齐，可在 `TimelineItem` 上传 `className="items-start"`。
 */
function Timeline({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="timeline" className={cn("flex flex-col gap-y-4", className)} {...props}>
      {children}
    </div>
  );
}

function TimelineItem({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="timeline-item" className={cn("flex gap-4", className)} {...props} />;
}

function TimelineTime({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-time"
      className={cn("flex shrink-0 items-center tabular-nums", className)}
      {...props}
    />
  );
}

function TimelineIndicator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-indicator"
      className="flex w-4 shrink-0 self-stretch flex-col items-center"
      {...props}
    >
      <div
        data-slot="timeline-indicator-before"
        className="-mt-1 w-0.5 flex-1 bg-border"
        aria-hidden
      />

      <div
        data-slot="timeline-indicator-dot"
        className={cn("h-4 w-4 shrink-0 rounded-full bg-primary", className)}
        aria-hidden
      />

      <div
        data-slot="timeline-indicator-after"
        className="-mb-1 w-0.5 flex-1 bg-border"
        aria-hidden
      />
    </div>
  );
}

function TimelineContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-content"
      className={cn("flex min-w-0 flex-col gap-2", className)}
      {...props}
    />
  );
}

function TimelineTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="timeline-title" className={cn("text-sm font-medium", className)} {...props} />
  );
}

function TimelineDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * 子组件说明：
 * - `Timeline`：根容器（纵向排列；`TimelineItem` 之间默认 `gap-y-4` ≈ 16px）
 * - `TimelineItem`：单条记录行（时间 / 指示器 / 内容的三列布局）
 * - `TimelineTime`：左侧时间列（文字样式与右对齐）
 * - `TimelineIndicator`：中间指示器列（包含“竖线 + 圆点”；`className` 只作用于圆点）
 * - `TimelineContent`：右侧内容列容器（标题 + 描述等）
 * - `TimelineTitle`：内容标题
 * - `TimelineDescription`：内容描述/副文本
 */
export {
  Timeline,
  TimelineItem,
  TimelineTime,
  TimelineIndicator,
  TimelineContent,
  TimelineTitle,
  TimelineDescription,
};
