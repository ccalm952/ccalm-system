import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function TimePicker(props: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const {
    id = "time-picker",
    label = "时间",
    value,
    onChange,
    className = "w-32",
    disabled,
  } = props;

  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        type="time"
        id={id}
        step="60"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.slice(0, 5))}
        className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
      />
    </Field>
  );
}
