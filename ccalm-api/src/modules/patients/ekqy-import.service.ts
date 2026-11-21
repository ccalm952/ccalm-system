import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

import type { EkqyImportDto } from "./dto/ekqy-import.dto";
import { fromMinutes, toMinutes } from "../appointments/appointment-options";
import {
  buildPlanFollowUps,
  clean,
  entries,
  type EkqyFullRecord,
  type EkqyOrder,
  type EkqyPatientInfo,
  type EkqySummary,
  isInitialRecordType,
  pickInitialFull,
  pickReusableVisit,
  recordType,
  teeth,
  visitInfo,
} from "./ekqy-import";

/** 与写病历建预约一致：有开始时间则默认 30 分钟时长 */
function defaultEndTime(startTime: string): string {
  if (!startTime) return "";
  return fromMinutes(toMinutes(startTime) + 30);
}

function resolveEndTime(startTime: string, endTime: string): string {
  if (!startTime) return endTime || "";
  if (
    !endTime ||
    endTime === startTime ||
    toMinutes(endTime) <= toMinutes(startTime)
  ) {
    return defaultEndTime(startTime);
  }
  return endTime;
}

type ImportResult = {
  dryRun: boolean;
  patientId: number | null;
  chartNo: string;
  matchedBy: "chartNo" | "name" | "create";
  existingRecords: number;
  existingCharges: number;
  records: number;
  planItems: number;
  charges: number;
  payments: number;
};

@Injectable()
export class EkqyImportService {
  constructor(private readonly prisma: PrismaService) {}

