import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { tagBadgeStyle, type PatientTag } from "@/lib/patients/tags";

export function PatientTagBadge({
  name,
  tags,
  compact = false,
}: {
  name: string;
  tags: PatientTag[];
  compact?: boolean;
}) {
  const tag = tags.find((t) => t.name === name);
  const color = tag?.color;
  const label = compact ? tag?.abbreviation || name : name;
  const badge = (
    <Badge variant="secondary" style={color ? tagBadgeStyle(color) : undefined}>
      {label}
    </Badge>
  );
  if (label === name) return badge;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        {badge}
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
}
