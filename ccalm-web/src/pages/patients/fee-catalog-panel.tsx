import * as React from "react";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/charges/charge-calc";
import type { FeeCategory, FeeItem } from "@/lib/fee-catalog/types";

const ALL = "all";

export function FeeCatalogPanel({
  categories,
  onPick,
}: {
  categories: FeeCategory[];
  onPick: (item: FeeItem) => void;
}) {
  const [filter, setFilter] = React.useState(ALL);
  const filterItems = [
    { value: ALL, label: "全部" },
    ...categories.map((c) => ({ value: String(c.id), label: c.name })),
  ];
  const shown =
    filter === ALL
      ? categories
      : categories.filter((c) => String(c.id) === filter);

  return (
    <Card className="lg:sticky lg:top-20 lg:h-[calc(100svh-6.5rem)]">
      <CardHeader>
        <CardTitle>收费项目</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        <Select
          items={filterItems}
          value={filter}
          onValueChange={(v: string | null) => {
            if (v) setFilter(v);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {filterItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-1">
            {shown.map((c) => (
              <Collapsible key={c.id} defaultOpen>
                <CollapsibleTrigger
                  render={
                    <Button
                      variant="ghost"
                      className="group w-full justify-start"
                    />
                  }
                >
                  <ChevronRight className="transition-transform group-data-[panel-open]:rotate-90" />
                  {c.name}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-col gap-1 py-1 pl-6">
                    {c.items.length ? (
                      c.items.map((item) => (
                        <Button
                          key={item.id}
                          type="button"
                          variant="ghost"
                          className="w-full justify-between"
                          onClick={() => onPick(item)}
                        >
                          <span className="truncate">{item.name}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {formatMoney(item.price)}
                          </span>
                        </Button>
                      ))
                    ) : (
                      <span className="px-2.5 py-1 text-muted-foreground">
                        暂无项目
                      </span>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
