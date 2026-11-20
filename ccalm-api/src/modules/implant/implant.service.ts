import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import dayjs from "dayjs";

import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import {
  findOrCreatePatient,
  normalizePatientIdentity,
} from "../patients/patient-identity";
import { AddInventoryDto, UpdateInventoryDto } from "./dto/inventory.dto";
import {
  CreateImplantVisitDto,
  ImplantToothInputDto,
} from "./dto/create-visit.dto";
import {
  CreateImplantPendingDto,
  UpdateImplantPendingDto,
} from "./dto/implant-pending.dto";
import { UpdateImplantPatientDto } from "./dto/update-patient.dto";
import { UpdateImplantVisitDto } from "./dto/update-visit.dto";
import {
  buildImplantTreatmentEntries,
  IMPLANT_EMR_REMARK,
  implantEmrDoctor,
  implantEmrNurse,
  matchPlanItemForImplant,
} from "./implant-emr";
import { planGroupLabel } from "../medical-records/record-rules";
import {
  implantCountsForPending,
  remainingPendingTeeth,
} from "./pending-teeth";
import {
  IMPLANT_VISIT_REMARK,
  OPEN_VISIT_STATUSES,
} from "../visits/visit-options";

export type ImplantRecordRow = {
  patientId: number;
  patientName: string;
  phone: string;
  chartNo?: string;
  birthday: string | null;
  age: number | null;
  visitId: number;
  visitDate: string;
  doctor: string | null;
  remark: string | null;
  staff: string | null;
  toothId: number | null;
  toothNo: string | null;
  implantBrand: string | null;
  implantModel: string | null;
  toothRemark: string | null;
};

@Injectable()
export class ImplantService {
  constructor(private readonly prisma: PrismaService) {}

