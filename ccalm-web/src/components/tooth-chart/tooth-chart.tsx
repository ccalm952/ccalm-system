import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  deciduousInUi,
  formatTeeth,
  groupPalmerLabels,
  palmerLabel,
  parseTeethStrict,
  permanentInUi,
  shortcutDeciduous,
  shortcutPermanent,
  type UiQuadrant,
} from "@/lib/tooth-fdi";
import { cn } from "cn";
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

type ToothChartPanelProps = {
  /** 当前已选 FDI；点选即时生效 */
  value: number[];
  onValueChange: (fdis: number[]) => void;
  /** 仅允许点选这些牙位（如计划明细从组牙位中勾选） */
  allowedFdis?: number[];
};

function ToothCell({
  fdi,
  selected,
  disabled,
  onToggle,
}: {
  fdi: number;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "box-border flex shrink-0 items-center justify-center rounded-md border font-medium tabular-nums transition-colors",
        "h-7 w-7 text-xs sm:h-[32px] sm:w-[32px] sm:text-sm",
        disabled
          ? "cursor-not-allowed border-border/50 bg-muted/40 text-muted-foreground"
          : selected
            ? "border-teal-600 bg-teal-500 text-white"
            : "border-border bg-background hover:bg-muted",
      )}
    >
      {palmerLabel(fdi)}
    </button>
  );
}

function ToothRow({
  fdis,
  selected,
  allowed,
  toggle,
  alignEnd,
}: {
  fdis: number[];
  selected: Set<number>;
  allowed?: Set<number>;
  toggle: (n: number) => void;
  alignEnd?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-0.5 sm:gap-1",
        alignEnd ? "justify-end" : "justify-start",
      )}
    >
      {fdis.map((n) => (
        <ToothCell
          key={n}
          fdi={n}
          selected={selected.has(n)}
          disabled={allowed != null && !allowed.has(n)}
          onToggle={() => toggle(n)}
        />
      ))}
    </div>
  );
}

/** 恒牙后牙 6–8；前牙/前磨牙 1–5（手机两行布局用） */
function splitPermanent(q: UiQuadrant) {
  const perm = permanentInUi(q);
  return {
    posterior: perm.filter((n) => n % 10 >= 6),
    anterior: perm.filter((n) => n % 10 <= 5),
  };
}

function QuadrantBlock({
  q,
  selected,
  allowed,
  toggle,
  deciduousFirst,
}: {
  q: UiQuadrant;
  selected: Set<number>;
  allowed?: Set<number>;
  toggle: (n: number) => void;
  /** 上半口：乳牙在上、恒牙在下 */
  deciduousFirst?: boolean;
}) {
  const perm = permanentInUi(q);
  const dec = deciduousInUi(q);
  const { posterior, anterior } = splitPermanent(q);
  /** 靠中线 */
  const alignCenter = q === "UR" || q === "LR";
  /** 靠外侧（后牙行） */
  const alignOuter = !alignCenter;

  const deciduousRow = (
    <ToothRow
      fdis={dec}
      selected={selected}
      allowed={allowed}
      toggle={toggle}
      alignEnd={alignCenter}
    />
  );
  const permanentDesktop = (
    <div className="hidden sm:block">
      <ToothRow
        fdis={perm}
        selected={selected}
        allowed={allowed}
        toggle={toggle}
      />
    </div>
  );
  const permanentMobile = deciduousFirst ? (
    <div className="flex flex-col gap-0.5 sm:hidden">
      <ToothRow
        fdis={posterior}
        selected={selected}
        allowed={allowed}
        toggle={toggle}
        alignEnd={alignOuter}
      />
      <ToothRow
        fdis={anterior}
        selected={selected}
        allowed={allowed}
        toggle={toggle}
        alignEnd={alignCenter}
      />
    </div>
  ) : (
    <div className="flex flex-col gap-0.5 sm:hidden">
      <ToothRow
        fdis={anterior}
        selected={selected}
        allowed={allowed}
        toggle={toggle}
        alignEnd={alignCenter}
      />
      <ToothRow
        fdis={posterior}
        selected={selected}
        allowed={allowed}
        toggle={toggle}
        alignEnd={alignOuter}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-0.5 sm:gap-1">
      {deciduousFirst ? (
        <>
          {deciduousRow}
          {permanentMobile}
          {permanentDesktop}
        </>
      ) : (
        <>
          {permanentMobile}
          {permanentDesktop}
          {deciduousRow}
        </>
      )}
    </div>
  );
}

