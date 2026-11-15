import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import dayjs from "dayjs";

import { PrismaService } from "../../prisma/prisma.service";
import { PermissionsService } from "../../common/permissions/permissions.service";
import {
  APPOINTMENT_SOURCES,
  DEFAULT_DURATION,
  DURATION_OPTIONS,
  PENDING_REASONS,
  PENDING_REASON_LABELS,
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  hasOverlap,
  fromMinutes,
  TIME_PATTERN,
  toMinutes,
} from "./appointment-options";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";

const OPEN_STATUS = "booked";

type Actor = { userId: string };

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  // ---------- 元数据 ----------

  async meta() {
    const users = await this.prisma.user.findMany({
      select: {
        displayName: true,
        roles: { select: { bookable: true, assistable: true } },
      },
      orderBy: { sortOrder: "asc" },
    });
    const doctors = [
      ...new Set(
        users
          .filter((u) => u.roles.some((r) => r.bookable))
          .map((u) => u.displayName),
      ),
    ];
    const nurses = [
      ...new Set(
        users
          .filter((u) => u.roles.some((r) => r.assistable))
          .map((u) => u.displayName),
      ),
    ];
    const categories = await this.prisma.appointmentCategory.findMany({
      where: { enabled: true },
      orderBy: [{ sort: "asc" }, { id: "asc" }],
      include: {
        items: {
          where: { enabled: true },
          orderBy: [{ sort: "asc" }, { id: "asc" }],
          select: { id: true, name: true, color: true },
        },
      },
    });
    const shift = await this.prisma.shiftConfig.findUnique({
      where: { id: "global" },
      select: { morningRangeStart: true, afternoonRangeEnd: true },
    });
    return {
      workStart: fromMinutes(toMinutes(shift?.morningRangeStart ?? "08:30")),
      workEnd: fromMinutes(toMinutes(shift?.afternoonRangeEnd ?? "18:00")),
      doctors,
      nurses,
      items: categories.map((c) => ({
        id: c.id,
        name: c.name,
        items: c.items,
      })),
      durations: DURATION_OPTIONS,
      defaultDuration: DEFAULT_DURATION,
      statuses: APPOINTMENT_STATUSES,
      statusLabels: APPOINTMENT_STATUS_LABELS,
      pendingReasons: PENDING_REASONS.map((key) => ({
        key,
        label: PENDING_REASON_LABELS[key],
      })),
      sources: APPOINTMENT_SOURCES,
    };
  }

  // ---------- 看板 ----------

  async board(query: {
    from?: string;
    to?: string;
    doctorIds?: string;
    statuses?: string;
  }) {
    const from = query.from || dayjs().format("YYYY-MM-DD");
    const to = query.to || dayjs(from).add(6, "day").format("YYYY-MM-DD");
    if (to < from) throw new BadRequestException("结束日期不能早于开始日期");
    if (dayjs(to).diff(dayjs(from), "day") > 62) {
      throw new BadRequestException("时间范围最多 62 天");
    }
    const statuses = query.statuses
      ? query.statuses.split(",").filter((s) => s && s !== "all")
      : [...APPOINTMENT_STATUSES];
    const doctorNames = query.doctorIds
      ? query.doctorIds.split(",").filter(Boolean)
      : [];

    const rows = await this.prisma.patientVisit.findMany({
      where: {
        visitDate: { gte: from, lte: to },
        status: { in: statuses },
        ...(doctorNames.length ? { doctor: { in: doctorNames } } : {}),
      },
      include: {
        patient: {
          select: {
            name: true,
            chartNo: true,
            gender: true,
            age: true,
            phone: true,
          },
        },
      },
      orderBy: [{ visitDate: "asc" }, { startTime: "asc" }, { id: "asc" }],
    });

    const appointments = rows.map((v) => ({
      id: v.id,
      patientId: v.patientId,
      patientName: v.patient.name,
      chartNo: v.patient.chartNo,
      gender: v.patient.gender,
      age: v.patient.age,
      phone: v.patient.phone,
      visitDate: v.visitDate,
      startTime: v.startTime,
      endTime: v.endTime,
      doctor: v.doctor,
      kind: v.kind,
      status: v.status,
      arrived: v.arrivedAt != null,
      items: v.items,
      isPending: v.isPending,
      pendingReason: v.pendingReason,
      remark: v.remark,
      createdById: v.createdById,
    }));

    const days: {
      date: string;
      counts: Record<string, number>;
    }[] = [];
    for (let d = dayjs(from); !d.isAfter(dayjs(to)); d = d.add(1, "day")) {
      const date = d.format("YYYY-MM-DD");
      const dayRows = appointments.filter((a) => a.visitDate === date);
      const counts: Record<string, number> = {};
      for (const s of APPOINTMENT_STATUSES) counts[s] = 0;
      for (const a of dayRows) counts[a.status] = (counts[a.status] ?? 0) + 1;
      days.push({ date, counts });
    }

    const doctors = (await this.meta()).doctors.map((name) => ({
      name,
      count: appointments.filter((a) => a.doctor === name).length,
    }));

    return { range: { from, to }, days, doctors, appointments };
  }

  /** 列表页：按日期区间 + 状态 + 医生 + 关键字筛，最多 1000 条 */

  /** 患者未来 90 天的预约（新建/修改预约时提示"已有预约"，避免重复排） */
  async upcoming(patientId: number) {
    const today = dayjs().format("YYYY-MM-DD");
    const to = dayjs().add(90, "day").format("YYYY-MM-DD");
    const rows = await this.prisma.patientVisit.findMany({
      where: {
        patientId,
        visitDate: { gte: today, lte: to },
        status: OPEN_STATUS,
      },
      orderBy: [{ visitDate: "asc" }, { startTime: "asc" }],
      take: 5,
    });
    return rows.map((v) => ({
      id: v.id,
      visitDate: v.visitDate,
      startTime: v.startTime,
      doctor: v.doctor,
      items: v.items,
      isPending: v.isPending,
    }));
  }
  async pending() {
    const rows = await this.prisma.patientVisit.findMany({
      where: { isPending: true, status: OPEN_STATUS },
      include: {
        patient: { select: { name: true, chartNo: true, phone: true } },
      },
      orderBy: [{ visitDate: "asc" }, { id: "asc" }],
    });
    return rows.map((v) => ({
      id: v.id,
      patientId: v.patientId,
      patientName: v.patient.name,
      chartNo: v.patient.chartNo,
      phone: v.patient.phone,
      visitDate: v.visitDate,
      doctor: v.doctor,
      items: v.items,
      pendingReason: v.pendingReason,
      expired: v.visitDate < dayjs().format("YYYY-MM-DD"),
      remark: v.remark,
    }));
  }

  // ---------- 校验 ----------

  private endTimeFor(startTime: string, durationMinutes: number): string {
    return fromMinutes(toMinutes(startTime) + durationMinutes);
  }

  private normalizeDuration(raw?: number): number {
    const duration = raw ?? DEFAULT_DURATION;
    if (!DURATION_OPTIONS.includes(duration as never)) {
      throw new BadRequestException("持续时间只能是 15/30/45/60/90/120 分钟");
    }
    return duration;
  }

  private assertSlotValid(startTime: string, endTime: string) {
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    if (start % 15 !== 0 || end % 15 !== 0) {
      throw new BadRequestException("预约时间需为 15 分钟的整数倍");
    }
    const duration = end - start;
    if (duration < 15 || duration > 120) {
      throw new BadRequestException("预约时长需在 15–120 分钟之间");
    }
  }

  private async assertTimeFree(params: {
    patientId: number;
    visitDate: string;
    startTime: string;
    endTime: string;
    doctor: string;
    excludeId?: number;
  }) {
    const { patientId, visitDate, startTime, endTime, doctor, excludeId } =
      params;
    const sameDay = await this.prisma.patientVisit.findMany({
      where: {
        visitDate,
        status: OPEN_STATUS,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        patientId: true,
        doctor: true,
        startTime: true,
        endTime: true,
      },
    });

    const patientConflict = sameDay.find(
      (v) =>
        v.patientId === patientId &&
        hasOverlap(startTime, endTime, v.startTime, v.endTime),
    );
    if (patientConflict) {
      throw new BadRequestException("该患者当天这个时段已有预约");
    }

    if (!doctor) return;
    const doctorConflict = sameDay.find(
      (v) =>
        v.doctor === doctor &&
        hasOverlap(startTime, endTime, v.startTime, v.endTime),
    );
    if (doctorConflict) {
      throw new BadRequestException(
        `医生「${doctor}」该时段已有预约，确认要同时安排吗？`,
      );
    }
  }

  private async canEdit(actor: Actor, visit: { createdById: string | null }) {
    if (visit.createdById === actor.userId) return true;
    return await this.permissions.has(actor.userId, "appointment.edit_any");
  }

  // ---------- 写操作 ----------

  async create(dto: CreateAppointmentDto, actor: Actor) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException("患者不存在");

    const isPending = dto.isPending ?? (!dto.doctor || !dto.startTime);
    const duration = this.normalizeDuration(dto.durationMinutes);
    let startTime = dto.startTime ?? "";
    let endTime = dto.endTime ?? "";

    if (!isPending) {
      if (!startTime || !TIME_PATTERN.test(startTime)) {
        throw new BadRequestException("请选择预约开始时间");
      }
      if (!dto.doctor) throw new BadRequestException("请选择预约医生");
      if (endTime) {
        if (!TIME_PATTERN.test(endTime) || endTime <= startTime) {
          throw new BadRequestException("结束时间必须晚于开始时间");
        }
      } else {
        endTime = this.endTimeFor(startTime, duration);
      }
      this.assertSlotValid(startTime, endTime);
      await this.assertTimeFree({
        patientId: dto.patientId,
        visitDate: dto.visitDate,
        startTime,
        endTime,
        doctor: dto.doctor,
      });
    } else {
      startTime = "";
      endTime = "";
    }

    const created = await this.prisma.patientVisit.create({
      data: {
        patientId: dto.patientId,
        visitDate: dto.visitDate,
        startTime,
        endTime,
        kind: dto.kind ?? "return",
        status: OPEN_STATUS,
        doctor: dto.doctor ?? "",
        items: dto.items ?? [],
        remark: dto.remark ?? "",
        isPending,
        pendingReason: isPending ? (dto.pendingReason ?? "patient_time") : "",
        source: dto.source ?? "manual",
        createdById: actor.userId,
      },
    });
    return { id: created.id };
  }

  async update(id: number, dto: UpdateAppointmentDto, actor: Actor) {
    const existing = await this.prisma.patientVisit.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("预约不存在");
    if (!(await this.canEdit(actor, existing))) {
      throw new ForbiddenException("只能修改自己创建的预约");
    }
    if (existing.status !== OPEN_STATUS) {
      throw new BadRequestException("已完成/失约/取消的预约不能再改");
    }

    const duration = this.normalizeDuration(dto.durationMinutes);
    const visitDate = dto.visitDate ?? existing.visitDate;
    const patientId = dto.patientId ?? existing.patientId;
    if (dto.patientId && dto.patientId !== existing.patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { id: dto.patientId },
        select: { id: true },
      });
      if (!patient) throw new NotFoundException("患者不存在");
    }
    const isPending = dto.isPending ?? existing.isPending;
    const doctor = dto.doctor ?? existing.doctor;
    let startTime = dto.startTime ?? existing.startTime;
    let endTime: string;

    if (!isPending) {
      if (!doctor) throw new BadRequestException("请选择预约医生");
      if (!startTime) throw new BadRequestException("请选择预约开始时间");
      endTime =
        dto.endTime ??
        (dto.startTime || dto.durationMinutes
          ? this.endTimeFor(startTime, duration)
          : existing.endTime);
      if (!endTime || endTime <= startTime) {
        throw new BadRequestException("结束时间必须晚于开始时间");
      }
      this.assertSlotValid(startTime, endTime);
      await this.assertTimeFree({
        patientId,
        visitDate,
        startTime,
        endTime,
        doctor,
        excludeId: id,
      });
    } else {
      startTime = "";
      endTime = "";
    }

    await this.prisma.patientVisit.update({
      where: { id },
      data: {
        patientId,
        visitDate,
        startTime,
        endTime,
        doctor,
        kind: dto.kind ?? existing.kind,
        items: dto.items ?? existing.items,
        remark: dto.remark ?? existing.remark,
        isPending,
        pendingReason: isPending
          ? (dto.pendingReason ?? existing.pendingReason ?? "patient_time")
          : "",
        source: dto.source ?? existing.source,
      },
    });
    return { ok: true };
  }

  async arrive(id: number) {
    const visit = await this.prisma.patientVisit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException("预约不存在");
    if (visit.status !== OPEN_STATUS) {
      throw new BadRequestException("只有预约中的记录可以登记到店");
    }
    if (visit.arrivedAt) return { ok: true };
    await this.prisma.patientVisit.update({
      where: { id },
      data: { arrivedAt: new Date() },
    });
    return { ok: true };
  }

  async miss(id: number, reason: string, actor: Actor) {
    return await this.close(id, "missed", reason, actor);
  }

  async cancel(id: number, reason: string, actor: Actor) {
    return await this.close(id, "cancelled", reason, actor);
  }

  private async close(
    id: number,
    status: "missed" | "cancelled",
    reason: string,
    actor: Actor,
  ) {
    const visit = await this.prisma.patientVisit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException("预约不存在");
    if (!(await this.canEdit(actor, visit))) {
      throw new ForbiddenException("只能操作自己创建的预约");
    }
    if (visit.status !== OPEN_STATUS) {
      throw new BadRequestException("只有预约中的记录可以失约/取消");
    }
    await this.prisma.patientVisit.update({
      where: { id },
      data: { status, cancelReason: reason.trim() },
    });
    return { ok: true };
  }

  async revert(id: number, actor: Actor) {
    const visit = await this.prisma.patientVisit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException("预约不存在");
    if (!(await this.canEdit(actor, visit))) {
      throw new ForbiddenException("只能操作自己创建的预约");
    }
    if (visit.status !== "missed" && visit.status !== "cancelled") {
      throw new BadRequestException("只有失约/取消的预约可以撤销");
    }
    await this.prisma.patientVisit.update({
      where: { id },
      data: { status: OPEN_STATUS, cancelReason: "" },
    });
    return { ok: true };
  }

  async remove(id: number, opts?: { allowPast?: boolean }) {
    const visit = await this.prisma.patientVisit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException("预约不存在");
    if (visit.status === "completed") {
      throw new BadRequestException("已完成的记录不能删除");
    }
    const today = dayjs().format("YYYY-MM-DD");
    if (!visit.isPending && visit.visitDate < today && !opts?.allowPast) {
      throw new BadRequestException("过去的预约不能删除，请改为取消/失约");
    }
    await this.prisma.patientVisit.delete({ where: { id } });
    return { ok: true };
  }
}
