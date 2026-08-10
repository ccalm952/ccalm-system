import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  deciduousInUi,
  palmerLabel,
  permanentInUi,
  shortcutDeciduous,
  shortcutPermanent,
  type UiQuadrant,
} from "@/lib/tooth-fdi";

type ToothChartDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 当前已选 FDI；打开时作为草稿初始值 */
  value: number[];
  onConfirm: (fdis: number[]) => void;
};

function ToothCell({
  fdi,
  selected,
  onToggle,
}: {
  fdi: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "box-border flex shrink-0 items-center justify-center rounded-md border font-medium tabular-nums transition-colors",
        "h-7 w-7 text-xs sm:h-[32px] sm:w-[32px] sm:text-sm",
        selected
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
  toggle,
  alignEnd,
}: {
  fdis: number[];
  selected: Set<number>;
  toggle: (n: number) => void;
  alignEnd?: boolean;
}) {
  return (
    <div className={cn("flex gap-0.5 sm:gap-1", alignEnd ? "justify-end" : "justify-start")}>
      {fdis.map((n) => (
        <ToothCell
          key={n}
          fdi={n}
          selected={selected.has(n)}
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
  toggle,
  deciduousFirst,
}: {
  q: UiQuadrant;
  selected: Set<number>;
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
    <ToothRow fdis={dec} selected={selected} toggle={toggle} alignEnd={alignCenter} />
  );
  const permanentDesktop = (
    <div className="hidden sm:block">
      <ToothRow fdis={perm} selected={selected} toggle={toggle} />
    </div>
  );
  const permanentMobile = deciduousFirst ? (
    <div className="flex flex-col gap-0.5 sm:hidden">
      <ToothRow fdis={posterior} selected={selected} toggle={toggle} alignEnd={alignOuter} />
      <ToothRow fdis={anterior} selected={selected} toggle={toggle} alignEnd={alignCenter} />
    </div>
  ) : (
    <div className="flex flex-col gap-0.5 sm:hidden">
      <ToothRow fdis={anterior} selected={selected} toggle={toggle} alignEnd={alignCenter} />
      <ToothRow fdis={posterior} selected={selected} toggle={toggle} alignEnd={alignOuter} />
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

export function ToothChartDialog({
  open,
  onOpenChange,
  value,
  onConfirm,
}: ToothChartDialogProps) {
  const [draft, setDraft] = React.useState<Set<number>>(() => new Set(value));

  React.useEffect(() => {
    if (open) setDraft(new Set(value));
  }, [open, value]);

  function toggle(n: number) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  function applyShortcut(nums: number[]) {
    setDraft((prev) => {
      const next = new Set(prev);
      const allOn = nums.every((n) => next.has(n));
      if (allOn) {
        for (const n of nums) next.delete(n);
      } else {
        for (const n of nums) next.add(n);
      }
      return next;
    });
  }

  function clearAll() {
    setDraft(new Set());
  }

  function confirm() {
    const list = [...draft].filter((n) => !Number.isNaN(n));
    onConfirm(list.filter((n) => n > 0));
    onOpenChange(false);
  }

  const shortcuts: { label: string; nums: number[] }[] = [
    { label: "上口-乳", nums: shortcutDeciduous("upper") },
    { label: "下口-乳", nums: shortcutDeciduous("lower") },
    { label: "上口-恒", nums: shortcutPermanent("upper") },
    { label: "下口-恒", nums: shortcutPermanent("lower") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-fit sm:max-w-none">
        <DialogHeader>
          <DialogTitle>选择牙位</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
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
            <div className="pr-2 sm:pr-[18px]">
              <QuadrantBlock q="UR" selected={draft} toggle={toggle} deciduousFirst />
            </div>
            <div className="row-span-3 w-px bg-border" />
            <div className="pl-2 sm:pl-[18px]">
              <QuadrantBlock q="UL" selected={draft} toggle={toggle} deciduousFirst />
            </div>

            <div className="flex items-center gap-2 py-0 sm:py-[12px]">
              <span className="shrink-0 text-xs text-muted-foreground">右</span>
              <div className="h-px min-w-6 flex-1 bg-border" />
            </div>
            <div className="flex items-center gap-2 py-0 sm:py-[12px]">
              <div className="h-px min-w-6 flex-1 bg-border" />
              <span className="shrink-0 text-xs text-muted-foreground">左</span>
            </div>

            <div className="pr-2 sm:pr-[18px]">
              <QuadrantBlock q="LR" selected={draft} toggle={toggle} />
            </div>
            <div className="pl-2 sm:pl-[18px]">
              <QuadrantBlock q="LL" selected={draft} toggle={toggle} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" onClick={confirm}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
