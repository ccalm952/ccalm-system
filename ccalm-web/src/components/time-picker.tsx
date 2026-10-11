import { Input } from "@/components/ui/input";
import { cn } from "cn";

export function TimePicker(props: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const { value, onChange, className, disabled } = props;

  return (
    <Input
      type="time"
      step="60"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value.slice(0, 5))}
      className={cn(
        "field-sizing-content w-auto shrink-0 appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
        className,
      )}
    />
  );
}
