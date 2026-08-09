import { cn } from "@/lib/utils";
import { groupPalmerLabels, type UiQuadrant } from "@/lib/tooth-fdi";

type ToothPalmerMarkProps = {
  fdis: number[];
  className?: string;
  /** 更紧凑，用于表格单元格 */
  compact?: boolean;
};

function Quad({
  text,
  place,
  compact,
}: {
  text: string;
  place: UiQuadrant;
  compact?: boolean;
}) {
  const pos =
    place === "UR"
      ? "right-1/2 bottom-1/2 origin-bottom-right pr-0.5 pb-0.5 text-right"
      : place === "UL"
        ? "left-1/2 bottom-1/2 origin-bottom-left pl-0.5 pb-0.5 text-left"
        : place === "LR"
          ? "right-1/2 top-1/2 origin-top-right pr-0.5 pt-0.5 text-right"
          : "left-1/2 top-1/2 origin-top-left pl-0.5 pt-0.5 text-left";

  if (!text) return null;
  return (
    <span
      className={cn(
        "absolute max-w-[50%] truncate font-medium leading-none text-foreground",
        compact ? "text-[10px]" : "text-xs",
        pos,
      )}
    >
      {text}
    </span>
  );
}

/** 图1：十字象限 Palmer 标记 */
export function ToothPalmerMark({ fdis, className, compact }: ToothPalmerMarkProps) {
  const g = groupPalmerLabels(fdis);
  const box = compact ? "h-8 w-10" : "h-10 w-14";

  return (
    <span
      className={cn(
        "relative inline-block shrink-0",
        box,
        className,
      )}
    >
      <span className="absolute inset-x-[18%] top-1/2 h-px -translate-y-1/2 bg-sky-300" />
      <span className="absolute inset-y-[18%] left-1/2 w-px -translate-x-1/2 bg-sky-300" />
      <Quad text={g.UR} place="UR" compact={compact} />
      <Quad text={g.UL} place="UL" compact={compact} />
      <Quad text={g.LR} place="LR" compact={compact} />
      <Quad text={g.LL} place="LL" compact={compact} />
    </span>
  );
}
