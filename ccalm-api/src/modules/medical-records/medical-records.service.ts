import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { MedicalRecord, Prisma } from "@prisma/client";
import dayjs from "dayjs";

import { PrismaService } from "../../prisma/prisma.service";
import { visitKindForRecordType } from "../visits/visit-options";
import { SaveMedicalRecordDto } from "./dto/save-medical-record.dto";
import {
  hasTreatment,
  isOrthoRecordType,
  MEDICAL_RECORD_FIELDS,
  type MedicalRecordType,
  normalizePlanItems,
  normalizePlanLinks,
  normalizeToothEntries,
  pickRecordContent,
  type PlanItemInput,
  planItemDoneDate,
  type PlanLinkInput,
} from "./record-rules";

const RECORD_INCLUDE = {
  planItems: {
    orderBy: { sort: "asc" },
    include: {
      followUps: {
        select: { completes: true, record: { select: { visitDate: true } } },
      },
    },
  },
  planLinks: {
    include: { planItem: true },
    orderBy: { planItem: { sort: "asc" } },
  },
} satisfies Prisma.MedicalRecordInclude;

type RecordWithPlan = Prisma.MedicalRecordGetPayload<{
  include: typeof RECORD_INCLUDE;
}>;

function mapRecord(r: RecordWithPlan) {
  return {
    id: r.id,
    patientId: r.patientId,
    visitId: r.visitId,
    type: r.type,
    visitDate: r.visitDate,
    visitTime: r.visitTime,
    doctor: r.doctor,
    assistant: r.assistant,
    nurse: r.nurse,
    chiefComplaint: r.chiefComplaint,
    presentIllness: r.presentIllness,
    pastHistory: r.pastHistory,
    oralExam: normalizeToothEntries(r.oralExam),
    auxiliaryExam: r.auxiliaryExam,
    diagnosis: normalizeToothEntries(r.diagnosis),
    treatmentPlan: r.planItems.map((i) => ({
      id: i.id,
      teeth: i.teeth,
      text: i.text,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      discountNote: i.discountNote,
      followUpCount: i.followUps.length,
      doneDate: planItemDoneDate(
        i.followUps.map((f) => ({
          visitDate: f.record.visitDate,
          completes: f.completes,
        })),
      ),
    })),
    treatment: normalizeToothEntries(r.treatment),
    advice: r.advice,
    remark: r.remark,
    planStoppedAt: r.planStoppedAt,
    planLinks: r.planLinks.map((l) => ({
      planItemId: l.planItemId,
      teeth: l.planItem.teeth,
      text: l.planItem.text,
      completes: l.completes,
    })),
    updatedAt: r.updatedAt.toISOString(),
  };
}

