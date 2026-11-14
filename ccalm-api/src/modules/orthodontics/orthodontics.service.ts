import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OrthodonticsCategory } from "@prisma/client";
import dayjs from "dayjs";

import { PrismaService } from "../../prisma/prisma.service";
import {
  findOrCreatePatient,
  normalizePatientIdentity,
} from "../patients/patient-identity";
import {
  CreateOrthodonticsPatientDto,
  UpdateOrthodonticsPatientDto,
} from "./dto/orthodontics-patient.dto";
import { daysSinceVisit } from "./follow-up";
import { ORTHO_VISIT_REMARK } from "../visits/visit-options";

const CATEGORY_SET = new Set<string>(Object.values(OrthodonticsCategory));

@Injectable()
export class OrthodonticsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseCategory(raw?: string): OrthodonticsCategory {
    if (!raw || !CATEGORY_SET.has(raw)) {
      throw new BadRequestException("无效的正畸分类");
    }
    return raw as OrthodonticsCategory;
  }

  private normalizeDate(raw?: string | null): string | null {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    const d = dayjs(s);
    if (!d.isValid()) {
      throw new BadRequestException("上次就诊时间格式无效");
    }
    return d.format("YYYY-MM-DD");
  }

  private mapRow(row: {
    id: number;
    category: OrthodonticsCategory;
    patientId: number;
    patient: { name: string; phone: string; chartNo: string };
    applianceModel: string;
    lastVisitDate: string | null;
    followUp: string;
    remark: string;
    doctor: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      category: row.category,
      patientId: row.patientId,
      chartNo: row.patient.chartNo,
      name: row.patient.name,
      phone: row.patient.phone,
      applianceModel: row.applianceModel,
      lastVisitDate: row.lastVisitDate,
      daysSinceLastVisit: daysSinceVisit(row.lastVisitDate),
      followUp: row.followUp,
      remark: row.remark,
      doctor: row.doctor,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(categoryRaw?: string, q?: string) {
    const category = categoryRaw?.trim()
      ? this.parseCategory(categoryRaw)
      : undefined;
    const keyword = q?.trim();
    const rows = await this.prisma.orthodonticsPatient.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(keyword
          ? {
              OR: [
                {
                  patient: {
                    OR: [
                      { name: { contains: keyword, mode: "insensitive" } },
                      { phone: { contains: keyword } },
                      { chartNo: { contains: keyword, mode: "insensitive" } },
                    ],
                  },
                },
                { doctor: { contains: keyword, mode: "insensitive" } },
                { remark: { contains: keyword, mode: "insensitive" } },
                { followUp: { contains: keyword, mode: "insensitive" } },
                { applianceModel: { contains: keyword, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { patient: true },
      orderBy: [{ lastVisitDate: "asc" }, { id: "asc" }],
    });
    return rows.map((row) => this.mapRow(row));
  }

  async create(dto: CreateOrthodonticsPatientDto) {
    const identity = normalizePatientIdentity(dto);
    if (!identity.name) throw new BadRequestException("请填写姓名");
    const category = this.parseCategory(dto.category);
    const lastVisitDate = this.normalizeDate(dto.lastVisitDate);
    const row = await this.prisma.$transaction(async (tx) => {
      const patient = await findOrCreatePatient(tx, identity, {
        patientId: dto.patientId,
      });
      return tx.orthodonticsPatient.create({
        data: {
          category,
          patientId: patient.id,
          applianceModel: dto.applianceModel?.trim() ?? "",
          lastVisitDate,
          followUp: dto.followUp?.trim() ?? "",
          remark: dto.remark?.trim() ?? "",
          doctor: dto.doctor?.trim() ?? "",
        },
        include: { patient: true },
      });
    });
    return this.mapRow(row);
  }

  async update(id: number, dto: UpdateOrthodonticsPatientDto) {
    const existing = await this.prisma.orthodonticsPatient.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("记录不存在");
    const identity = normalizePatientIdentity(dto);
    if (!identity.name) throw new BadRequestException("请填写姓名");
    const lastVisitDate = this.normalizeDate(dto.lastVisitDate);
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.patient.update({
        where: { id: existing.patientId },
        data: identity,
      });
      return tx.orthodonticsPatient.update({
        where: { id },
        data: {
          applianceModel: dto.applianceModel?.trim() ?? "",
          lastVisitDate,
          followUp: dto.followUp?.trim() ?? "",
          remark: dto.remark?.trim() ?? "",
          doctor: dto.doctor?.trim() ?? "",
          ...(dto.category != null
            ? { category: this.parseCategory(dto.category) }
            : {}),
        },
        include: { patient: true },
      });
    });
    return this.mapRow(row);
  }

  /** 点「就诊」：今天已有未完成就诊就复用，否则建一条「已到店」的就诊，并把上次就诊推到今天 */
  async markVisited(id: number) {
    const existing = await this.prisma.orthodonticsPatient.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("记录不存在");
    const today = dayjs().format("YYYY-MM-DD");

    const visitId = await this.prisma.$transaction(async (tx) => {
      const open = await tx.patientVisit.findFirst({
        where: {
          patientId: existing.patientId,
          visitDate: today,
          status: { in: ["booked", "arrived"] },
        },
        orderBy: { id: "desc" },
      });
      if (open) {
        if (open.status !== "arrived") {
          await tx.patientVisit.update({
            where: { id: open.id },
            data: { status: "arrived" },
          });
        }
        return open.id;
      }
      const created = await tx.patientVisit.create({
        data: {
          patientId: existing.patientId,
          visitDate: today,
          startTime: dayjs().format("HH:mm"),
          kind: "return",
          status: "arrived",
          doctor: existing.doctor,
          remark: ORTHO_VISIT_REMARK,
        },
      });
      return created.id;
    });

    const lastVisitDate =
      existing.lastVisitDate && existing.lastVisitDate >= today
        ? existing.lastVisitDate
        : today;
    const row = await this.prisma.orthodonticsPatient.update({
      where: { id },
      data: { lastVisitDate },
      include: { patient: true },
    });
    return { ...this.mapRow(row), visitId };
  }

  async remove(id: number) {
    const existing = await this.prisma.orthodonticsPatient.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("记录不存在");
    await this.prisma.orthodonticsPatient.delete({ where: { id } });
    return { ok: true };
  }
}
