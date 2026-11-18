import fs from "node:fs/promises";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const ROOT = "C:/Users/ccalm/Desktop/ccalm-system";
const RAW_FILE = `${ROOT}/scripts/ekqy/.raw.json`;

function readEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = readEnv(await fs.readFile(`${ROOT}/ccalm-api/.env`, "utf8"));
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

const raw = JSON.parse(await fs.readFile(RAW_FILE, "utf8"));
if (!raw.patientId) throw new Error("raw data has no patientId");

const clean = (value) =>
  String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/g, " ")
    .trim();

const teeth = (value) =>
  String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(",");

const toothSet = (value) =>
  new Set(
    teeth(value)
      .split(",")
      .filter(Boolean)
      .map(Number),
  );

const entries = (list, textKey) =>
  (list ?? []).map((item) => ({
    teeth: teeth(item.fdiToothCodes),
    text: clean(item[textKey]),
  }));

const summaryById = new Map(
  (raw.summaries ?? []).map((item) => [item.medicalRecordId, item]),
);
const fullById = new Map((raw.fulls ?? []).map((item) => [item.id, item]));
const all = [...fullById.values()].sort((a, b) =>
  String(a.appointDateTime).localeCompare(String(b.appointDateTime)),
);

if (!all.length) throw new Error("no medical records scraped");

const info = raw.patient ?? {};
const chartNo = info.privateId || `EKQY-${raw.patientId}`;
const phone =
  info.mobile || info.patientMobile || info.phoneNumber1 || info.phone || "";
const gender = info.sex === 1 ? "男" : info.sex === 2 ? "女" : "";
const birthday = info.birth ? String(info.birth).slice(0, 10) : null;

let patient = await prisma.patient.findFirst({ where: { chartNo } });
if (!patient) {
  const sameName = await prisma.patient.findMany({
    where: { name: info.name || raw.name },
  });
  patient =
    sameName.find((item) => !item.chartNo) ??
    (sameName.length === 1 ? sameName[0] : null);
}
if (!patient) {
  patient = await prisma.patient.create({
    data: {
      name: info.name || raw.name,
      phone,
      chartNo,
      gender,
      birthday,
      remark: "imported from e看牙",
    },
  });
} else {
  patient = await prisma.patient.update({
    where: { id: patient.id },
    data: {
      chartNo: patient.chartNo || chartNo,
      phone: phone || patient.phone,
      gender: gender || patient.gender,
    },
  });
}
await prisma.chargeOrder.deleteMany({ where: { patientId: patient.id } });
await prisma.medicalRecord.deleteMany({ where: { patientId: patient.id } });

const initialFull = all.find((r) => {
  if (r.firstVisit) return true;
  const summary = summaryById.get(r.id);
  return summary?.firstVisit || String(summary?.title ?? "").includes("初诊");
});
if (!initialFull) throw new Error("no initial medical record found");

function visitInfo(full) {
  const iso =
    full.appointDateTime ||
    summaryById.get(full.id)?.startTime ||
    new Date().toISOString();
  const date = String(iso).slice(0, 10);
  const time = String(iso).slice(11, 16);
  return { date, time: time === "00:00" ? "" : time };
}