@Injectable()
export class MedicalRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(patientId: number) {
    const rows = await this.prisma.medicalRecord.findMany({
      where: { patientId },
      include: RECORD_INCLUDE,
      orderBy: [{ visitDate: "desc" }, { visitTime: "desc" }, { id: "desc" }],
    });
    return rows.map(mapRecord);
  }

  private async resolveVisitId(
    tx: Prisma.TransactionClient,
    dto: SaveMedicalRecordDto,
    doctor: string,
  ): Promise<number | null> {
    if (dto.createVisit) {
      const visit = await tx.patientVisit.create({
        data: {
          patientId: dto.patientId,
          visitDate: dto.visitDate,
          startTime: dto.visitTime ?? "",
          kind: visitKindForRecordType(dto.type),
          status: "completed",
          doctor,
          remark: "由病历创建",
        },
      });
      return visit.id;
    }
    if (dto.visitId == null) {
      throw new BadRequestException(
        "病历必须关联就诊：请新建或选择一条就诊记录",
      );
    }
    const visit = await tx.patientVisit.findUnique({
      where: { id: dto.visitId },
    });
    if (!visit || visit.patientId !== dto.patientId) {
      throw new BadRequestException("关联的就诊不存在");
    }
    return visit.id;
  }

  /** 写了病历即治疗完成；病历填了医生时就诊医生以病历为准 */
  private async syncVisit(
    tx: Prisma.TransactionClient,
    visitId: number | null,
    doctor: string,
  ) {
    if (visitId == null) return;
    await tx.patientVisit.updateMany({
      where: { id: visitId, status: { in: ["booked", "arrived"] } },
      data: { status: "completed" },
    });
    if (doctor) {
      await tx.patientVisit.update({
        where: { id: visitId },
        data: { doctor },
      });
    }
  }

  /** 正畸类病历把未结束正畸档案的上次就诊推到病历日期；只往后推 */
  private async syncOrthodontics(
    tx: Prisma.TransactionClient,
    patientId: number,
    type: MedicalRecordType,
    visitDate: string,
  ) {
    if (!isOrthoRecordType(type)) return;
    await tx.orthodonticsPatient.updateMany({
      where: {
        patientId,
        category: { not: "completed" },
        OR: [{ lastVisitDate: null }, { lastVisitDate: { lt: visitDate } }],
      },
      data: { lastVisitDate: visitDate },
    });
  }

  /** 复诊病历必须关联同一份初诊的治疗计划行；旧的未关联复诊可继续编辑 */
  private async resolvePlanLinks(
    tx: Prisma.TransactionClient,
    dto: SaveMedicalRecordDto,
    existing: MedicalRecord | null,
  ): Promise<PlanLinkInput[]> {
    if (dto.type !== "return") return [];
    const existingLinks = existing
      ? await tx.planItemFollowUp.findMany({
          where: { recordId: existing.id },
          select: { planItemId: true, completes: true },
        })
      : [];
    const links =
      dto.planLinks !== undefined
        ? normalizePlanLinks(dto.planLinks)
        : existingLinks;
    if (!links.length) {
      if (existing?.type === "return" && !existingLinks.length) return [];
      throw new BadRequestException("请至少勾选一行治疗计划");
    }
    const items = await tx.treatmentPlanItem.findMany({
      where: { id: { in: links.map((l) => l.planItemId) } },
      include: { record: { select: { patientId: true } } },
    });
    if (
      items.length !== links.length ||
      items.some((i) => i.record.patientId !== dto.patientId)
    ) {
      throw new BadRequestException("关联的治疗计划不存在");
    }
    if (new Set(items.map((i) => i.recordId)).size > 1) {
      throw new BadRequestException("只能关联同一份初诊的治疗计划");
    }
    return links;
  }

  private async writePlanLinks(
    tx: Prisma.TransactionClient,
    recordId: number,
    links: PlanLinkInput[],
  ) {
    await tx.planItemFollowUp.deleteMany({ where: { recordId } });
    if (links.length) {
      await tx.planItemFollowUp.createMany({
        data: links.map((l) => ({ recordId, ...l })),
      });
    }
  }

  private toData(dto: SaveMedicalRecordDto) {
    const content = pickRecordContent(dto.type, dto);
    if (
      MEDICAL_RECORD_FIELDS[dto.type].includes("treatment") &&
      !hasTreatment(content.treatment)
    ) {
      throw new BadRequestException("请填写处置");
    }
    const planItems: PlanItemInput[] = MEDICAL_RECORD_FIELDS[dto.type].includes(
      "treatmentPlan",
    )
      ? normalizePlanItems(dto.treatmentPlan)
      : [];
    return {
      data: {
        type: dto.type,
        visitDate: dto.visitDate,
        visitTime: dto.visitTime ?? "",
        doctor: dto.doctor?.trim() ?? "",
        assistant: dto.assistant?.trim() ?? "",
        nurse: dto.nurse?.trim() ?? "",
        ...content,
      },
      planItems,
    };
  }

  /** 已有行按 id 更新，新行新建，删掉的行其复诊关联一并删除 */
  private async syncPlanItems(
    tx: Prisma.TransactionClient,
    recordId: number,
    items: PlanItemInput[],
  ) {
    const existing = await tx.treatmentPlanItem.findMany({
      where: { recordId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((e) => e.id));
    const keepIds = items
      .map((i) => i.id)
      .filter((id): id is number => id != null && existingIds.has(id));
    await tx.treatmentPlanItem.deleteMany({
      where: { recordId, id: { notIn: keepIds } },
    });
    for (const [sort, item] of items.entries()) {
      const data = {
        sort,
        teeth: item.teeth,
        text: item.text,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discountNote: item.discountNote,
      };
      if (item.id != null && existingIds.has(item.id)) {
        await tx.treatmentPlanItem.update({ where: { id: item.id }, data });
      } else {
        await tx.treatmentPlanItem.create({ data: { recordId, ...data } });
      }
    }
  }

  async create(dto: SaveMedicalRecordDto) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient) throw new NotFoundException("患者不存在");
    const { data, planItems } = this.toData(dto);
    const record = await this.prisma.$transaction(async (tx) => {
      const links = await this.resolvePlanLinks(tx, dto, null);
      const visitId = await this.resolveVisitId(tx, dto, data.doctor);
      await this.syncVisit(tx, visitId, data.doctor);
      await this.syncOrthodontics(tx, dto.patientId, dto.type, data.visitDate);
      const created = await tx.medicalRecord.create({
        data: { patientId: dto.patientId, visitId, ...data },
      });
      await this.syncPlanItems(tx, created.id, planItems);
      await this.writePlanLinks(tx, created.id, links);
      return tx.medicalRecord.findUniqueOrThrow({
        where: { id: created.id },
        include: RECORD_INCLUDE,
      });
    });
    return mapRecord(record);
  }

  async update(id: number, dto: SaveMedicalRecordDto) {
    const existing = await this.prisma.medicalRecord.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("病历不存在");
    if (existing.patientId !== dto.patientId) {
      throw new BadRequestException("病历不属于该患者");
    }
    const { data, planItems } = this.toData(dto);
    const record = await this.prisma.$transaction(async (tx) => {
      const links = await this.resolvePlanLinks(tx, dto, existing);
      const visitId = await this.resolveVisitId(tx, dto, data.doctor);
      await this.syncVisit(tx, visitId, data.doctor);
      await this.syncOrthodontics(tx, dto.patientId, dto.type, data.visitDate);
      await tx.medicalRecord.update({
        where: { id },
        data: { visitId, ...data },
      });
      await this.syncPlanItems(tx, id, planItems);
      await this.writePlanLinks(tx, id, links);
      return tx.medicalRecord.findUniqueOrThrow({
        where: { id },
        include: RECORD_INCLUDE,
      });
    });
    return mapRecord(record);
  }

  async setPlanStopped(id: number, stopped: boolean) {
    const existing = await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: RECORD_INCLUDE,
    });
    if (!existing) throw new NotFoundException("病历不存在");
    if (existing.type !== "first" || !existing.planItems.length) {
      throw new BadRequestException("只有带治疗计划的初诊病历可以终止疗程");
    }
    const record = await this.prisma.medicalRecord.update({
      where: { id },
      data: { planStoppedAt: stopped ? dayjs().format("YYYY-MM-DD") : null },
      include: RECORD_INCLUDE,
    });
    return mapRecord(record);
  }

  async remove(id: number) {
    const existing = await this.prisma.medicalRecord.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("病历不存在");
    await this.prisma.$transaction(async (tx) => {
      await tx.medicalRecord.delete({ where: { id } });
      if (existing.visitId == null) return;
      // 由病历自动创建、且已无其他病历和收费单的就诊一并删除
      await tx.patientVisit.deleteMany({
        where: {
          id: existing.visitId,
          remark: "由病历创建",
          medicalRecords: { none: {} },
          chargeOrders: { none: {} },
        },
      });
    });
    return { ok: true };
  }
}
