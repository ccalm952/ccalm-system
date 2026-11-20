import * as React from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import {
  DEFAULT_TAG_COLOR,
  refreshPatientTags,
  TAG_COLORS,
  tagBadgeStyle,
  usePatientTags,
  type PatientTag,
} from "@/lib/patients/tags";

export function PatientTagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const tags = usePatientTags();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const selected = new Set(value);

  const options = React.useMemo(() => {
    const byName = new Map(tags.map((t) => [t.name, t]));
    const known = tags.filter((t) => t.enabled || value.includes(t.name));
    for (const name of value) {
      if (!byName.has(name)) {
        known.push({
          id: 0,
          name,
          color: DEFAULT_TAG_COLOR,
          abbreviation: "",
          enabled: true,
          sortOrder: 0,
          count: 0,
        });
      }
    }
    return known;
  }, [tags, value]);

  const keyword = query.trim().toLowerCase();
  const filtered = options.filter((t) =>
    t.name.toLowerCase().includes(keyword),
  );
  const exact = options.some((t) => t.name === query.trim());

  function toggle(name: string) {
    onChange(
      selected.has(name)
        ? value.filter((tag) => tag !== name)
        : [...value, name],
    );
  }

  async function create() {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const tag = await api<PatientTag>("POST", "/patients/tags", {
        name,
        color: TAG_COLORS[tags.length % TAG_COLORS.length],
      });
      refreshPatientTags();
      onChange([...value, tag.name]);
      setQuery("");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-9 w-full justify-between gap-2 px-2.5 py-1.5 font-normal"
          />
        }
      >
        <span className="flex min-w-0 flex-1 flex-wrap gap-1">
          {value.length ? (
            value.map((name) => (
              <Badge
                key={name}
                variant="secondary"
                style={tagBadgeStyle(
                  tags.find((t) => t.name === name)?.color ?? DEFAULT_TAG_COLOR,
                )}
              >
                {name}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">选择标签</span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Input
          className="h-8"
          placeholder="搜索或新建标签"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (exact && !selected.has(query.trim())) toggle(query.trim());
            else if (!exact) void create();
          }}
        />
        <ScrollArea className="mt-1 max-h-56" viewportClassName="max-h-56">
          {filtered.map((tag) => (
            <button
              key={tag.name}
              type="button"
              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => toggle(tag.name)}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <span className="min-w-0 flex-1 truncate">{tag.name}</span>
              {tag.enabled ? null : (
                <span className="text-xs text-muted-foreground">已停用</span>
              )}
              {selected.has(tag.name) ? (
                <Check className="size-4 shrink-0" />
              ) : null}
            </button>
          ))}
          {!filtered.length && !query.trim() ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              还没有标签，输入名称即可新建
            </p>
          ) : null}
          {query.trim() && !exact ? (
            <button
              type="button"
              disabled={creating}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
              onClick={() => void create()}
            >
              <Plus className="size-4 shrink-0" />
              <span className="truncate">新建“{query.trim()}”</span>
            </button>
          ) : null}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