async function ensureVisit(full, isFirst) {
  const { date, time } = visitInfo(full);
  const doctor = full.doctorName || "";
  const kind = isFirst ? "first" : "return";
  const existing = await prisma.patientVisit.findFirst({
    where: { patientId: patient.id, visitDate: date, startTime: time },
  });
  if (existing) {
    return prisma.patientVisit.update({
      where: { id: existing.id },
      data: {
        kind,
        status: "completed",
        doctor: doctor || existing.doctor,
        endTime: time || existing.endTime,
        source: existing.source === "manual" ? existing.source : "record",
      },
    });
  }
  if (time) {
    const slot = await prisma.patientVisit.findFirst({
      where: {
        patientId: patient.id,
        visitDate: date,
        startTime: "",
        medicalRecords: { none: {} },
      },
    });
    if (slot) {
      return prisma.patientVisit.update({
        where: { id: slot.id },
        data: {
          startTime: time,
          endTime: time,
          kind,
          status: "completed",
          doctor: doctor || slot.doctor,
          source: "record",
        },
      });
    }
  }
  return prisma.patientVisit.create({
    data: {
      patientId: patient.id,
      visitDate: date,
      startTime: time,
      endTime: time,
      kind,
      status: "completed",
      doctor,
      source: "record",
      remark: "imported from e看牙",
    },
  });
}
function recordType(full) {
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

const createdRecords = [];
for (const full of all) {
  const type = recordType(full);
  const isFirst = type === "first" || type === "orthoFirst";
  const visit = await ensureVisit(full, isFirst);
  const { date, time } = visitInfo(full);

  const record = await prisma.medicalRecord.create({
    data: {
      patientId: patient.id,
      visitId: visit.id,
      type,
      visitDate: date,
      visitTime: time,
      doctor: full.doctorName || visit.doctor || "",
      nurse: full.nurseName || "",
      chiefComplaint: clean(full.chiefComplaint),
      presentIllness: clean(full.history),
      pastHistory: clean(full.pastHistory),
      oralExam: entries(full.oralCheckRecordList, "description"),
      diagnosis: entries(full.diagnoseRecordList, "diagnose"),
      treatment: entries(full.cureRecordList, "cure"),
      advice: clean(full.advice),
      remark: clean(full.comment),
      planItems: isFirst
        ? {
            create: (full.treatmentPlanList ?? []).map((item, index) => ({
              sort: index,
              teeth: teeth(item.fdiToothCodes),
              text: clean(item.planContent),
            })),
          }
        : undefined,
    },
    include: { planItems: true },
  });
  createdRecords.push({ full, record, type, visit });
}

const initialEntry = createdRecords.find(
  (item) => item.type === "first" || item.type === "orthoFirst",
);

if (initialEntry?.record.planItems.length) {
  for (const item of createdRecords) {
    if (item === initialEntry) continue;
    const cureTeeth = new Set(
      (item.full.cureRecordList ?? []).flatMap((c) => [...toothSet(c.fdiToothCodes)]),
    );
    for (const plan of initialEntry.record.planItems) {
      const planTeeth = toothSet(plan.teeth);
      const sameTooth = [...planTeeth].some((n) => cureTeeth.has(n));
      const sameText =
        plan.text.length > 3 &&
        (item.full.cureRecordList ?? []).some((c) =>
          clean(c.cure).includes(plan.text.slice(0, 8)),
        );
      if (!sameTooth && !sameText) continue;
      await prisma.planItemFollowUp.create({
        data: {
          recordId: item.record.id,
          planItemId: plan.id,
          completes: false,
        },
      });
    }
  }
}

if (initialEntry?.record.planItems.length) {
  for (const item of createdRecords) {
    if (item === initialEntry) continue;
    const count = await prisma.planItemFollowUp.count({
      where: { recordId: item.record.id },
    });
    if (count === 0) {
      await prisma.planItemFollowUp.create({
        data: {
          recordId: item.record.id,
          planItemId: initialEntry.record.planItems[0].id,
          completes: false,
        },
      });
    }
  }
}

const orders = [
  ...new Map((raw.orders ?? []).map((order) => [order.id, order])).values(),
];
const total = orders.reduce(
  (sum, order) => sum + Number(order.actualPrice ?? order.planPrice ?? 0),
  0,
);
if (initialEntry && total > 0) {
  const items = orders.flatMap((order) =>
    (order.chargeOrderSimpleDetailList ?? []).map((detail) => ({
      name: detail.chargeType || "收费",
      teeth: "",
      unitPrice: Number(detail.price ?? detail.actualPrice ?? 0),
      quantity: 1,
      amount: Number(detail.actualPrice ?? detail.price ?? 0),
    })),
  );
  if (!items.length) {
    items.push({
      name: "治疗费",
      teeth: "",
      unitPrice: total,
      quantity: 1,
      amount: total,
    });
  }

  const visits = await prisma.patientVisit.findMany({
    where: { patientId: patient.id },
  });
  const payments = orders.flatMap((order) =>
    (order.paymentList ?? []).map((payment) => {
      const paidAt = String(
        order.payDateTime || order.recordCreatedTime || "",
      ).slice(0, 10);
      const visit =
        visits.find((v) => v.visitDate === paidAt) ?? initialEntry.visit;
      return {
        amount: Number(payment.amount ?? 0),
        method: payment.payType || "",
        paidAt: paidAt || initialEntry.record.visitDate,
        visitId: visit?.id ?? null,
      };
    }),
  );

  await prisma.chargeOrder.create({
    data: {
      patientId: patient.id,
      visitId: initialEntry.visit.id,
      isCourse: true,
      chargeDate: initialEntry.record.visitDate,
      doctor: initialEntry.record.doctor,
      receivable: total,
      items: { create: items },
      payments: { create: payments.filter((p) => p.amount > 0) },
    },
  });
}

console.log(
  JSON.stringify(
    {
      patientId: patient.id,
      chartNo,
      records: createdRecords.length,
      planItems: createdRecords.reduce(
        (n, r) => n + r.record.planItems.length,
        0,
      ),
      charges: total,
      payments: orders.reduce((n, o) => n + (o.paymentList?.length ?? 0), 0),
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