  async listRecords(filters: {
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<ImplantRecordRow[]> {
    const kw = filters.q?.trim();
    const { dateFrom, dateTo } = filters;

    const teeth = await this.prisma.implantTooth.findMany({
      where: {
        visit: {
          ...(kw
            ? {}
            : dateFrom || dateTo
              ? {
                  visitDate: {
                    ...(dateFrom ? { gte: dateFrom } : {}),
                    ...(dateTo ? { lte: dateTo } : {}),
                  },
                }
              : {}),
          ...(kw
            ? {
                patient: {
                  OR: [
                    { name: { contains: kw, mode: "insensitive" as const } },
                    { phone: { contains: kw } },
                  ],
                },
              }
            : {}),
        },
      },
      include: {
        visit: { include: { patient: true } },
      },
      orderBy: [{ visit: { visitDate: "desc" } }, { id: "asc" }],
      ...(filters.limit != null && filters.limit > 0
        ? { take: filters.limit }
        : {}),
    });

    return teeth.map((t) => {
      const p = t.visit.patient;
      return {
        patientId: p.id,
        patientName: p.name,
        phone: p.phone,
        chartNo: p.chartNo || undefined,
        birthday: p.birthday ?? null,
        age: p.age ?? null,
        visitId: t.visit.id,
        visitDate: t.visit.visitDate,
        doctor: t.visit.doctor,
        remark: t.visit.remark,
        staff: t.visit.staff,
        toothId: t.id,
        toothNo: t.toothNo,
        implantBrand: t.implantBrand,
        implantModel: t.implantModel,
        toothRemark: t.toothRemark,
      };
    });
  }

  async createVisit(dto: CreateImplantVisitDto) {
    const phone = dto.phone.trim();
    const patientName = dto.patientName.trim();
    if (!phone || !patientName)
      throw new BadRequestException("姓名与手机不能为空");

    const chartNo = dto.chartNo?.trim() ?? "";
    if (!chartNo) throw new BadRequestException("请填写病历号");

    const teethPayload = dto.teeth.filter(
      (x) =>
        (
          x.toothNo?.trim() ||
          x.implantModel?.trim() ||
          x.implantBrand?.trim() ||
          x.toothRemark?.trim()
        )?.length,
    );
    if (!teethPayload.length)
      throw new BadRequestException("请至少填写一条牙位或植体信息");

    const phase2 = dto.remark?.trim() || "";
    if (phase2 && !/^\d+$/.test(phase2))
      throw new BadRequestException("二期只能填写数字（月数）");

    return this.prisma.$transaction(async (tx) => {
      const patient = await findOrCreatePatient(
        tx,
        normalizePatientIdentity({ name: patientName, phone, chartNo }),
        {
          birthday: dto.birthday?.trim() || null,
          age: dto.age ?? null,
          patientId: dto.patientId,
        },
      );

      const visit = await tx.implantVisit.create({
        data: {
          patientId: patient.id,
          visitDate: dto.visitDate,
          doctor: dto.doctor?.trim() || null,
          remark: phase2 || null,
          staff: dto.staff?.trim() || null,
          teeth: {
            create: teethPayload.map((t) => ({
              toothNo: t.toothNo?.trim() || null,
              implantBrand: t.implantBrand?.trim() || null,
              implantModel: t.implantModel?.trim() || null,
              toothRemark: t.toothRemark?.trim() || null,
            })),
          },
        },
        include: { teeth: true },
      });

      const doctor = implantEmrDoctor(visit.doctor);
      const patientVisit = await this.ensureVisitRecord(tx, {
        patientId: patient.id,
        visitDate: visit.visitDate,
        doctor,
      });
      await this.syncImplantTeeth(tx, patient.id, visit.visitDate);
      await this.upsertImplantMedicalRecord(tx, {
        patientId: patient.id,
        visitDate: visit.visitDate,
        patientVisitId: patientVisit.id,
        doctor,
        nurse: implantEmrNurse(visit.staff),
      });

      await this.consumePending(
        tx,
        patient.id,
        visit.visitDate,
        visit.teeth.map((t) => t.toothNo),
      );
      return visit;
    });
  }

  /**
   * 种植记录同时生成「就诊」：当天已有未完成就诊就复用（缺预约则补一条），
   * 否则新建就诊 + 预约，患者就诊记录、病历与工作台都能看到这次种植。
   */
  private async ensureVisitRecord(
    tx: Prisma.TransactionClient,
    params: { patientId: number; visitDate: string; doctor?: string },
  ) {
    const { patientId, visitDate } = params;
    const doctor = params.doctor?.trim() || "";
    const open = await tx.patientVisit.findFirst({
      where: { patientId, visitDate, status: { in: OPEN_VISIT_STATUSES } },
      orderBy: { id: "desc" },
    });

    if (open) {
      const startTime = open.startTime || dayjs().format("HH:mm");
      const endTime = open.endTime || dayjs().add(30, "minute").format("HH:mm");
      const patch: {
        startTime?: string;
        endTime?: string;
        doctor?: string;
      } = {};
      if (!open.startTime) {
        patch.startTime = startTime;
        patch.endTime = endTime;
      }
      if (doctor && !open.doctor?.trim()) patch.doctor = doctor;
      if (Object.keys(patch).length) {
        await tx.patientVisit.update({
          where: { id: open.id },
          data: patch,
        });
      }
      const linked = await tx.appointment.findUnique({
        where: { visitId: open.id },
      });
      if (!linked) {
        await tx.appointment.create({
          data: {
            patientId,
            visitId: open.id,
            visitDate: open.visitDate,
            startTime,
            endTime,
            kind: open.kind,
            status: "booked",
            doctor: doctor || open.doctor,
            remark: open.remark,
            source: "implant",
          },
        });
      } else if (doctor && !linked.doctor?.trim()) {
        await tx.appointment.update({
          where: { id: linked.id },
          data: { doctor },
        });
      }
      return open;
    }

    const created = await tx.patientVisit.create({
      data: {
        patientId,
        visitDate,
        startTime: dayjs().format("HH:mm"),
        endTime: dayjs().add(30, "minute").format("HH:mm"),
        kind: "return",
        status: "booked",
        doctor,
        remark: IMPLANT_VISIT_REMARK,
      },
    });
    await tx.appointment.create({
      data: {
        patientId,
        visitId: created.id,
        visitDate: created.visitDate,
        startTime: created.startTime,
        endTime: created.endTime,
        kind: created.kind,
        status: "booked",
        doctor: created.doctor,
        remark: created.remark,
        source: "implant",
      },
    });
    return created;
  }

  /** 已种的牙位从该患者的待种植里去掉，全部种完的待种植记录删除 */
  private async consumePending(
    client: Pick<Prisma.TransactionClient, "implantPending">,
    patientId: number,
    visitDate: string,
    toothNos: (string | null)[],
  ) {
    const rows = await client.implantPending.findMany({ where: { patientId } });
    for (const row of rows) {
      const createdDate = dayjs(row.createdAt).format("YYYY-MM-DD");
      if (
        !implantCountsForPending(visitDate, {
          extractionDate: row.extractionDate,
          createdDate,
        })
      ) {
        continue;
      }
      const rest = remainingPendingTeeth(row.teeth, toothNos);
      if (!rest) continue;
      if (rest.length) {
        await client.implantPending.update({
          where: { id: row.id },
          data: { teeth: rest.join(",") },
        });
      } else {
        await client.implantPending.delete({ where: { id: row.id } });
      }
    }
  }

  async updateVisit(visitId: number, dto: UpdateImplantVisitDto) {
    const visit = await this.prisma.implantVisit.findUnique({
      where: { id: visitId },
      include: { patient: true },
    });
    if (!visit) throw new NotFoundException("就诊记录不存在");

    const toothId = dto.toothId;

    return this.prisma.$transaction(async (tx) => {
      if (dto.patientId != null && dto.patientId !== visit.patientId) {
        throw new BadRequestException("患者不匹配");
      }

      await tx.patient.update({
        where: { id: visit.patientId },
        data: {
          ...(dto.patientName != null ? { name: dto.patientName } : {}),
          ...(dto.phone != null ? { phone: dto.phone } : {}),
        },
      });

      await tx.implantVisit.update({
        where: { id: visitId },
        data: {
          ...(dto.visitDate != null ? { visitDate: dto.visitDate } : {}),
          ...(dto.doctor !== undefined ? { doctor: dto.doctor } : {}),
          ...(dto.remark !== undefined ? { remark: dto.remark } : {}),
          ...(dto.staff !== undefined ? { staff: dto.staff } : {}),
        },
      });

      if (toothId != null) {
        const tooth = await tx.implantTooth.findFirst({
          where: { id: toothId, visitId },
        });
        if (!tooth) throw new NotFoundException("牙位记录不存在");
        await tx.implantTooth.update({
          where: { id: toothId },
          data: {
            ...(dto.toothNo !== undefined ? { toothNo: dto.toothNo } : {}),
            ...(dto.implantBrand !== undefined
              ? { implantBrand: dto.implantBrand }
              : {}),
            ...(dto.implantModel !== undefined
              ? { implantModel: dto.implantModel }
              : {}),
            ...(dto.toothRemark !== undefined
              ? { toothRemark: dto.toothRemark }
              : {}),
          },
        });
        if (dto.toothNo) {
          await this.consumePending(
            tx,
            visit.patientId,
            dto.visitDate ?? visit.visitDate,
            [dto.toothNo],
          );
        }
      }

      const nextDate = dto.visitDate ?? visit.visitDate;
      const doctor = implantEmrDoctor(
        dto.doctor !== undefined ? dto.doctor : visit.doctor,
      );
      const nurse = implantEmrNurse(
        dto.staff !== undefined ? dto.staff : visit.staff,
      );

      if (dto.visitDate != null && dto.visitDate !== visit.visitDate) {
        await this.cleanupImplantVisitRecord(
          tx,
          visit.patientId,
          visit.visitDate,
        );
        // 旧日若还剩别的种植记录，刷新其自动病历
        await this.refreshImplantMedicalRecord(
          tx,
          visit.patientId,
          visit.visitDate,
          doctor,
          nurse,
        );
        const patientVisit = await this.ensureVisitRecord(tx, {
          patientId: visit.patientId,
          visitDate: dto.visitDate,
          doctor,
        });
        await this.syncImplantTeeth(tx, visit.patientId, visit.visitDate);
        await this.syncImplantTeeth(tx, visit.patientId, nextDate);
        await this.upsertImplantMedicalRecord(tx, {
          patientId: visit.patientId,
          visitDate: nextDate,
          patientVisitId: patientVisit.id,
          doctor,
          nurse,
        });
      } else {
        await this.syncImplantTeeth(tx, visit.patientId, nextDate);
        await this.refreshImplantMedicalRecord(
          tx,
          visit.patientId,
          nextDate,
          doctor,
          nurse,
        );
      }

      return { ok: true };
    });
  }

  /** 在已有就诊下追加一条牙位（用于种植记录页编辑弹窗「新增一行」） */
  async appendToothToVisit(visitId: number, dto: ImplantToothInputDto) {
    const visit = await this.prisma.implantVisit.findUnique({
      where: { id: visitId },
    });
    if (!visit) throw new NotFoundException("就诊记录不存在");

    const toothNo = dto.toothNo?.trim();
    const implantBrand = dto.implantBrand?.trim();
    const implantModel = dto.implantModel?.trim();
    const toothRemark = dto.toothRemark?.trim();
    if (!toothNo && !implantBrand && !implantModel && !toothRemark) {
      throw new BadRequestException("请至少填写牙位或植体信息");
    }

    return this.prisma.$transaction(async (tx) => {
      const tooth = await tx.implantTooth.create({
        data: {
          visitId,
          toothNo: toothNo || null,
          implantBrand: implantBrand || null,
          implantModel: implantModel || null,
          toothRemark: toothRemark || null,
        },
      });
      await this.consumePending(tx, visit.patientId, visit.visitDate, [
        tooth.toothNo,
      ]);
      await this.syncImplantTeeth(tx, visit.patientId, visit.visitDate);
      await this.refreshImplantMedicalRecord(
        tx,
        visit.patientId,
        visit.visitDate,
        implantEmrDoctor(visit.doctor),
        implantEmrNurse(visit.staff),
      );
      return tooth;
    });
  }

  async deleteVisitRow(visitId: number, toothId?: number | null) {
    const visit = await this.prisma.implantVisit.findUnique({
      where: { id: visitId },
    });
    if (!visit) throw new NotFoundException("就诊记录不存在");

    await this.prisma.$transaction(async (tx) => {
      if (toothId != null) {
        await tx.implantTooth.deleteMany({ where: { id: toothId, visitId } });
        const left = await tx.implantTooth.count({ where: { visitId } });
        if (left === 0) {
          await tx.implantVisit.delete({ where: { id: visitId } });
        }
      } else {
        await tx.implantVisit.delete({ where: { id: visitId } });
      }
      await this.cleanupImplantVisitRecord(
        tx,
        visit.patientId,
        visit.visitDate,
      );
      await this.syncImplantTeeth(tx, visit.patientId, visit.visitDate);
      await this.refreshImplantMedicalRecord(
        tx,
        visit.patientId,
        visit.visitDate,
        implantEmrDoctor(visit.doctor),
        implantEmrNurse(visit.staff),
      );
    });
    return { ok: true };
  }

  /** 把当天种植牙位同步到种植就诊的预约上，工作台只读就诊数据即可 */
  private async syncImplantTeeth(
    tx: Prisma.TransactionClient,
    patientId: number,
    visitDate: string,
  ) {
    const rows = await tx.implantVisit.findMany({
      where: { patientId, visitDate },
      select: { teeth: { select: { toothNo: true } } },
    });
    const teeth = [
      ...new Set(
        rows
          .flatMap((r) => r.teeth.map((t) => t.toothNo?.trim() ?? ""))
          .filter(Boolean),
      ),
    ].sort();

    await tx.appointment.updateMany({
      where: { patientId, visitDate, source: "implant" },
      data: { implantTeeth: teeth },
    });
  }

  /** 当天已没有种植记录时，删掉自动病历；仅删备注为「种植就诊」的自动就诊与预约 */
  private async cleanupImplantVisitRecord(
    tx: Prisma.TransactionClient,
    patientId: number,
    visitDate: string,
  ) {
    const left = await tx.implantVisit.count({
      where: { patientId, visitDate },
    });
    if (left > 0) return;

    await tx.medicalRecord.deleteMany({
      where: { patientId, visitDate, remark: IMPLANT_EMR_REMARK },
    });

    const visit = await tx.patientVisit.findFirst({
      where: { patientId, visitDate, remark: IMPLANT_VISIT_REMARK },
      orderBy: { id: "desc" },
    });
    if (!visit) return;

    await tx.appointment.deleteMany({ where: { visitId: visit.id } });
    await tx.patientVisit.delete({ where: { id: visit.id } });
  }

  /**
   * 按当日种植牙刷新自动病历：有牙则 ensure+upsert，无牙则 cleanup 已处理。
   * 已 completed 的种植就诊直接复用，避免再开一条。
   */
  private async refreshImplantMedicalRecord(
    tx: Prisma.TransactionClient,
    patientId: number,
    visitDate: string,
    doctor: string,
    nurse: string,
  ) {
    const left = await tx.implantVisit.count({
      where: { patientId, visitDate },
    });
    if (left === 0) return;

    let patientVisit = await tx.patientVisit.findFirst({
      where: { patientId, visitDate, remark: IMPLANT_VISIT_REMARK },
      orderBy: { id: "desc" },
    });
    if (!patientVisit) {
      patientVisit = await this.ensureVisitRecord(tx, {
        patientId,
        visitDate,
        doctor,
      });
    } else if (doctor) {
      // 已有种植就诊时也覆盖医生，避免种植记录改医生后就诊仍停在旧值/兜底值
      await tx.patientVisit.update({
        where: { id: patientVisit.id },
        data: { doctor },
      });
      await tx.appointment.updateMany({
        where: { visitId: patientVisit.id },
        data: { doctor },
      });
    }
    await this.upsertImplantMedicalRecord(tx, {
      patientId,
      visitDate,
      patientVisitId: patientVisit.id,
      doctor,
      nurse,
    });
  }

  /** 仅覆盖「从种植记录自动生成」的病历；已有人工病历则不碰 */
  private async upsertImplantMedicalRecord(
    tx: Prisma.TransactionClient,
    params: {
      patientId: number;
      visitDate: string;
      patientVisitId: number;
      doctor: string;
      nurse: string;
    },
  ) {
    const { patientId, visitDate, patientVisitId, doctor, nurse } = params;
    const implantRows = await tx.implantVisit.findMany({
      where: { patientId, visitDate },
      include: {
        teeth: {
          orderBy: { id: "asc" },
        },
      },
      orderBy: { id: "asc" },
    });
    const implantTeeth = implantRows.flatMap((r) => r.teeth);
    const treatment = buildImplantTreatmentEntries(implantTeeth);
    if (!treatment.length) return;

    const onVisit = await tx.medicalRecord.findMany({
      where: { visitId: patientVisitId },
      select: { id: true, remark: true },
    });
    const auto = onVisit.find((r) => r.remark === IMPLANT_EMR_REMARK);
    if (!auto && onVisit.length > 0) return;

    let recordId: number;
    if (auto) {
      await tx.medicalRecord.update({
        where: { id: auto.id },
        data: {
          visitDate,
          doctor,
          nurse,
          treatment,
          remark: IMPLANT_EMR_REMARK,
        },
      });
      recordId = auto.id;
    } else {
      const created = await tx.medicalRecord.create({
        data: {
          patientId,
          visitId: patientVisitId,
          type: "return",
          visitDate,
          visitTime: "",
          doctor,
          nurse,
          treatment,
          remark: IMPLANT_EMR_REMARK,
        },
      });
      recordId = created.id;
    }

    await this.syncImplantPlanLinks(tx, {
      patientId,
      visitDate,
      recordId,
      toothNos: implantTeeth.map((t) => t.toothNo?.trim() ?? "").filter(Boolean),
    });

    await tx.patientVisit.update({
      where: { id: patientVisitId },
      data: {
        doctor,
        status: "completed",
        completedAt: new Date(),
      },
    });
    await tx.appointment.updateMany({
      where: { visitId: patientVisitId },
      data: {
        doctor,
        status: "completed",
        completedAt: new Date(),
      },
    });
  }

  /** 按种植牙位挂到未终止初诊的治疗计划组；无重叠则清空自动关联 */
  private async syncImplantPlanLinks(
    tx: Prisma.TransactionClient,
    params: {
      patientId: number;
      visitDate: string;
      recordId: number;
      toothNos: string[];
    },
  ) {
    const { patientId, visitDate, recordId, toothNos } = params;
    await tx.planItemFollowUp.deleteMany({ where: { recordId } });
    if (!toothNos.length) return;

    const initials = await tx.medicalRecord.findMany({
      where: {
        patientId,
        type: { in: ["first", "orthoFirst"] },
        visitDate: { lte: visitDate },
        planStoppedAt: null,
      },
      include: {
        planItems: {
          orderBy: { sort: "asc" },
          include: { lines: { orderBy: { sort: "asc" } } },
        },
      },
      orderBy: [{ visitDate: "desc" }, { id: "desc" }],
    });
    const candidates = initials.flatMap((r) =>
      r.planItems.map((p) => ({
        id: p.id,
        teeth: p.teeth,
        text: planGroupLabel(p.lines),
      })),
    );
    const planItemId = matchPlanItemForImplant(toothNos, candidates);
    if (planItemId == null) return;
    await tx.planItemFollowUp.create({
      data: { recordId, planItemId, completes: false },
    });
  }

  async listInventory() {
    const rows = await this.prisma.implantInventory.findMany({
      orderBy: [{ brand: "asc" }, { model: "asc" }],
    });
    const grouped = await this.prisma.implantTooth.groupBy({
      by: ["implantBrand", "implantModel"],
      where: {
        AND: [{ implantBrand: { not: null } }, { implantModel: { not: null } }],
      },
      _count: { _all: true },
    });
    const usageByBrandModel = new Map<string, number>();
    for (const g of grouped) {
      const b = (g.implantBrand ?? "").trim();
      const m = (g.implantModel ?? "").trim();
      if (!b || !m) continue;
      usageByBrandModel.set(`${b}\u0000${m}`, g._count._all);
    }
    return rows.map((r) => {
      const used =
        usageByBrandModel.get(`${r.brand.trim()}\u0000${r.model.trim()}`) ?? 0;
      return {
        id: r.id,
        brand: r.brand,
        model: r.model,
        supplement: r.supplement,
        used,
        left: r.supplement - used,
      };
    });
  }

  async addInventory(dto: AddInventoryDto) {
    const brand = dto.brand.trim();
    const model = dto.modelCode.trim();
    if (!brand || !model) throw new BadRequestException("品牌与植体不能为空");

    const existing = await this.prisma.implantInventory.findUnique({
      where: { brand_model: { brand, model } },
    });
    if (existing) {
      return this.prisma.implantInventory.update({
        where: { id: existing.id },
        data: { supplement: existing.supplement + dto.supplement },
      });
    }
    return this.prisma.implantInventory.create({
      data: { brand, model, supplement: dto.supplement, used: 0 },
    });
  }

  async updateInventory(id: number, dto: UpdateInventoryDto) {
    const row = await this.prisma.implantInventory.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException("库存记录不存在");

    const brand = dto.brand.trim();
    const model = dto.modelCode.trim();

    if (brand === row.brand && model === row.model) {
      return this.prisma.implantInventory.update({
        where: { id },
        data: { supplement: dto.supplement },
      });
    }

    const clash = await this.prisma.implantInventory.findUnique({
      where: { brand_model: { brand, model } },
    });
    if (clash && clash.id !== id)
      throw new BadRequestException("该品牌型号已存在");

    return this.prisma.implantInventory.update({
      where: { id },
      data: { brand, model, supplement: dto.supplement },
    });
  }

  async deleteInventory(id: number) {
    await this.prisma.implantInventory.delete({ where: { id } });
    return { ok: true };
  }

  async deleteAllInventory() {
    await this.prisma.implantInventory.deleteMany({});
    return { ok: true };
  }

  async statsStaff(month?: string) {
    const m = month?.trim();
    const inMonth = m && /^\d{4}-\d{2}$/.test(m);
    const visits = await this.prisma.implantVisit.findMany({
      where: {
        staff: { not: null },
        ...(inMonth ? { visitDate: { startsWith: `${m}-` } } : {}),
      },
      select: { staff: true },
    });
    const counts = new Map<string, number>();
    for (const v of visits) {
      const s = v.staff?.trim();
      if (!s) continue;
      const parts = s
        .split("+")
        .map((x) => x.trim())
        .filter(Boolean);
      const names = parts.length ? parts : [s];
      for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  async statsMonths() {
    const visits = await this.prisma.implantVisit.findMany({
      select: { visitDate: true },
    });
    const set = new Set<string>();
    for (const v of visits) {
      const m = v.visitDate.slice(0, 7);
      if (m.length === 7) set.add(m);
    }
    return [...set].sort((a, b) => b.localeCompare(a));
  }

  async statsMonthTotal(month: string) {
    const m = month.trim();
    if (!/^\d{4}-\d{2}$/.test(m))
      throw new BadRequestException("月份格式应为 YYYY-MM");
    const prefix = `${m}-`;
    const count = await this.prisma.implantTooth.count({
      where: { visit: { visitDate: { startsWith: prefix } } },
    });
    return count;
  }

  async listImplantPatients(q?: string) {
    const kw = q?.trim();
    const patients = await this.prisma.patient.findMany({
      where: {
        visits: { some: {} },
        ...(kw
          ? {
              OR: [
                { name: { contains: kw, mode: "insensitive" as const } },
                { phone: { contains: kw } },
                { chartNo: { contains: kw, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    });
    return patients.map((p) => this.formatImplantPatientRow(p));
  }

  private formatImplantPatientRow(p: {
    id: number;
    name: string;
    phone: string;
    gender: string;
    chartNo: string;
    birthday: string | null;
    age: number | null;
    createdAt: Date;
  }) {
    return {
      id: p.id,
      name: p.name,
      phone: p.phone,
      gender: p.gender || "-",
      source: p.chartNo || "-",
      birthday: p.birthday || "-",
      age: p.age ?? 0,
      createdAt: p.createdAt.toISOString(),
    };
  }

  async updateImplantPatient(id: number, dto: UpdateImplantPatientDto) {
    const existing = await this.prisma.patient.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("患者不存在");
    const name = dto.name.trim();
    const phone = dto.phone.trim();
    if (!name || !phone) throw new BadRequestException("姓名与手机不能为空");
    const updated = await this.prisma.patient.update({
      where: { id },
      data: {
        name,
        phone,
        gender: dto.gender != null ? dto.gender.trim() : "",
        chartNo: dto.chartNo != null ? dto.chartNo.trim() : "",
        birthday:
          dto.birthday != null && String(dto.birthday).trim() !== ""
            ? String(dto.birthday).trim()
            : null,
        age: dto.age != null && Number.isFinite(dto.age) ? dto.age : null,
      },
    });
    return this.formatImplantPatientRow(updated);
  }

  /** 只删该患者的种植就诊与牙位；患者档案仍保留在患者管理里 */
  async deleteImplantPatient(id: number) {
    const existing = await this.prisma.patient.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("患者不存在");
    await this.prisma.implantVisit.deleteMany({ where: { patientId: id } });
    return { ok: true };
  }

  async suggestPatients(keyword?: string, pageSize = 20) {
    const kw = keyword?.trim();
    if (!kw) return { list: [] as Array<Record<string, unknown>> };
    const take = Math.min(50, Math.max(1, pageSize));
    const [patients, pendings] = await Promise.all([
      this.prisma.patient.findMany({
        where: { name: { contains: kw, mode: "insensitive" as const } },
        take,
        orderBy: { name: "asc" },
      }),
      this.prisma.implantPending.findMany({
        where: {
          patient: { name: { contains: kw, mode: "insensitive" as const } },
        },
        include: { patient: true },
        take,
        orderBy: { patient: { name: "asc" } },
      }),
    ]);
    const list = [
      ...pendings.map((p) => ({
        id: p.id,
        patientId: p.patientId,
        name: p.patient.name,
        phone: p.patient.phone,
        source: p.patient.chartNo,
        birthday: p.patient.birthday ?? "",
        age: p.patient.age,
        origin: "pending" as const,
        originLabel: "待种植",
        teeth: p.teeth ?? "",
      })),
      ...patients.map((p) => ({
        id: p.id,
        patientId: p.id,
        name: p.name,
        phone: p.phone ?? "",
        source: p.chartNo ?? "",
        birthday: p.birthday ?? "",
        age: p.age,
        origin: "patient" as const,
        originLabel: "患者库",
        teeth: "",
      })),
    ].slice(0, take);
    return { list };
  }

  private normalizeExtractionDate(raw?: string | null): string | null {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    const d = dayjs(s);
    if (!d.isValid()) {
      throw new BadRequestException("拔牙日期格式无效");
    }
    return d.format("YYYY-MM-DD");
  }

  /** 今天 − 拔牙日期天数 ÷ 30 向下取整；空/未来/不满 30 天返回 null */
  private monthsAfterExtraction(extractionDate: string | null): number | null {
    if (!extractionDate) return null;
    const d = dayjs(extractionDate).startOf("day");
    if (!d.isValid()) return null;
    const days = dayjs().startOf("day").diff(d, "day");
    if (days < 30) return null;
    return Math.floor(days / 30);
  }

  private mapPendingRow(row: {
    id: number;
    patientId: number;
    patient: { name: string; phone: string; chartNo: string };
    teeth: string;
    extractionDate: string | null;
    remark: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      patientId: row.patientId,
      name: row.patient.name,
      phone: row.patient.phone,
      chartNo: row.patient.chartNo,
      teeth: row.teeth,
      extractionDate: row.extractionDate,
      monthsAfter: this.monthsAfterExtraction(row.extractionDate),
      remark: row.remark,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listPending(q?: string) {
    const keyword = q?.trim();
    const rows = await this.prisma.implantPending.findMany({
      where: keyword
        ? {
            patient: {
              OR: [
                { name: { contains: keyword, mode: "insensitive" } },
                { phone: { contains: keyword } },
              ],
            },
          }
        : undefined,
      include: { patient: true },
    });
    const mapped = rows.map((row) => this.mapPendingRow(row));
    mapped.sort((a, b) => {
      const am = a.monthsAfter;
      const bm = b.monthsAfter;
      if (am == null && bm == null) return b.id - a.id;
      if (am == null) return 1;
      if (bm == null) return -1;
      if (bm !== am) return bm - am;
      return b.id - a.id;
    });
    return mapped;
  }

  async createPending(dto: CreateImplantPendingDto) {
    const identity = normalizePatientIdentity(dto);
    if (!identity.name) throw new BadRequestException("请填写姓名");
    const extractionDate = this.normalizeExtractionDate(dto.extractionDate);
    const row = await this.prisma.$transaction(async (tx) => {
      const patient = await findOrCreatePatient(tx, identity, {
        patientId: dto.patientId,
      });
      return tx.implantPending.create({
        data: {
          patientId: patient.id,
          teeth: dto.teeth?.trim() ?? "",
          extractionDate,
          remark: dto.remark?.trim() ?? "",
        },
        include: { patient: true },
      });
    });
    return this.mapPendingRow(row);
  }

  async updatePending(id: number, dto: UpdateImplantPendingDto) {
    const existing = await this.prisma.implantPending.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("记录不存在");
    const identity = normalizePatientIdentity(dto);
    if (!identity.name) throw new BadRequestException("请填写姓名");
    const extractionDate = this.normalizeExtractionDate(dto.extractionDate);
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.patient.update({
        where: { id: existing.patientId },
        data: identity,
      });
      return tx.implantPending.update({
        where: { id },
        data: {
          teeth: dto.teeth?.trim() ?? "",
          extractionDate,
          remark: dto.remark?.trim() ?? "",
        },
        include: { patient: true },
      });
    });
    return this.mapPendingRow(row);
  }

  async deletePending(id: number) {
    const existing = await this.prisma.implantPending.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("记录不存在");
    await this.prisma.implantPending.delete({ where: { id } });
    return { ok: true };
  }
}
