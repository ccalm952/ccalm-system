import fs from "node:fs/promises";

const ROOT = "C:/Users/ccalm/Desktop/ccalm-system";
const NAME_FILE = `${ROOT}/scripts/ekqy/.name.txt`;
const RAW_FILE = `${ROOT}/scripts/ekqy/.raw.json`;
const MAP_FILE = `${ROOT}/scripts/ekqy/production-patients.json`;

const name = (await fs.readFile(NAME_FILE, "utf8"))
  .replace(/^\uFEFF/, "")
  .trim();
const raw = JSON.parse(await fs.readFile(RAW_FILE, "utf8"));
const map = JSON.parse(await fs.readFile(MAP_FILE, "utf8"));
const patientId = map[name];
if (!patientId) throw new Error(`no production patient mapping for ${name}`);

const task = await taskSpace("CCALM待写病历");
const page = (await task.pages())[0];
const production = await page.evaluate(async (id) => {
  const token = localStorage.getItem("auth:token");
  const h = { Authorization: `Bearer ${token}` };
  const [records, charges] = await Promise.all([
    fetch(`/api/medical-records?patientId=${id}`, { headers: h }).then((r) =>
      r.json(),
    ),
    fetch(`/api/charges?patientId=${id}`, { headers: h }).then((r) => r.json()),
  ]);
  return { records, charges };
}, patientId);

const clean = (value) =>
  String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const teethKey = (value) =>
  String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .sort((a, b) => Number(a) - Number(b))
    .join(",");

const entryKey = (entry) => `${teethKey(entry.teeth)}|${clean(entry.text)}`;

const eRecords = [
  ...new Map((raw.fulls ?? []).map((item) => [item.id, item])).values(),
].map((r) => ({
  date: String(r.appointDateTime).slice(0, 10),
  time: String(r.appointDateTime).slice(11, 16),
  doctor: r.doctorName || "",
  type: r.firstVisit ? "first" : "return",
  treatment: (r.cureRecordList ?? []).map((x) => ({
    teeth: x.fdiToothCodes,
    text: x.cure,
  })),
  plan: (r.treatmentPlanList ?? []).map((x) => ({
    teeth: x.fdiToothCodes,
    text: x.planContent,
  })),
}));

const latestInitial = eRecords
  .filter((r) => r.type === "first")
  .sort((a, b) => a.date.localeCompare(b.date))
  .at(-1)?.date;
const scopedRecords = latestInitial
  ? eRecords.filter((r) => r.date >= latestInitial)
  : eRecords;

const pRecords = (production.records ?? []).map((r) => ({
  date: r.visitDate,
  time: r.visitTime,
  doctor: r.doctor,
  type: r.type === "orthoFirst" ? "first" : r.type === "orthoReturn" ? "return" : r.type,
  treatment: r.treatment ?? [],
  plan: r.treatmentPlan ?? [],
  links: r.planLinks?.length ?? 0,
}));

const problems = [];
const eByDate = new Map();
for (const r of scopedRecords) {
  const list = eByDate.get(r.date) ?? [];
  list.push(r);
  eByDate.set(r.date, list);
}
const pByDate = new Map();
for (const r of pRecords) {
  const list = pByDate.get(r.date) ?? [];
  list.push(r);
  pByDate.set(r.date, list);
}

for (const date of [...new Set([...eByDate.keys(), ...pByDate.keys()])].sort()) {
  const eList = [...(eByDate.get(date) ?? [])];
  const pList = [...(pByDate.get(date) ?? [])];
  if (!eList.length) {
    problems.push(`${date} 生产端多出 ${pList.length} 条病历`);
    continue;
  }
  if (!pList.length) {
    problems.push(`${date} 生产端缺少 ${eList.length} 条病历`);
    continue;
  }
  const used = new Set();
  for (const e of eList) {
    let index = pList.findIndex(
      (p, i) => !used.has(i) && p.time === e.time && p.type === e.type,
    );
    if (index < 0) {
      index = pList.findIndex((p, i) => !used.has(i) && p.time === e.time);
    }
    const pick = index >= 0 ? index : pList.findIndex((_, i) => !used.has(i));
    if (pick < 0) {
      problems.push(`${date} ${e.time} 生产端缺病历`);
      continue;
    }
    used.add(pick);
    const p = pList[pick];
    if (p.doctor !== e.doctor) {
      problems.push(`${date} 医生：e看牙 ${e.doctor} / 生产 ${p.doctor}`);
    }
    const eTreat = e.treatment.map(entryKey).sort();
    const pTreat = p.treatment.map(entryKey).sort();
    if (JSON.stringify(eTreat) !== JSON.stringify(pTreat)) {
      problems.push(
        `${date} 处置不一致：\n  e看牙 ${JSON.stringify(eTreat)}\n  生产 ${JSON.stringify(pTreat)}`,
      );
    }
    if (e.plan.length) {
      const ePlan = e.plan.map(entryKey).sort();
      const pPlan = p.plan.map(entryKey).sort();
      if (JSON.stringify(ePlan) !== JSON.stringify(pPlan)) {
        problems.push(
          `${date} 治疗计划不一致：\n  e看牙 ${JSON.stringify(ePlan)}\n  生产 ${JSON.stringify(pPlan)}`,
        );
      }
    }
    if (e.type === "return" && p.links === 0) {
      problems.push(`${date} 复诊没有关联治疗计划`);
    }
  }
  for (let i = 0; i < pList.length; i++) {
    if (!used.has(i)) problems.push(`${date} 生产端多出病历 ${pList[i].time}`);
  }
}

const eOrders = [
  ...new Map((raw.orders ?? []).map((order) => [order.id, order])).values(),
].filter((order) => {
  if (!latestInitial) return true;
  const date = String(
    order.payDateTime || order.recordCreatedTime || "",
  ).slice(0, 10);
  return !date || date >= latestInitial;
});const eTotal = eOrders.reduce(
  (sum, order) => sum + Number(order.actualPrice ?? order.planPrice ?? 0),
  0,
);
const pOrders = production.charges?.orders ?? [];
const pTotal = pOrders.reduce((sum, order) => sum + Number(order.receivable), 0);
if (Number(eTotal.toFixed(2)) !== Number(pTotal.toFixed(2))) {
  problems.push(`收费总额：e看牙 ${eTotal} / 生产 ${pTotal}`);
}
const ePaid = eOrders.reduce(
  (sum, order) =>
    sum +
    (order.paymentList ?? []).reduce(
      (inner, payment) => inner + Number(payment.amount ?? 0),
      0,
    ),
  0,
);
const pPaid = pOrders.reduce((sum, order) => sum + Number(order.paid), 0);
if (Number(ePaid.toFixed(2)) !== Number(pPaid.toFixed(2))) {
  problems.push(`实收总额：e看牙 ${ePaid} / 生产 ${pPaid}`);
}

console.log(
  JSON.stringify(
    {
      patient: name,
      productionPatientId: patientId,
      eRecords: eRecords.length,
      productionRecords: pRecords.length,
      eTotal,
      pTotal,
      ePaid,
      pPaid,
      problems,
      ok: problems.length === 0,
    },
    null,
    2,
  ),
);
