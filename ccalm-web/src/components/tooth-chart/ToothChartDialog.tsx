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
        "box-border flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-md border text-sm font-medium tabular-nums transition-colors",
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
    <div className={cn("flex gap-1", alignEnd ? "justify-end" : "justify-start")}>
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
  const alignEnd = q === "UR" || q === "LR";
  const rows = deciduousFirst ? (
    <>
      <ToothRow fdis={dec} selected={selected} toggle={toggle} alignEnd={alignEnd} />
      <ToothRow fdis={perm} selected={selected} toggle={toggle} />
    </>
  ) : (
    <>
      <ToothRow fdis={perm} selected={selected} toggle={toggle} />
      <ToothRow fdis={dec} selected={selected} toggle={toggle} alignEnd={alignEnd} />
    </>
  );
  return <div className="flex flex-col gap-1">{rows}</div>;
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
    { label: "全口-乳", nums: shortcutDeciduous("all") },
    { label: "上半口-乳", nums: shortcutDeciduous("upper") },
    { label: "下半口-乳", nums: shortcutDeciduous("lower") },
    { label: "前牙-乳", nums: shortcutDeciduous("front") },
    { label: "后牙-乳", nums: shortcutDeciduous("back") },
    { label: "全口-恒", nums: shortcutPermanent("all") },
    { label: "上半口-恒", nums: shortcutPermanent("upper") },
    { label: "下半口-恒", nums: shortcutPermanent("lower") },
    { label: "前牙-恒", nums: shortcutPermanent("front") },
    { label: "后牙-恒", nums: shortcutPermanent("back") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-fit max-w-[calc(100vw-2rem)] sm:max-w-none">
        <DialogHeader>
          <DialogTitle>选择牙位</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={clearAll}>
              清空
            </Button>
            {shortcuts.slice(0, 5).map((s) => (
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
          </div>
          <div className="flex flex-wrap gap-2">
            {shortcuts.slice(5).map((s) => (
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
          </div>

          <div className="mx-auto grid w-fit grid-cols-[auto_1px_auto] items-stretch">
            <div className="pr-3">
              <QuadrantBlock q="UR" selected={draft} toggle={toggle} deciduousFirst />
            </div>
            <div className="row-span-3 w-px bg-border" />
            <div className="pl-3">
              <QuadrantBlock q="UL" selected={draft} toggle={toggle} deciduousFirst />
            </div>

            <div className="flex items-center gap-2 py-3 pr-3">
              <span className="shrink-0 text-xs text-muted-foreground">右</span>
              <div className="h-px min-w-6 flex-1 bg-border" />
            </div>
            <div className="flex items-center gap-2 py-3 pl-3">
              <div className="h-px min-w-6 flex-1 bg-border" />
              <span className="shrink-0 text-xs text-muted-foreground">左</span>
            </div>

            <div className="pr-3">
              <QuadrantBlock q="LR" selected={draft} toggle={toggle} />
            </div>
            <div className="pl-3">
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
