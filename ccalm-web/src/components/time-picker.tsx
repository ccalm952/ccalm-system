import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function TimePicker(props: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const { id = "time-picker", label = "时间", value, onChange, className, disabled } = props;

  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="time"
        step="60"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.slice(0, 5))}
        className={cn(
          "appearance-none bg-background",
          "[&::-webkit-calendar-picker-indicator]:hidden",
          "[&::-webkit-calendar-picker-indicator]:appearance-none",
        )}
      />
    </Field>
  );
}
