import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { SaveVisitDto } from "./dto/save-visit.dto";

@Injectable()
export class VisitsService {
  constructor(private readonly prisma: PrismaService) {}

  private toData(dto: SaveVisitDto) {
    return {
      visitDate: dto.visitDate,
      startTime: dto.startTime ?? "",
      endTime: dto.endTime ?? "",
      kind: dto.kind,
      status: dto.status,
      doctor: dto.doctor?.trim() ?? "",
      remark: dto.remark?.trim() ?? "",
    };
  }

  async list(patientId: number) {
    const rows = await this.prisma.patientVisit.findMany({
      where: { patientId },
      include: {
        medicalRecords: { select: { id: true, type: true } },
        chargeOrders: { select: { id: true } },
      },
      orderBy: [{ visitDate: "desc" }, { startTime: "desc" }, { id: "desc" }],
    });
    return rows.map((v) => ({
      id: v.id,
      patientId: v.patientId,
      visitDate: v.visitDate,
      startTime: v.startTime,
      endTime: v.endTime,
      kind: v.kind,
      status: v.status,
      doctor: v.doctor,
      remark: v.remark,
      medicalRecordIds: v.medicalRecords.map((r) => r.id),
      chargeOrderIds: v.chargeOrders.map((c) => c.id),
    }));
  }

  async create(dto: SaveVisitDto) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient) throw new NotFoundException("患者不存在");
    const v = await this.prisma.patientVisit.create({
      data: { patientId: dto.patientId, ...this.toData(dto) },
    });
    return { id: v.id };
  }

  async update(id: number, dto: SaveVisitDto) {
    const existing = await this.prisma.patientVisit.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("就诊记录不存在");
    await this.prisma.patientVisit.update({
      where: { id },
      data: this.toData(dto),
    });
    return { ok: true };
  }

  /** 关联的病历和收费单保留，只解除关联 */
  async remove(id: number) {
    const existing = await this.prisma.patientVisit.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("就诊记录不存在");
    await this.prisma.patientVisit.delete({ where: { id } });
    return { ok: true };
  }
}
