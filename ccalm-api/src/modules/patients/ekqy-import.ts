export type EkqyToothEntry = {
  fdiToothCodes?: string;
  description?: string;
  diagnose?: string;
  cure?: string;
  planContent?: string;
};

export type EkqyFullRecord = {
  id: number;
  firstVisit?: boolean;
  appointDateTime?: string;
  doctorName?: string;
  nurseName?: string;
  chiefComplaint?: string;
  history?: string;
  pastHistory?: string;
  advice?: string;
  comment?: string;
  oralCheckRecordList?: EkqyToothEntry[];
  diagnoseRecordList?: EkqyToothEntry[];
  cureRecordList?: EkqyToothEntry[];
  treatmentPlanList?: EkqyToothEntry[];
};

export type EkqySummary = {
  medicalRecordId: number;
  firstVisit?: boolean;
  title?: string;
  startTime?: string;
};

export type EkqyPayment = {
  amount?: number;
  payType?: string;
};

export type EkqyOrderDetail = {
  chargeType?: string;
  price?: number;
  actualPrice?: number;
};

export type EkqyOrder = {
  id: number;
  actualPrice?: number;
  planPrice?: number;
  payDateTime?: string;
  recordCreatedTime?: string;
  doctorName?: string;
  payee?: string;
  chargeOrderSimpleDetailList?: EkqyOrderDetail[];
  paymentList?: EkqyPayment[];
};

export type EkqyPatientInfo = {
  name?: string;
  privateId?: string;
  mobile?: string;
  patientMobile?: string;
  phoneNumber1?: string;
  phone?: string;
  sex?: number;
  birth?: string;
};

function asText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

export function clean(value: unknown): string {
  return asText(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function teeth(value: unknown): string {
  return asText(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(",");
}

export function toothSet(value: unknown): Set<number> {
  return new Set(teeth(value).split(",").filter(Boolean).map(Number));
}

export function entries(
  list: EkqyToothEntry[] | undefined,
  textKey: "description" | "diagnose" | "cure",
): { teeth: string; text: string }[] {
  return (list ?? []).map((item) => ({
    teeth: teeth(item.fdiToothCodes),
    text: clean(item[textKey]),
  }));
}

export function visitInfo(
  full: EkqyFullRecord,
  summaryById: Map<number, EkqySummary>,
): { date: string; time: string } {
  const iso =
    full.appointDateTime ||
    summaryById.get(full.id)?.startTime ||
    new Date().toISOString();
  const date = String(iso).slice(0, 10);
  const time = String(iso).slice(11, 16);
  return { date, time: time === "00:00" ? "" : time };
}

export function recordType(
  full: EkqyFullRecord,
  summaryById: Map<number, EkqySummary>,
): "first" | "return" | "orthoFirst" | "orthoReturn" {
  const summary = summaryById.get(full.id);
  const isFirst = Boolean(full.firstVisit || summary?.firstVisit);
  const ortho = /正畸|矫治|矫正/.test(
    `${summary?.title ?? ""} ${(full.treatmentPlanList ?? [])
      .map((x) => x.planContent)
      .join(" ")}`,
  );
  if (isFirst) return ortho ? "orthoFirst" : "first";
  return ortho ? "orthoReturn" : "return";
}

export function pickInitialFull(
  all: EkqyFullRecord[],
  summaryById: Map<number, EkqySummary>,
): EkqyFullRecord | undefined {
  return all.find((r) => {
    if (r.firstVisit) return true;
    const summary = summaryById.get(r.id);
    return summary?.firstVisit || String(summary?.title ?? "").includes("初诊");
  });
}
