import * as React from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { api } from "@/lib/api";

let staffCache: Promise<string[]> | null = null;

function loadStaff(): Promise<string[]> {
  staffCache ??= api<string[]>("GET", "/patients/staff").catch(() => {
    staffCache = null;
    return [];
  });
  return staffCache;
}

export function StaffCombobox({
  value,
  onValueChange,
  placeholder,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
}) {
  const [items, setItems] = React.useState<string[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void loadStaff().then((list) => {
      if (!cancelled) setItems(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