export function ToothChartPanel({
  value,
  onValueChange,
  allowedFdis,
}: ToothChartPanelProps) {
  const draft = new Set(value);
  const allowed = allowedFdis != null ? new Set(allowedFdis) : undefined;

  function toggle(n: number) {
    if (allowed && !allowed.has(n)) return;
    const next = new Set(draft);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    onValueChange([...next]);
  }

  function applyShortcut(nums: number[]) {
    const scoped = allowed ? nums.filter((n) => allowed.has(n)) : nums;
    if (!scoped.length) return;
    const next = new Set(draft);
    const allOn = scoped.every((n) => next.has(n));
    if (allOn) {
      for (const n of scoped) next.delete(n);
    } else {
      for (const n of scoped) next.add(n);
    }
    onValueChange([...next]);
  }

  function clearAll() {
    onValueChange([]);
  }

  const shortcuts: { label: string; nums: number[] }[] = [
    { label: "上口-乳", nums: shortcutDeciduous("upper") },
    { label: "下口-乳", nums: shortcutDeciduous("lower") },
    { label: "上口-恒", nums: shortcutPermanent("upper") },
    { label: "下口-恒", nums: shortcutPermanent("lower") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        {shortcuts.map((s) => (
          <Button
            key={s.label}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyShortcut(s.nums)}
          >
            {s.label}
          </Button>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={clearAll}>
          清空
        </Button>
      </div>

      <div className="mx-auto grid w-fit grid-cols-[auto_1px_auto] items-stretch">
        <div className="pr-2 sm:pr-[12px]">
          <QuadrantBlock
            q="UR"
            selected={draft}
            allowed={allowed}
            toggle={toggle}
            deciduousFirst
          />
        </div>
        <div className="row-span-3 w-px bg-border" />
        <div className="pl-2 sm:pl-[12px]">
          <QuadrantBlock
            q="UL"
            selected={draft}
            allowed={allowed}
            toggle={toggle}
            deciduousFirst
          />
        </div>

        <div className="flex items-center gap-2 py-0 sm:py-[6px]">
          <div className="h-px min-w-6 flex-1 bg-border" />
          <span className="shrink-0 text-xs text-muted-foreground">右</span>
          <div className="h-px min-w-6 flex-1 bg-border" />
        </div>
        <div className="flex items-center gap-2 py-0 sm:py-[6px]">
          <div className="h-px min-w-6 flex-1 bg-border" />
          <span className="shrink-0 text-xs text-muted-foreground">左</span>
          <div className="h-px min-w-6 flex-1 bg-border" />
        </div>

        <div className="pr-2 sm:pr-[12px]">
          <QuadrantBlock
            q="LR"
            selected={draft}
            allowed={allowed}
            toggle={toggle}
          />
        </div>
        <div className="pl-2 sm:pl-[12px]">
          <QuadrantBlock
            q="LL"
            selected={draft}
            allowed={allowed}
            toggle={toggle}
          />
        </div>
      </div>
    </div>
  );
}

type ToothPositionFieldProps = {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  /** 表格内更紧凑，不可点时可只展示 */
  compact?: boolean;
  large?: boolean;
  readOnly?: boolean;
  /** 无底色，未选牙位时显示空十字作为触发器 */
  plain?: boolean;
};

/**
 * 图1 触发器：可解析 FDI 时显示十字象限；否则显示原文。
 * 点击在下方展开选牙面板，点选即时生效（无可编辑文本框）。
 */
export function ToothPositionField({
  value,
  onValueChange,
  className,
  compact,
  large,
  readOnly,
  plain,
  allowedFdis,
}: ToothPositionFieldProps & { allowedFdis?: number[] }) {
  const parsed = React.useMemo(() => parseTeethStrict(value), [value]);
  const fdis = parsed ?? [];
  const freeText = parsed == null && value.trim() !== "";

  const textClass = compact
    ? "text-xs"
    : large
      ? "text-sm"
      : "text-base md:text-sm";

  const body = freeText ? (
    <span className={cn("truncate", textClass)}>{value}</span>
  ) : fdis.length || plain ? (
    <ToothPalmerMark fdis={fdis} />
  ) : (
    <span className={cn("text-muted-foreground", textClass)}>
      {compact ? "—" : "选择牙位"}
    </span>
  );

  if (readOnly) {
    return (
      <span className={cn("inline-flex min-w-0 items-center", className)}>
        {body}
      </span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              compact || plain
                ? "h-auto min-h-10 border-0 bg-transparent px-0 py-1.5 shadow-none hover:bg-transparent aria-expanded:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
                : "h-10 min-h-10 items-center border-transparent bg-input/50 px-2.5 py-0 text-base leading-none font-normal hover:bg-input/50 aria-expanded:bg-input/50 md:text-sm dark:bg-input/50 dark:hover:bg-input/50",
              large ? "h-auto min-h-10 justify-center" : "justify-start",
              "w-full overflow-hidden",
              className,
            )}
          />
        }
      >
        {body}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        // plain 用于表格单元格，-8 抵消 TableCell 的 px-2
        alignOffset={plain ? -8 : 0}
        className="w-auto"
      >
        <ToothChartPanel
          value={fdis}
          allowedFdis={allowedFdis}
          onValueChange={(next) => onValueChange(formatTeeth(next))}
        />
      </PopoverContent>
    </Popover>
  );
}
