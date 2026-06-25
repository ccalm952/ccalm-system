import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function SortableTableHead<T extends string>({
  label,
  sortKey,
  activeSort,
  onSort,
  className,
  align = "left",
}: {
  label: string;
  sortKey: T;
  activeSort: { key: T; dir: "asc" | "desc" } | null;
  onSort: (key: T) => void;
  className?: string;
  align?: "left" | "center";
}) {
  const active = activeSort?.key === sortKey;
  const dir = active ? activeSort.dir : null;

  return (
    <TableHead className={className}>
      <button
        type="button"
        className={cn(
          "inline-flex w-full items-center gap-1 font-medium hover:text-foreground",
          align === "center" ? "justify-center" : "justify-start",
        )}
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        {dir === "asc" ? (
          <ArrowUpIcon className="size-3.5 shrink-0" />
        ) : dir === "desc" ? (
          <ArrowDownIcon className="size-3.5 shrink-0" />
        ) : (
          <ArrowUpDownIcon className="size-3.5 shrink-0 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}
