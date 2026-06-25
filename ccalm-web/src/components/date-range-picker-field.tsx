"use client";

import * as React from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DateRangeValue = {
  from: string;
  to: string;
};

type DateRangePickerFieldProps = {
  value: DateRangeValue;
  onValueChange: (value: DateRangeValue) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
};

function toSelectedRange(value: DateRangeValue): DateRange | undefined {
  const from = value.from ? new Date(`${value.from}T00:00:00`) : undefined;
  const to = value.to ? new Date(`${value.to}T00:00:00`) : undefined;
  if (!from && !to) return undefined;
  return { from, to };
}

function formatRangeLabel(value: DateRangeValue): string {
  const from = value.from ? new Date(`${value.from}T00:00:00`) : undefined;
  const to = value.to ? new Date(`${value.to}T00:00:00`) : undefined;
  if (from && to) {
    return `${format(from, "yyyy年M月d日", { locale: zhCN })} - ${format(to, "yyyy年M月d日", { locale: zhCN })}`;
  }
  if (from) return format(from, "yyyy年M月d日", { locale: zhCN });
  return "";
}

export function DateRangePickerField({
  value,
  onValueChange,
  className,
  disabled,
  placeholder = "选择日期范围",
}: DateRangePickerFieldProps) {
  const [open, setOpen] = React.useState(false);
  const selected = React.useMemo(() => toSelectedRange(value), [value]);
  const label = formatRangeLabel(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            variant="outline"
            data-empty={!label}
            className={cn(
              "w-[280px] justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {label ? <span>{label}</span> : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={selected?.from ?? selected?.to ?? new Date()}
          selected={selected}
          numberOfMonths={2}
          locale={zhCN}
          onSelect={(range) => {
            onValueChange({
              from: range?.from ? format(range.from, "yyyy-MM-dd") : "",
              to: range?.to ? format(range.to, "yyyy-MM-dd") : "",
            });
            if (range?.from && range?.to) {
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
