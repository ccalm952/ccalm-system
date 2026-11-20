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

export function isInitialRecordType(
  type: string,
): type is "first" | "orthoFirst" {
  return type === "first" || type === "orthoFirst";
}

export function isReturnRecordType(
  type: string,
): type is "return" | "orthoReturn" {
  return type === "return" || type === "orthoReturn";
}

export type EkqyPlanItemRef = { id: number; teeth: string; text: string };

export type EkqyLinkableRecord = {
  type: string;
  visitDate: string;
  full: EkqyFullRecord;
  planItems: EkqyPlanItemRef[];
};

/** 复诊挂到「日期 ≤ 自己」的最近一次初诊（多疗程） */
export function pickCourseInitial<
  T extends { type: string; visitDate: string },
>(returnItem: T, initials: T[]): T | undefined {
  const eligible = initials.filter(
    (item) =>
      isInitialRecordType(item.type) && item.visitDate <= returnItem.visitDate,
  );
  return (
    eligible.at(-1) ??
    initials.filter((i) => isInitialRecordType(i.type)).at(-1)
  );
}

const ORTHO_PLAN_RE = /正畸|矫正|矫治/;
const ORTHO_CURE_RE = /正畸|矫正|矫治|弹力|托槽|弓丝|中线|斜拉|牵引|调颌|调合/;

function scorePlanForCure(
  plan: EkqyPlanItemRef,
  cureTeeth: Set<number>,
  cureText: string,
): number {
  const planTeeth = toothSet(plan.teeth);
  const inter = [...planTeeth].filter((n) => cureTeeth.has(n)).length;
  const specificity = planTeeth.size ? inter / planTeeth.size : 0;
  const orthoPlan = ORTHO_PLAN_RE.test(plan.text);
  const orthoCure = ORTHO_CURE_RE.test(cureText);
  const sameText =
    plan.text.length > 3 && cureText.includes(plan.text.slice(0, 8));

  let score = 0;
  if (sameText) score += 100;
  // 普通计划：重叠牙位占该计划一半以上；正畸处置不因牙位沾边挂到充填/治疗
  if (!orthoPlan && inter > 0 && specificity >= 0.5) {
    score += orthoCure ? 5 : 40 + specificity * 30;
  }
  if (orthoPlan && (inter > 0 || cureTeeth.size === 0 || orthoCure)) {
    score += 20;
    if (orthoCure) score += 50;
  }
  return score;
}

/**
 * 每条复诊只挂一行计划（总分最高），避免同一天在多行下重复展开。
 * 同分时优先非正畸计划、再取更小 id。
 */
export function matchPlanItemsForReturn(
  full: EkqyFullRecord,
  planItems: EkqyPlanItemRef[],
): EkqyPlanItemRef[] {
  if (!planItems.length) return [];
  const cures = full.cureRecordList ?? [];
  if (!cures.length) return [planItems[0]];

  let best: {
    plan: EkqyPlanItemRef;
    score: number;
    ortho: boolean;
  } | null = null;
  for (const plan of planItems) {
    let total = 0;
    for (const cure of cures) {
      total += scorePlanForCure(
        plan,
        toothSet(cure.fdiToothCodes),
        clean(cure.cure),
      );
    }
    if (total <= 0) continue;
    const ortho = ORTHO_PLAN_RE.test(plan.text);
    if (
      !best ||
      total > best.score ||
      (total === best.score && best.ortho && !ortho) ||
      (total === best.score && ortho === best.ortho && plan.id < best.plan.id)
    ) {
      best = { plan, score: total, ortho };
    }
  }
  return [best?.plan ?? planItems[0]];
}

/** 生成复诊 → 计划行关联；初诊之间不互挂 */
export function buildPlanFollowUps(
  records: EkqyLinkableRecord[],
): { recordIndex: number; planItemId: number }[] {
  const initials = records
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => isInitialRecordType(item.type))
    .sort((a, b) => a.item.visitDate.localeCompare(b.item.visitDate));

  const out: { recordIndex: number; planItemId: number }[] = [];
  records.forEach((item, recordIndex) => {
    if (!isReturnRecordType(item.type)) return;
    const course = pickCourseInitial(
      item,
      initials.map((x) => x.item),
    );
    if (!course?.planItems.length) return;
    const plans = matchPlanItemsForReturn(item.full, course.planItems);
    for (const plan of plans) {
      out.push({ recordIndex, planItemId: plan.id });
    }
  });
  return out;
}

export type EkqyVisitCandidate = {
  id: number;
  visitDate: string;
  startTime: string;
  hasRecords: boolean;
  hasAppointment: boolean;
};

/**
 * 导入就诊复用优先级：
 * 1. 同日无病历的预约就诊（待写时间常与 e看牙不完全一致）
 * 2. 同日无病历且开始时间为空
 * 3. 同日同时刻
 * 4. 同日其它无病历就诊
 */
export function pickReusableVisit(
  candidates: EkqyVisitCandidate[],
  date: string,
  time: string,
): EkqyVisitCandidate | undefined {
  const sameDay = candidates.filter((v) => v.visitDate === date);
  const open = sameDay.filter((v) => !v.hasRecords);

  const withAppt = open.find((v) => v.hasAppointment);
  if (withAppt) return withAppt;

  const emptyTime = open.find((v) => !v.startTime);
  if (emptyTime) return emptyTime;

  const exact = sameDay.find((v) => v.startTime === time);
  if (exact) return exact;

  return open[0];
}
