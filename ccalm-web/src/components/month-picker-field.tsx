"use client";

import * as React from "react";
import dayjs from "dayjs";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type MonthPickerFieldProps = {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
};

export function MonthPickerField({
  value,
  onValueChange,
  className,
  disabled,
  placeholder = "选择月份",
}: MonthPickerFieldProps) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => {
    if (!value) return undefined;
    const d = dayjs(`${value}-01`, "YYYY-MM-DD", true);
    return d.isValid() ? d.toDate() : undefined;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            variant="outline"
            data-empty={!value}
            className={cn(
              "w-[160px] justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {selected ? format(selected, "yyyy年M月", { locale: zhCN }) : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? new Date()}
          captionLayout="dropdown"
          locale={zhCN}
          startMonth={new Date(2020, 0)}
          endMonth={dayjs().add(2, "year").toDate()}
          onSelect={(date) => {
            if (!date) return;
            onValueChange(format(date, "yyyy-MM"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
