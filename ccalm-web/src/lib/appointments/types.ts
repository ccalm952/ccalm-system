export type AppointmentStatus = "booked" | "completed" | "missed" | "cancelled";

export type AppointmentCard = {
  id: number;
  patientId: number;
  patientName: string;
  chartNo: string;
  gender: string;
  age: number | null;
  phone: string;
  visitDate: string;
  startTime: string;
  endTime: string;
  doctor: string;
  kind: string;
  status: AppointmentStatus;
  items: string[];
  isPending: boolean;
  pendingReason: string;
  remark: string;
  createdById: string | null;
};

export type BoardResponse = {
  range: { from: string; to: string };
  days: { date: string; counts: Record<string, number> }[];
  doctors: { name: string; count: number }[];
  appointments: AppointmentCard[];
};

export type AppointmentItemCategory = {
  id: number;
  name: string;
  items: { id: number; name: string; color: string }[];
};

export type AppointmentMeta = {
  workStart: string;
  workEnd: string;
  doctors: string[];
  nurses: string[];
  items: AppointmentItemCategory[];
  durations: number[];
  defaultDuration: number;
  statuses: AppointmentStatus[];
  statusLabels: Record<string, string>;
  pendingReasons: { key: string; label: string }[];
  sources: string[];
};

export type PendingRow = {
  id: number;
  patientId: number;
  patientName: string;
  chartNo: string;
  phone: string;
  visitDate: string;
  doctor: string;
  items: string[];
  pendingReason: string;
  expired: boolean;
  remark: string;
};
