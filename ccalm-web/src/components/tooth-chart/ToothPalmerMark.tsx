import { cn } from "@/lib/utils";
import { groupPalmerLabels } from "@/lib/tooth-fdi";

type ToothPalmerMarkProps = {
  fdis: number[];
  className?: string;
  /** 更紧凑，用于表格单元格 */
  compact?: boolean;
};

/** 图1：十字象限 Palmer 标记；四格等高，十字线贯通 */
export function ToothPalmerMark({ fdis, className, compact }: ToothPalmerMarkProps) {
  const g = groupPalmerLabels(fdis);
  const text = compact ? "text-[10px] leading-none" : "text-xs leading-none";
  const cell = compact ? "p-0.5" : "p-1";

  return (
    <table
      className={cn(
        "shrink-0 border-collapse font-medium text-foreground",
        text,
        className,
      )}
    >
      <tbody>
        <tr>
          <td
            className={cn(
              "border-r border-b border-sky-300 text-right align-bottom whitespace-nowrap",
              cell,
            )}
          >
            {g.UR || "\u00a0"}
          </td>
          <td
            className={cn(
              "border-b border-sky-300 text-left align-bottom whitespace-nowrap",
              cell,
            )}
          >
            {g.UL || "\u00a0"}
          </td>
        </tr>
        <tr>
          <td
            className={cn(
              "border-r border-sky-300 text-right align-top whitespace-nowrap",
              cell,
            )}
          >
            {g.LR || "\u00a0"}
          </td>
          <td className={cn("text-left align-top whitespace-nowrap", cell)}>
            {g.LL || "\u00a0"}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
