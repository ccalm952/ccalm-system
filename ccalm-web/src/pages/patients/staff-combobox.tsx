import * as React from "react";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { api } from "@/lib/api";

/** doctors=可预约；assistants=可配台 */
export type StaffPool = "doctors" | "assistants";

const poolCache: Record<StaffPool, Promise<string[]> | null> = {
  doctors: null,
  assistants: null,
};

function loadPool(pool: StaffPool): Promise<string[]> {
  const path =
    pool === "doctors" ? "/patients/doctors" : "/patients/staff";
  poolCache[pool] ??= api<string[]>("GET", path).catch(() => {
    poolCache[pool] = null;
    return [];
  });
  return poolCache[pool];
}

function splitStaffNames(raw: string): string[] {
  return raw
    .split(/[、,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinStaffNames(names: string[]): string {
  return names.map((s) => s.trim()).filter(Boolean).join("、");
}

export function StaffCombobox({
  value,
  onValueChange,
  placeholder,
  multiple = false,
  pool = "assistants",
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  multiple?: boolean;
  pool?: StaffPool;
}) {
  const [items, setItems] = React.useState<string[]>([]);
  const chipsAnchor = useComboboxAnchor();

  React.useEffect(() => {
    let cancelled = false;
    void loadPool(pool).then((list) => {
      if (!cancelled) setItems(list);
    });
    return () => {
      cancelled = true;
    };
  }, [pool]);

  const selected = React.useMemo(
    () => (multiple ? splitStaffNames(value) : []),
    [multiple, value],
  );

  const listItems = React.useMemo(() => {
    if (!multiple) return items;
    const set = new Set(items);
    for (const name of selected) set.add(name);
    return [...set];
  }, [items, multiple, selected]);

  if (multiple) {
    return (
      <div className="w-full min-w-0">
        <Combobox
          items={listItems}
          multiple
          value={selected}
          onValueChange={(next) => onValueChange(joinStaffNames(next ?? []))}
        >
          <ComboboxChips ref={chipsAnchor} className="w-full">
            <ComboboxValue>
              {selected.map((item) => (
                <ComboboxChip key={item}>{item}</ComboboxChip>
              ))}
            </ComboboxValue>
            <ComboboxChipsInput
              placeholder={selected.length ? undefined : placeholder}
            />
          </ComboboxChips>
          <ComboboxContent anchor={chipsAnchor}>
            <ComboboxEmpty>暂无匹配</ComboboxEmpty>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
    );
  }

  return (
    <Combobox
      items={items}
      value={value || null}
      onValueChange={(v) => onValueChange(v ?? "")}
      onInputValueChange={(v) => onValueChange(v)}
    >
      <ComboboxInput placeholder={placeholder} />
      <ComboboxContent>
        <ComboboxEmpty>暂无匹配，可直接输入</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
