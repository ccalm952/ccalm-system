import * as React from "react";
import { Plus, X } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  canalSlotsForTeeth,
  formatCanalGroups,
  optionalCanalPresetsForTeeth,
  parseCanalGroups,
  type RootCanal,
  type RootCanalGroup,
} from "@/lib/medical-records/root-canal";
import { parseTeethStrict } from "@/lib/tooth-fdi";

/** 长度最多两位整数、一位小数（18 / 18.5） */
const LENGTH_PATTERN = /^\d{0,2}(\.\d?)?$/;

/** 输入中的临时值：先留在本地，避免「近颊」敲个 2 就被解析成「近颊2」这个根管 */
type Editing = { name: string; value: string };

/**
 * 处置里的「根管长度」条：按牙位分组，每个根管一个输入框。
 * 文本仍是唯一存储；一位数的输入先放本地，敲满两位或失焦才回写。
 * Tab / 空格 / Enter 跳到下一根管，不自动跳。
 */
export function RootCanalField({
  teeth,
  text,
  onChange,
}: {
  teeth: string;
  text: string;
  onChange: (text: string) => void;
}) {
  const { prefix, groups } = React.useMemo(
    () => parseCanalGroups(text),
    [text],
  );
  const fdis = React.useMemo(() => parseTeethStrict(teeth) ?? [], [teeth]);
  const multi = fdis.length > 1;

  const [open, setOpen] = React.useState(false);
  const [activeTooth, setActiveTooth] = React.useState("");
  const [editing, setEditing] = React.useState<Editing | null>(null);
  const [focusName, setFocusName] = React.useState<string | null>(null);
  const [extras, setExtras] = React.useState<Record<string, string[]>>({});
  const inputs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const currentTooth = multi
    ? fdis.map(String).includes(activeTooth)
      ? activeTooth
      : String(fdis[0])
    : "";

  const key = multi ? currentTooth : fdis.length === 1 ? String(fdis[0]) : "";

  const group: RootCanalGroup | undefined =
    groups.find((g) => g.tooth === key) ??
    (multi
      ? fdis.length > 0 && key === String(fdis[0])
        ? groups.find((g) => !g.tooth)
        : undefined
      : groups.find((g) => !g.tooth));

  /** 根管候选按当前牙位取；没选牙位时用通用候选 */
  const teethForPresets = multi ? currentTooth : key || teeth;
  const slotPresets = React.useMemo(
    () => canalSlotsForTeeth(teethForPresets),
    [teethForPresets],
  );
  const optionalPresets = React.useMemo(
    () => optionalCanalPresetsForTeeth(teethForPresets),
    [teethForPresets],
  );

  const existing = group?.canals ?? [];
  const extraNames = extras[currentTooth] ?? [];
  const names: string[] = [];
  for (const name of [
    ...slotPresets,
    ...existing.map((c) => c.name),
    ...extraNames,
  ]) {
    if (!names.includes(name)) names.push(name);
  }
  const slots: RootCanal[] = names.map(
    (name) => existing.find((c) => c.name === name) ?? { name, length: "" },
  );
  const addableOptional = optionalPresets.filter((n) => !names.includes(n));

  React.useEffect(() => {
    if (!focusName) return;
    inputs.current[focusName]?.focus();
    inputs.current[focusName]?.select();
    setFocusName(null);
  }, [focusName, text]);

  const hasAny = groups.some((g) => g.canals.some((c) => c.length !== ""));
  const expanded = open || hasAny;

  function toothIndex(tooth: string): number {
    const index = fdis.findIndex((f) => String(f) === tooth);
    return index === -1 ? fdis.length : index;
  }

  function apply(nextSlots: RootCanal[]) {
    const canals = nextSlots.filter((c) => c.name.trim() && c.length !== "");
    const others: RootCanalGroup[] = [];
    const used = new Set<string>([currentTooth]);
    for (const g of groups) {
      if (g === group) continue;
      if (!multi) {
        if (g.tooth !== key) others.push(g);
        continue;
      }
      if (g.tooth === currentTooth) continue;
      if (!g.tooth) {
        // 旧文本里没有牙位前缀的组，按牙位顺序补上标签，避免丢数据
        const free = fdis.map(String).find((t) => !used.has(t));
        if (!free) continue;
        used.add(free);
        others.push({ ...g, tooth: free });
        continue;
      }
      others.push(g);
    }
    const nextGroups = canals.length
      ? [
          ...others,
          {
            tooth: multi ? currentTooth : "",
            before: group?.before ?? "",
            after: group?.after ?? "",
            canals,
          },
        ]
      : [...others];
    nextGroups.sort((a, b) => toothIndex(a.tooth) - toothIndex(b.tooth));

    // 清空数字后，组里的其他文字（如「根备」）退回前缀，不丢字
    const leftover = canals.length
      ? ""
      : [group?.before, group?.after].filter(Boolean).join(" ");
    onChange(
      formatCanalGroups(
        [prefix, leftover].filter(Boolean).join(" "),
        nextGroups,
      ),
    );
  }

  function commit(name: string, value: string) {
    apply(slots.map((s) => (s.name === name ? { ...s, length: value } : s)));
    setEditing(null);
  }

  function setLength(name: string, raw: string) {
    if (!LENGTH_PATTERN.test(raw)) return;
    setEditing({ name, value: raw });
    // 两位整数或带小数才算填完，立刻回写；一位数先放本地
    if (raw === "" || raw.includes(".") || /^\d{2}$/.test(raw)) {
      commit(name, raw);
    }
  }

  function focusSlot(offset: number, name: string) {
    const index = slots.findIndex((s) => s.name === name);
    const target = slots[index + offset];
    if (target) inputs.current[target.name]?.focus();
  }

  function addExtra(name: string) {
    setExtras((prev) => ({
      ...prev,
      [currentTooth]: [...(prev[currentTooth] ?? []), name],
    }));
    setFocusName(name);
  }

  function removeExtra(name: string) {
    setExtras((prev) => ({
      ...prev,
      [currentTooth]: (prev[currentTooth] ?? []).filter((n) => n !== name),
    }));
    apply(slots.filter((s) => s.name !== name));
  }

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="w-fit rounded-full border-dashed text-muted-foreground"
        onClick={() => {
          setOpen(true);
          setFocusName(slots[0]?.name ?? null);
        }}
      >
        <Plus className="size-3" />
        根管长度
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {multi ? (
        <div className="flex flex-wrap items-center gap-1">
          {fdis.map((fdi) => {
            const label = String(fdi);
            const filled = groups.some(
              (g) => g.tooth === label && g.canals.some((c) => c.length !== ""),
            );
            return (
              <Button
                key={label}
                type="button"
                size="xs"
                variant={currentTooth === label ? "default" : "outline"}
                onClick={() => {
                  if (editing) commit(editing.name, editing.value);
                  setActiveTooth(label);
                  setFocusName(canalSlotsForTeeth(label)[0] ?? null);
                }}
                className={cn(
                  "rounded-full px-2 tabular-nums",
                  currentTooth !== label && "text-muted-foreground",
                  filled &&
                    currentTooth !== label &&
                    "border-primary/50 text-foreground",
                )}
              >
                {label}
              </Button>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        {slots.map((canal) => {
          const isSlot = slotPresets.includes(canal.name);
          const index = slots.findIndex((s) => s.name === canal.name);
          const value =
            editing?.name === canal.name ? editing.value : canal.length;
          return (
            <span
              key={canal.name}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border bg-card py-0.5 pl-2 text-xs shadow-xs",
                // 没有删除按钮的槽位左右留一样宽
                isSlot ? "pr-2" : "pr-1",
              )}
            >
              <span className="text-muted-foreground">{canal.name}</span>
              <Input
                ref={(el) => {
                  inputs.current[canal.name] = el;
                }}
                value={value}
                onChange={(e) => setLength(canal.name, e.target.value)}
                onBlur={() => {
                  if (editing?.name === canal.name) {
                    commit(canal.name, editing.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    const next = slots[index + 1];
                    if (next) inputs.current[next.name]?.focus();
                  } else if (e.key === "Backspace" && value === "") {
                    e.preventDefault();
                    focusSlot(-1, canal.name);
                  }
                }}
                inputMode="decimal"
                aria-label={`${canal.name}工作长度`}
                placeholder="—"
                className="h-6 w-8 rounded-none border-0 bg-transparent px-0 text-center text-xs tabular-nums shadow-none focus-visible:ring-0"
              />
              <span className="text-muted-foreground/70">mm</span>
              {canal.file ? (
                <span className="text-muted-foreground/60">{canal.file}</span>
              ) : null}
              {isSlot ? null : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  tabIndex={-1}
                  aria-label={`删除${canal.name}`}
                  className="size-5 rounded-full text-muted-foreground"
                  onClick={() =>
                    extraNames.includes(canal.name)
                      ? removeExtra(canal.name)
                      : apply(slots.filter((s) => s.name !== canal.name))
                  }
                >
                  <X className="size-3" />
                </Button>
              )}
            </span>
          );
        })}

        {addableOptional.map((name) => (
          <Button
            key={name}
            type="button"
            variant="outline"
            size="xs"
            onClick={() => addExtra(name)}
            className="rounded-full border-dashed px-2 text-muted-foreground"
          >
            <Plus className="size-3" />
            {name}
          </Button>
        ))}
      </div>
    </div>
  );
}
