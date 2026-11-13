import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import dayjs from "dayjs";

import { PrismaService } from "../../prisma/prisma.service";
import { daysSinceVisit } from "../orthodontics/follow-up";
import { MergePatientsDto } from "./dto/merge-patients.dto";
import { SavePatientDto } from "./dto/save-patient.dto";
import {
  ATTENDED_VISIT_STATUSES,
  latestVisitDate,
  normalizeTags,
  PATIENT_GROUPS,
  parsePatientGroup,
  patientGroupWhere,
} from "./patient-groups";
import {
  normalizePatientIdentity,
  patientMatchWhere,
} from "./patient-identity";

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeBirthday(raw?: string | null): string | null {
    const s = raw?.trim();
    if (!s) return null;
    const d = dayjs(s);
    if (!d.isValid()) throw new BadRequestException("生日格式无效");
    return d.format("YYYY-MM-DD");
  }

  private toData(dto: SavePatientDto) {
    const identity = normalizePatientIdentity(dto);
    if (!identity.name) throw new BadRequestException("请填写姓名");
    return {
      ...identity,
      gender: dto.gender?.trim() ?? "",
      birthday: this.normalizeBirthday(dto.birthday),
      tags: normalizeTags(dto.tags),
      remark: dto.remark?.trim() ?? "",
    };
  }

  async list(filters: {
    q?: string;
    group?: string;
    tag?: string;
    page?: number;
    pageSize?: number;
  }) {
    const kw = filters.q?.trim();
    const tag = filters.tag?.trim();
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const page = Math.max(1, filters.page ?? 1);
    const group = parsePatientGroup(filters.group);
    const duplicateNames =
      group === "duplicate" ? await this.duplicateNames() : [];

    const where: Prisma.PatientWhereInput = {
      AND: [
        patientGroupWhere(group, duplicateNames),
        tag ? { tags: { has: tag } } : {},
        kw
          ? {
              OR: [
                { name: { contains: kw, mode: "insensitive" } },
                { phone: { contains: kw } },
                { chartNo: { contains: kw, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    };

    const [total, rows] = await Promise.all([
      this.prisma.patient.count({ where }),
      this.prisma.patient.findMany({
        where,
        include: {
          visits: {
            select: { visitDate: true },
            orderBy: { visitDate: "desc" },
            take: 1,
          },
          clinicVisits: {
            where: { status: { in: ATTENDED_VISIT_STATUSES } },
            select: { visitDate: true },
            orderBy: { visitDate: "desc" },
            take: 1,
          },
          pendings: { select: { id: true }, take: 1 },
          orthodontics: { select: { category: true, lastVisitDate: true } },
        },
        orderBy:
          group === "duplicate"
            ? [{ name: "asc" }, { id: "asc" }]
            : [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      total,
      list: rows.map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        chartNo: p.chartNo,
        gender: p.gender,
        birthday: p.birthday,
        age: p.age,
        tags: p.tags,
        remark: p.remark,
        createdAt: p.createdAt.toISOString(),
        lastVisitDate: latestVisitDate([
          p.visits[0]?.visitDate,
          p.clinicVisits[0]?.visitDate,
          ...p.orthodontics.map((o) => o.lastVisitDate),
        ]),
        hasImplant: p.visits.length > 0,
        hasPending: p.pendings.length > 0,
        orthodonticsCategories: [
          ...new Set(p.orthodontics.map((o) => o.category)),
        ],
      })),
    };
  }

  private async duplicateNames(): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ name: string }>
    >`SELECT name FROM "Patient" GROUP BY name HAVING COUNT(*) > 1`;
    return rows.map((r) => r.name);
  }

  async groups() {
    const duplicateNames = await this.duplicateNames();
    const groupCounts = await Promise.all(
      PATIENT_GROUPS.map((group) =>
        this.prisma.patient.count({
          where: patientGroupWhere(group, duplicateNames),
        }),
      ),
    );
    const tagRows = await this.prisma.$queryRaw<
      Array<{ tag: string; count: bigint }>
    >`SELECT t AS tag, COUNT(*)::bigint AS count FROM "Patient", unnest("tags") AS t GROUP BY t ORDER BY t`;
    return {
      groups: PATIENT_GROUPS.map((group, i) => ({
        group,
        count: groupCounts[i],
      })),
      tags: tagRows.map((r) => ({ tag: r.tag, count: Number(r.count) })),
    };
  }

  async staff() {
    const users = await this.prisma.user.findMany({
      select: { displayName: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return [...new Set(users.map((u) => u.displayName.trim()).filter(Boolean))];
  }

  async detail(id: number) {
    const p = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        visits: {
          include: { teeth: { orderBy: { id: "asc" } } },
          orderBy: [{ visitDate: "desc" }, { id: "desc" }],
        },
        pendings: { orderBy: { createdAt: "desc" } },
        orthodontics: { orderBy: { id: "asc" } },
      },
    });
    if (!p) throw new NotFoundException("患者不存在");
    return {
      id: p.id,
      name: p.name,
      phone: p.phone,
      chartNo: p.chartNo,
      gender: p.gender,
      birthday: p.birthday,
      age: p.age,
      tags: p.tags,
      remark: p.remark,
      createdAt: p.createdAt.toISOString(),
      implantVisits: p.visits.map((v) => ({
        id: v.id,
        visitDate: v.visitDate,
        remark: v.remark,
        staff: v.staff,
        teeth: v.teeth.map((t) => ({
          id: t.id,
          toothNo: t.toothNo,
          implantBrand: t.implantBrand,
          implantModel: t.implantModel,
          toothRemark: t.toothRemark,
        })),
      })),
      pendings: p.pendings.map((x) => ({
        id: x.id,
        teeth: x.teeth,
        extractionDate: x.extractionDate,
        remark: x.remark,
      })),
      orthodontics: p.orthodontics.map((o) => ({
        id: o.id,
        category: o.category,
        applianceModel: o.applianceModel,
        lastVisitDate: o.lastVisitDate,
        daysSinceLastVisit: daysSinceVisit(o.lastVisitDate),
        remark: o.remark,
        doctor: o.doctor,
      })),
    };
  }

  async create(dto: SavePatientDto) {
    const data = this.toData(dto);
    const match = patientMatchWhere(data);
    if (match && (await this.prisma.patient.findFirst({ where: match }))) {
      throw new BadRequestException("已有同名且病历号或手机号相同的患者");
    }
    const p = await this.prisma.patient.create({ data });
    return { id: p.id };
  }

  async update(id: number, dto: SavePatientDto) {
    const existing = await this.prisma.patient.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("患者不存在");
    await this.prisma.patient.update({ where: { id }, data: this.toData(dto) });
    return { ok: true };
  }

  async mergePreview(ids: number[]) {
    const rows = await this.prisma.patient.findMany({
      where: { id: { in: ids } },
      include: {
        _count: {
          select: {
            clinicVisits: true,
            medicalRecords: true,
            chargeOrders: true,
            visits: true,
            pendings: true,
            orthodontics: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      chartNo: p.chartNo,
      gender: p.gender,
      birthday: p.birthday,
      tags: p.tags,
      remark: p.remark,
      counts: {
        clinicVisits: p._count.clinicVisits,
        medicalRecords: p._count.medicalRecords,
        chargeOrders: p._count.chargeOrders,
        implantVisits: p._count.visits,
        pendings: p._count.pendings,
        orthodontics: p._count.orthodontics,
      },
    }));
  }

  /** 被合并患者的所有记录改挂到保留患者，资料按用户选定的值保存，被合并的档案删除 */
  async merge(dto: MergePatientsDto) {
    const sourceIds = [...new Set(dto.sourceIds)].filter(
      (id) => id !== dto.targetId,
    );
    if (!sourceIds.length) {
      throw new BadRequestException("请至少选择一位要合并的患者");
    }
    const patients = await this.prisma.patient.findMany({
      where: { id: { in: [dto.targetId, ...sourceIds] } },
    });
    if (patients.length !== sourceIds.length + 1) {
      throw new NotFoundException("患者不存在");
    }
    const data = this.toData(dto);
    const age =
      [dto.targetId, ...sourceIds]
        .map((id) => patients.find((p) => p.id === id)?.age)
        .find((a) => a != null) ?? null;
    const move = {
      where: { patientId: { in: sourceIds } },
      data: { patientId: dto.targetId },
    };
    await this.prisma.$transaction(async (tx) => {
      await tx.patientVisit.updateMany(move);
      await tx.medicalRecord.updateMany(move);
      await tx.chargeOrder.updateMany(move);
      await tx.implantVisit.updateMany(move);
      await tx.implantPending.updateMany(move);
      await tx.orthodonticsPatient.updateMany(move);
      await tx.patient.deleteMany({ where: { id: { in: sourceIds } } });
      await tx.patient.update({
        where: { id: dto.targetId },
        data: { ...data, age },
      });
    });
    return { id: dto.targetId };
  }

  /** 连同种植就诊、待种植、正畸记录一起删除（外键级联） */
  async remove(id: number) {
    const existing = await this.prisma.patient.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("患者不存在");
    await this.prisma.patient.delete({ where: { id } });
    return { ok: true };
  }
}
