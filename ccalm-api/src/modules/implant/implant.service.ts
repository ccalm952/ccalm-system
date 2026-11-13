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
  implantCountsForPending,
  remainingPendingTeeth,
} from "./pending-teeth";

export type ImplantRecordRow = {
  patientId: number;
  patientName: string;
  phone: string;
  chartNo?: string;
  birthday: string | null;
  age: number | null;
  visitId: number;
  visitDate: string;
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

      await this.consumePending(
        tx,
        patient.id,
        visit.visitDate,
        visit.teeth.map((t) => t.toothNo),
      );
      return visit;
    });
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
          data: { teeth: rest.join(" ") },
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
      return tooth;
    });
  }

  async deleteVisitRow(visitId: number, toothId?: number | null) {
    const visit = await this.prisma.implantVisit.findUnique({
      where: { id: visitId },
    });
    if (!visit) throw new NotFoundException("就诊记录不存在");

    if (toothId != null) {
      await this.prisma.implantTooth.deleteMany({
        where: { id: toothId, visitId },
      });
      const left = await this.prisma.implantTooth.count({ where: { visitId } });
      if (left === 0) {
        await this.prisma.implantVisit.delete({ where: { id: visitId } });
      }
    } else {
      await this.prisma.implantVisit.delete({ where: { id: visitId } });
    }
    return { ok: true };
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
        birthday: "",
        age: null as number | null,
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
