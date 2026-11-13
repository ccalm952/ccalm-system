import * as React from "react";
import { toast } from "sonner";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";

export type PatientMatch = {
  id: number;
  name: string;
  phone: string;
  chartNo: string;
  gender: string;
  birthday: string | null;
  lastVisitDate: string | null;
};

/** 姓名输入框：边输入边查已有患者，选中回调 onSelect；没选就当新患者 */
export function PatientNameCombobox({
  value,
  onValueChange,
  onSelect,
  placeholder = "姓名",
  className,
}: {
  value: string;
  onValueChange: (name: string) => void;
  onSelect: (patient: PatientMatch) => void;
  placeholder?: string;
  className?: string;
}) {
  const [matches, setMatches] = React.useState<PatientMatch[]>([]);
  const query = value.trim();

  React.useEffect(() => {
    if (!query) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      api<{ list: PatientMatch[] }>(
        "GET",
        `/patients?q=${encodeURIComponent(query)}&pageSize=8`,
      )
        .then((res) => {
          if (!cancelled) setMatches(res.list);
        })
        .catch((e: unknown) => toast.error(errorMessage(e)));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <Combobox
      items={matches}
      filter={null}
      value={null}
      itemToStringLabel={(p: PatientMatch) => p.name}
      inputValue={value}
      onInputValueChange={(v, details) => {
        if (
          details.reason === "input-change" ||
          details.reason === "input-clear"
        ) {
          onValueChange(v);
        }
      }}
      onValueChange={(p: PatientMatch | null) => {
        if (p) onSelect(p);
      }}
    >
      <ComboboxInput
        placeholder={placeholder}
        showTrigger={false}
        className={className}
      />
      <ComboboxContent>
        <ComboboxEmpty>
          {query ? "没有同名患者，保存将新建" : "输入姓名查找已有患者"}
        </ComboboxEmpty>
        <ComboboxList>
          {(p: PatientMatch) => (
            <ComboboxItem key={p.id} value={p}>
              <span className="shrink-0">{p.name}</span>
              <span className="truncate text-muted-foreground">
                {[
                  p.gender,
                  p.phone,
                  p.chartNo,
                  p.lastVisitDate ? `最近 ${p.lastVisitDate}` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
