import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";

import { cn } from "cn";

function ScrollArea({
  className,
  viewportClassName,
  scrollbarClassName,
  scrollbars = "vertical",
  children,
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  /** 给滚动视口单独加类（例如限高触发滚动） */
  viewportClassName?: string;
  /** 滚动条额外类 */
  scrollbarClassName?: string;
  /** 显示哪些滚动条 */
  scrollbars?: "vertical" | "horizontal" | "both";
}) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn(
          "size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
          viewportClassName,
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {scrollbars === "vertical" || scrollbars === "both" ? (
        <ScrollBar className={scrollbarClassName} />
      ) : null}
      {scrollbars === "horizontal" || scrollbars === "both" ? (
        <ScrollBar orientation="horizontal" />
      ) : null}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        // 上下 inset 读继承的 --scroll-corner-inset（弹层圆角变量）；未设置则为 0
        "flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent data-vertical:py-[var(--scroll-corner-inset,0px)]",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
