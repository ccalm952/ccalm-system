import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import dayjs from "dayjs";

import { PrismaService } from "../../prisma/prisma.service";
import { CompleteFollowUpDto } from "./dto/complete-follow-up.dto";
import { SaveFollowUpDto } from "./dto/save-follow-up.dto";
import { isFollowUpDue } from "./follow-up-options";

const FOLLOW_UP_INCLUDE = {
  patient: { select: { name: true, phone: true, chartNo: true } },
} satisfies Prisma.FollowUpInclude;

type FollowUpWithPatient = Prisma.FollowUpGetPayload<{
  include: typeof FOLLOW_UP_INCLUDE;
}>;

@Injectable()
export class FollowUpsService {
  constructor(private readonly prisma: PrismaService) {}

  private today() {
    return dayjs().format("YYYY-MM-DD");
  }

  private mapRow(row: FollowUpWithPatient) {
    return {
      id: row.id,
      patientId: row.patientId,
      name: row.patient.name,
      phone: row.patient.phone,
      chartNo: row.patient.chartNo,
      type: row.type,
      planDate: row.planDate,
      content: row.content,
      doctor: row.doctor,
      status: row.status,
      result: row.result,
      satisfaction: row.satisfaction,
      completedAt: row.completedAt ? row.completedAt.toISOString() : null,
      due: isFollowUpDue(row.status, row.planDate, this.today()),
    };
  }

  async list(params: { patientId?: number; due?: boolean; status?: string }) {
    const where: Prisma.FollowUpWhereInput = {};
    if (params.patientId != null) where.patientId = params.patientId;
    if (params.due) {
      where.status = "pending";
      where.planDate = { lte: this.today() };
    } else if (params.status) {
      where.status = params.status;
    }
    const rows = await this.prisma.followUp.findMany({
      where,
      include: FOLLOW_UP_INCLUDE,
      orderBy: params.due
        ? [{ planDate: "asc" }, { id: "asc" }]
        : [{ planDate: "desc" }, { id: "desc" }],
    });
    return rows.map((row) => this.mapRow(row));
  }

  async create(dto: SaveFollowUpDto) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient) throw new NotFoundException("患者不存在");
    const row = await this.prisma.followUp.create({
      data: {
        patientId: dto.patientId,
        type: dto.type,
        planDate: dto.planDate,
        content: dto.content?.trim() ?? "",
        doctor: dto.doctor?.trim() ?? "",
      },
      include: FOLLOW_UP_INCLUDE,
    });
    return this.mapRow(row);
  }

  async update(id: number, dto: SaveFollowUpDto) {
    const existing = await this.prisma.followUp.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("随访不存在");
    if (existing.status === "done") {
      throw new BadRequestException("已随访的任务不能再修改");
    }
    const row = await this.prisma.followUp.update({
      where: { id },
      data: {
        type: dto.type,
        planDate: dto.planDate,
        content: dto.content?.trim() ?? "",
        doctor: dto.doctor?.trim() ?? "",
      },
      include: FOLLOW_UP_INCLUDE,
    });
    return this.mapRow(row);
  }

  /** 执行随访；填了下次日期就顺带生成下一条待随访 */
  async complete(id: number, dto: CompleteFollowUpDto) {
    const existing = await this.prisma.followUp.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("随访不存在");
    if (existing.status !== "pending") {
      throw new BadRequestException("该随访已处理，不能再执行");
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.followUp.update({
        where: { id },
        data: {
          status: "done",
          result: dto.result?.trim() ?? "",
          satisfaction: dto.satisfaction ?? "",
          completedAt: new Date(),
        },
        include: FOLLOW_UP_INCLUDE,
      });
      if (dto.nextPlanDate) {
        await tx.followUp.create({
          data: {
            patientId: existing.patientId,
            type: existing.type,
            planDate: dto.nextPlanDate,
            content: existing.content,
            doctor: existing.doctor,
          },
        });
      }
      return updated;
    });
    return this.mapRow(row);
  }

  async cancel(id: number) {
    const existing = await this.prisma.followUp.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("随访不存在");
    if (existing.status !== "pending") {
      throw new BadRequestException("该随访已处理，不能再取消");
    }
    const row = await this.prisma.followUp.update({
      where: { id },
      data: { status: "cancelled" },
      include: FOLLOW_UP_INCLUDE,
    });
    return this.mapRow(row);
  }

  async remove(id: number) {
    const existing = await this.prisma.followUp.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("随访不存在");
    await this.prisma.followUp.delete({ where: { id } });
    return { ok: true };
  }
}
