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
  formatTeeth,
  isDeciduousFdi,
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
        "flex size-8 items-center justify-center rounded-md border text-sm font-medium transition-colors",
        selected
          ? "border-teal-600 bg-teal-500 text-white"
          : "border-border bg-background hover:bg-muted",
      )}
    >
      {palmerLabel(fdi)}
    </button>
  );
}

function QuadrantBlock({
  q,
  selected,
  toggle,
}: {
  q: UiQuadrant;
  selected: Set<number>;
  toggle: (n: number) => void;
}) {
  const perm = permanentInUi(q);
  const dec = deciduousInUi(q);
  // UR/LR：外侧在左，显示顺序已是 8→1；UL/LL：1→8
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        {perm.map((n) => (
          <ToothCell
            key={n}
            fdi={n}
            selected={selected.has(n)}
            onToggle={() => toggle(n)}
          />
        ))}
      </div>
      <div className={cn("flex gap-1", q === "UR" || q === "LR" ? "justify-end" : "justify-start")}>
        {dec.map((n) => (
          <ToothCell
            key={n}
            fdi={n}
            selected={selected.has(n)}
            onToggle={() => toggle(n)}
          />
        ))}
      </div>
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
    // 去掉无效；恒牙乳牙都保留
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
      <DialogContent className="sm:max-w-xl">
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

          <div className="relative mx-auto w-fit pt-2">
            <div className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 -translate-x-full pr-2 text-xs text-muted-foreground">
              右
            </div>
            <div className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 translate-x-full pl-2 text-xs text-muted-foreground">
              左
            </div>
            <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-3">
              <QuadrantBlock q="UR" selected={draft} toggle={toggle} />
              <QuadrantBlock q="UL" selected={draft} toggle={toggle} />
              <QuadrantBlock q="LR" selected={draft} toggle={toggle} />
              <QuadrantBlock q="LL" selected={draft} toggle={toggle} />
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
          </div>

          <p className="text-center text-xs text-muted-foreground">
            已选 {draft.size} 颗
            {draft.size
              ? `（${formatTeeth(
                  [...draft].sort((a, b) => a - b),
                )}）`
              : ""}
            {![...draft].some(isDeciduousFdi) ? null : " · 含乳牙"}
          </p>
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
