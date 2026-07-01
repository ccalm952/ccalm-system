"use client";

import * as React from "react";
import dayjs from "dayjs";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function formatCnDate(d: Date) {
  return format(d, "yyyy年M月d日");
}

function formatCnMonth(d: Date) {
  return format(d, "yyyy年M月");
}

export type DatePickerFieldProps = {
  value: string;
  onValueChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
  /** 无外侧标签时用于触发按钮的可访问名称 */
  "aria-label"?: string;
  captionLayout?: "label" | "dropdown";
  /** `"month"` 时值为 YYYY-MM，展示为 yyyy年M月 */
  granularity?: "day" | "month";
  startMonth?: Date;
  endMonth?: Date;
};

export function DatePickerField({
  value,
  onValueChange,
  disabled,
  className,
  id,
  placeholder = "选择日期",
  captionLayout = "label",
  granularity = "day",
  startMonth,
  endMonth,
  "aria-label": ariaLabel,
}: DatePickerFieldProps) {
  const isMonth = granularity === "month";
  const selected = React.useMemo(() => {
    if (!value) return undefined;
    const d = dayjs(isMonth ? `${value}-01` : value);
    return d.isValid() ? d.toDate() : undefined;
  }, [value, isMonth]);

  const [open, setOpen] = React.useState(false);
  const isDropdown = captionLayout === "dropdown";
  const now = new Date();
  const dropdownStart = startMonth ?? (isMonth ? new Date(2020, 0) : new Date(1900, 0));
  const dropdownEnd =
    endMonth ?? (isMonth ? new Date(now.getFullYear() + 2, 11) : now);

  const calendar = (
    <Calendar
      mode="single"
      selected={selected}
      defaultMonth={selected ?? (isMonth ? now : new Date(2000, 0))}
      captionLayout={captionLayout}
      onSelect={(d) => {
        onValueChange(d ? format(d, isMonth ? "yyyy-MM" : "yyyy-MM-dd") : "");
        setOpen(false);
      }}
      locale={zhCN}
      {...(isDropdown
        ? {
            startMonth: dropdownStart,
            endMonth: dropdownEnd,
          }
        : {})}
    />
  );

  const empty = !value;
  const displayLabel = selected
    ? isMonth
      ? formatCnMonth(selected)
      : formatCnDate(selected)
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        render={
          <Button
            variant="outline"
            data-empty={empty}
            aria-label={ariaLabel}
            className={cn(
              "w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {displayLabel ?? <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0", isDropdown && "overflow-hidden")} align="start">
        {calendar}
      </PopoverContent>
    </Popover>
  );
}

export type DateRangePickerFieldProps = {
  dateFrom: string;
  dateTo: string;
  onRangeChange: (from: string, to: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
};

function stringsToRange(dateFrom: string, dateTo: string): DateRange | undefined {
  const df = dateFrom ? dayjs(dateFrom) : null;
  const dt = dateTo ? dayjs(dateTo) : null;
  if (!df?.isValid() || !dt?.isValid()) return undefined;
  return { from: df.toDate(), to: dt.toDate() };
}

export function DateRangePickerField({
  dateFrom,
  dateTo,
  onRangeChange,
  disabled,
  className,
  id,
  placeholder = "选择日期",
}: DateRangePickerFieldProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(() =>
    stringsToRange(dateFrom, dateTo),
  );

  React.useEffect(() => {
    setDate(stringsToRange(dateFrom, dateTo));
  }, [dateFrom, dateTo]);

  return (
    <Popover>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        render={
          <Button
            variant="outline"
            className={cn("w-full justify-start px-2.5 font-normal", className)}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {date?.from ? (
          date.to ? (
            <>
              {formatCnDate(date.from)}-{formatCnDate(date.to)}
            </>
          ) : (
            formatCnDate(date.from)
          )
        ) : (
          <span>{placeholder}</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={date?.from}
          selected={date}
          onSelect={(next) => {
            setDate(next);
            if (next?.from && next.to) {
              onRangeChange(format(next.from, "yyyy-MM-dd"), format(next.to, "yyyy-MM-dd"));
            }
          }}
          numberOfMonths={2}
          locale={zhCN}
        />
      </PopoverContent>
    </Popover>
  );
}
