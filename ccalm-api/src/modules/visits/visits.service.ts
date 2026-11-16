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
        appointment: { select: { id: true } },
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
      items: v.items,
      source: v.source,
      isPending: v.isPending,
      arrivedAt: v.arrivedAt?.toISOString() ?? null,
      completedAt: v.completedAt?.toISOString() ?? null,
      medicalRecordIds: v.medicalRecords.map((r) => r.id),
      chargeOrderIds: v.chargeOrders.map((c) => c.id),
      appointmentId: v.appointment?.id ?? null,
    }));
  }

  async create(dto: SaveVisitDto) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient) throw new NotFoundException("患者不存在");
    // 患者详情页「新建就诊」= 已到店，补到店时间；已完成的状态同时记完成时间
    const now = new Date();
    const v = await this.prisma.$transaction(async (tx) => {
      const visit = await tx.patientVisit.create({
        data: {
          patientId: dto.patientId,
          ...this.toData(dto),
          completedAt: dto.status === "completed" ? now : null,
        },
      });
      await tx.appointment.create({
        data: {
          patientId: dto.patientId,
          visitId: visit.id,
          visitDate: visit.visitDate,
          startTime: visit.startTime,
          endTime: visit.endTime,
          kind: visit.kind,
          status: visit.status === "completed" ? "completed" : "booked",
          doctor: visit.doctor,
          remark: visit.remark,
          items: visit.items,
          source: "walk_in",
          createdById: visit.createdById,
          completedAt: visit.completedAt,
        },
      });
      return visit;
    });
    return { id: v.id };
  }

  async update(id: number, dto: SaveVisitDto) {
    const existing = await this.prisma.patientVisit.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("就诊记录不存在");
    const now = new Date();
    const visit = await this.prisma.patientVisit.update({
      where: { id },
      data: {
        ...this.toData(dto),
        completedAt:
          dto.status === "completed"
            ? (existing.completedAt ?? now)
            : dto.status === "booked"
              ? null
              : existing.completedAt,
      },
    });
    const appointment = await this.prisma.appointment.findUnique({
      where: { visitId: id },
    });
    if (appointment) {
      await this.prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          visitDate: visit.visitDate,
          startTime: visit.startTime,
          endTime: visit.endTime,
          kind: visit.kind,
          doctor: visit.doctor,
          remark: visit.remark,
          items: visit.items,
          status: visit.status === "completed" ? "completed" : "booked",
          completedAt: visit.completedAt,
        },
      });
    }
    return { ok: true };
  }

  /** 关联的病历和收费单保留，只解除关联 */
  async remove(id: number) {
    const existing = await this.prisma.patientVisit.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("就诊记录不存在");
    await this.prisma.appointment.deleteMany({ where: { visitId: id } });
    await this.prisma.patientVisit.delete({ where: { id } });
    return { ok: true };
  }
}