  async import(dto: EkqyImportDto): Promise<ImportResult> {
    const rawPatient = (dto.patient ?? {}) as EkqyPatientInfo;
    const summaries = (
      Array.isArray(dto.summaries) ? dto.summaries : []
    ) as EkqySummary[];
    const fulls = (
      Array.isArray(dto.fulls) ? dto.fulls : []
    ) as EkqyFullRecord[];
    const ordersRaw = (
      Array.isArray(dto.orders) ? dto.orders : []
    ) as EkqyOrder[];

    const summaryById = new Map(
      summaries.map((item) => [item.medicalRecordId, item]),
    );
    const fullById = new Map(fulls.map((item) => [item.id, item]));
    const all = [...fullById.values()].sort((a, b) =>
      String(a.appointDateTime).localeCompare(String(b.appointDateTime)),
    );
    if (!all.length) {
      throw new BadRequestException("抓取数据中没有病历");
    }
    if (!pickInitialFull(all, summaryById)) {
      throw new BadRequestException("抓取数据中没有初诊病历");
    }

    const chartNo = (
      dto.chartNo?.trim() ||
      rawPatient.privateId ||
      `EKQY-${dto.patientId}`
    ).trim();
    const phone =
      rawPatient.mobile ||
      rawPatient.patientMobile ||
      rawPatient.phoneNumber1 ||
      rawPatient.phone ||
      "";
    const gender =
      rawPatient.sex === 1 ? "男" : rawPatient.sex === 2 ? "女" : "";
    const birthday = rawPatient.birth
      ? String(rawPatient.birth).slice(0, 10)
      : null;
    const name = rawPatient.name || dto.name;

    let patient = await this.prisma.patient.findFirst({ where: { chartNo } });
    let matchedBy: ImportResult["matchedBy"] = "chartNo";
    if (!patient) {
      const sameName = await this.prisma.patient.findMany({ where: { name } });
      patient =
        sameName.find((item) => !item.chartNo) ??
        (sameName.length === 1 ? sameName[0] : null);
      matchedBy = patient ? "name" : "create";
    }

    const existingRecords = patient
      ? await this.prisma.medicalRecord.count({
          where: { patientId: patient.id },
        })
      : 0;
    const existingCharges = patient
      ? await this.prisma.chargeOrder.count({
          where: { patientId: patient.id },
        })
      : 0;

    const orders = [
      ...new Map(ordersRaw.map((order) => [order.id, order])).values(),
    ];
    const total = orders.reduce(
      (sum, order) => sum + Number(order.actualPrice ?? order.planPrice ?? 0),
      0,
    );
    const payments = orders.reduce(
      (n, o) => n + (o.paymentList?.length ?? 0),
      0,
    );
    const planItemsPreview = all.reduce((n, full) => {
      const type = recordType(full, summaryById);
      if (type !== "first" && type !== "orthoFirst") return n;
      return n + (full.treatmentPlanList?.length ?? 0);
    }, 0);

    if (dto.dryRun) {
      return {
        dryRun: true,
        patientId: patient?.id ?? null,
        chartNo,
        matchedBy,
        existingRecords,
        existingCharges,
        records: all.length,
        planItems: planItemsPreview,
        charges: total,
        payments,
      };
    }

    return this.prisma.$transaction(async (tx) => {
      let target = patient;
      if (!target) {
        target = await tx.patient.create({
          data: {
            name,
            phone,
            chartNo,
            gender,
            birthday,
            remark: "从e看牙导入",
          },
        });
        matchedBy = "create";
      } else {
        target = await tx.patient.update({
          where: { id: target.id },
          data: {
            chartNo: target.chartNo || chartNo,
            phone: phone || target.phone,
            gender: gender || target.gender,
            birthday: birthday || target.birthday,
          },
        });
      }

      await tx.chargeOrder.deleteMany({ where: { patientId: target.id } });
      await tx.medicalRecord.deleteMany({ where: { patientId: target.id } });

      async function ensureAppointmentForVisit(visit: {
        id: number;
        visitDate: string;
        startTime: string;
        endTime: string;
        kind: string;
        doctor: string;
      }) {
        const existing = await tx.appointment.findUnique({
          where: { visitId: visit.id },
        });
        if (existing) {
          await tx.appointment.update({
            where: { id: existing.id },
            data: {
              status: "completed",
              doctor: visit.doctor || existing.doctor,
              startTime: visit.startTime || existing.startTime,
              endTime: visit.endTime || existing.endTime,
              kind: visit.kind,
              completedAt: new Date(),
            },
          });
          return;
        }
        await tx.appointment.create({
          data: {
            patientId: target!.id,
            visitId: visit.id,
            visitDate: visit.visitDate,
            startTime: visit.startTime,
            endTime: visit.endTime,
            kind: visit.kind,
            status: "completed",
            doctor: visit.doctor,
            remark: "从e看牙导入",
            source: "record",
            completedAt: new Date(),
          },
        });
      }

      async function ensureVisit(full: EkqyFullRecord, isFirst: boolean) {
        const { date, time } = visitInfo(full, summaryById);
        const doctor = full.doctorName || "";
        const kind = isFirst ? "first" : "return";
        const dayVisits = await tx.patientVisit.findMany({
          where: { patientId: target!.id, visitDate: date },
          include: {
            medicalRecords: { select: { id: true } },
            appointment: { select: { id: true } },
          },
          orderBy: [{ startTime: "asc" }, { id: "asc" }],
        });
        const reusable = pickReusableVisit(
          dayVisits.map((v) => ({
            id: v.id,
            visitDate: v.visitDate,
            startTime: v.startTime,
            hasRecords: v.medicalRecords.length > 0,
            hasAppointment: v.appointment != null,
          })),
          date,
          time,
        );
        let visit;
        if (reusable) {
          const slot = dayVisits.find((v) => v.id === reusable.id)!;
          const startTime = slot.startTime || time;
          visit = await tx.patientVisit.update({
            where: { id: slot.id },
            data: {
              kind,
              status: "completed",
              doctor: doctor || slot.doctor,
              // 预约待写已有时段时保留；结束时间缺失或零时长时补默认 30 分钟
              startTime,
              endTime: resolveEndTime(startTime, slot.endTime || ""),
              source: slot.source === "manual" ? slot.source : "record",
              completedAt: new Date(),
            },
          });
        } else {
          visit = await tx.patientVisit.create({
            data: {
              patientId: target!.id,
              visitDate: date,
              startTime: time,
              endTime: defaultEndTime(time),
              kind,
              status: "completed",
              doctor,
              source: "record",
              remark: "从e看牙导入",
              completedAt: new Date(),
            },
          });
        }
        await ensureAppointmentForVisit(visit);
        return visit;
      }

      const createdRecords: {
        full: EkqyFullRecord;
        record: {
          id: number;
          visitDate: string;
          doctor: string;
          planItems: {
            id: number;
            teeth: string;
            lines: { name: string }[];
          }[];
        };
        type: ReturnType<typeof recordType>;
        visit: { id: number; visitDate: string; doctor: string };
      }[] = [];

      for (const full of all) {
        const type = recordType(full, summaryById);
        const isFirst = type === "first" || type === "orthoFirst";
        const visit = await ensureVisit(full, isFirst);
        const { date, time } = visitInfo(full, summaryById);
        const record = await tx.medicalRecord.create({
          data: {
            patientId: target.id,
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
                    lines: {
                      create: [
                        {
                          sort: 0,
                          feeItemId: null,
                          name: clean(item.planContent),
                          teeth: "",
                        },
                      ],
                    },
                  })),
                }
              : undefined,
          },
          include: { planItems: { include: { lines: true } } },
        });
        createdRecords.push({ full, record, type, visit });
      }

      const initialEntry =
        [...createdRecords]
          .reverse()
          .find((item) => isInitialRecordType(item.type)) ??
        createdRecords.find((item) => isInitialRecordType(item.type));
      if (!initialEntry) {
        throw new NotFoundException("写入后未找到初诊病历");
      }

      const followUps = buildPlanFollowUps(
        createdRecords.map((item) => ({
          type: item.type,
          visitDate: item.record.visitDate,
          full: item.full,
          planItems: item.record.planItems.map((p) => ({
            id: p.id,
            teeth: p.teeth,
            text: p.lines
              .map((l) => l.name.trim())
              .filter(Boolean)
              .join("，"),
          })),
        })),
      );
      for (const link of followUps) {
        const host = createdRecords[link.recordIndex];
        if (!host) continue;
        await tx.planItemFollowUp.create({
          data: {
            recordId: host.record.id,
            planItemId: link.planItemId,
            completes: false,
          },
        });
      }

      if (total > 0) {
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

        const visits = await tx.patientVisit.findMany({
          where: { patientId: target.id },
        });
        const paymentRows = orders.flatMap((order) =>
          (order.paymentList ?? []).map((payment) => {
            const paidAt = String(
              order.payDateTime || order.recordCreatedTime || "",
            ).slice(0, 10);
            const visit =
              visits.find((v) => v.visitDate === paidAt) ?? initialEntry.visit;
            return {
              amount: Number(payment.amount ?? 0),
              method: payment.payType || "",
              doctor: visit?.doctor || order.doctorName || order.payee || "",
              paidAt: paidAt || initialEntry.record.visitDate,
              visitId: visit?.id ?? null,
            };
          }),
        );

        await tx.chargeOrder.create({
          data: {
            patientId: target.id,
            visitId: initialEntry.visit.id,
            isCourse: true,
            chargeDate:
              String(
                orders[0]?.payDateTime || orders[0]?.recordCreatedTime || "",
              ).slice(0, 10) || initialEntry.record.visitDate,
            doctor:
              orders[0]?.doctorName ||
              orders[0]?.payee ||
              initialEntry.record.doctor,
            receivable: total,
            items: { create: items },
            payments: {
              create: paymentRows.filter((p) => p.amount > 0),
            },
          },
        });
      }

      // 清掉此前导入留下的同日空就诊（无病历、无预约）
      await tx.patientVisit.deleteMany({
        where: {
          patientId: target.id,
          remark: { in: ["从e看牙导入", "imported from e看牙"] },
          medicalRecords: { none: {} },
          appointment: { is: null },
          chargeOrders: { none: {} },
        },
      });

      return {
        dryRun: false,
        patientId: target.id,
        chartNo,
        matchedBy,
        existingRecords,
        existingCharges,
        records: createdRecords.length,
        planItems: createdRecords.reduce(
          (n, r) => n + r.record.planItems.length,
          0,
        ),
        charges: total,
        payments,
      };
    });
  }
}
