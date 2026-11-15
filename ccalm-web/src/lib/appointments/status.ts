import type { AppointmentCard } from "./types";

export type CardTone = {
  label: string;
  bar: string;
  bg: string;
  /** 到店小圆点 */
  dot?: string;
};

export const APPOINTMENT_TONES: Record<string, CardTone> = {
  pending: { label: "待定", bar: "#EC4899", bg: "#FDF2F8" },
  booked: { label: "预约", bar: "#F2B705", bg: "#FFFBEB" },
  completed: { label: "治疗完成", bar: "#17A34A", bg: "#F0FDF4" },
  missed: { label: "已失约", bar: "#64748B", bg: "#F1F5F9" },
  cancelled: { label: "已取消", bar: "#94A3B8", bg: "#F8FAFC" },
};

export function toneOf(
  card: Pick<AppointmentCard, "status" | "isPending">,
): CardTone {
  return (
    (card.isPending
      ? APPOINTMENT_TONES.pending
      : APPOINTMENT_TONES[card.status]) ?? APPOINTMENT_TONES.booked
  );
}

/** 图例顺序 */
export const LEGEND_KEYS = [
  "pending",
  "booked",
  "completed",
  "missed",
  "cancelled",
] as const;
