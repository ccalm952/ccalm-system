import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import dayjs from "dayjs";

import { PrismaService } from "../../prisma/prisma.service";
import {
  chargeItemAmount,
  chargeState,
  roundMoney,
  sumMoney,
} from "./charge-calc";
import { courseChargeItems } from "./course-charge";
import { AddChargePaymentDto, SaveChargeOrderDto } from "./dto/charge.dto";

const orderInclude = {
  items: { orderBy: { id: "asc" } },
  payments: {
    orderBy: [{ paidAt: "asc" }, { id: "asc" }],
    include: { visit: { select: { visitDate: true, kind: true } } },
  },
} satisfies Prisma.ChargeOrderInclude;

type OrderWithDetail = Prisma.ChargeOrderGetPayload<{
  include: typeof orderInclude;
}>;

function mapOrder(o: OrderWithDetail) {
  const paid = sumMoney(o.payments.map((p) => p.amount));
  return {
    id: o.id,
    patientId: o.patientId,
    visitId: o.visitId,
    isCourse: o.isCourse,
    chargeDate: o.chargeDate,
    doctor: o.doctor,
    status: o.status,
    state: chargeState(o.status, o.receivable, paid),
    receivable: o.receivable,
    paid,
    owed: o.status === "void" ? 0 : roundMoney(o.receivable - paid),
    remark: o.remark,
    items: o.items.map((i) => ({
      id: i.id,
      feeItemId: i.feeItemId,
      name: i.name,
      teeth: i.teeth,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      amount: i.amount,
    })),
    payments: o.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      doctor: p.doctor,
      paidAt: p.paidAt,
      visitId: p.visitId,
      visitDate: p.visit?.visitDate ?? null,
      visitKind: p.visit?.kind ?? null,
    })),
  };
}

@Injectable()
export class ChargesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(patientId: number) {
    const rows = await this.prisma.chargeOrder.findMany({
      where: { patientId },
      include: orderInclude,
      orderBy: [{ chargeDate: "desc" }, { id: "desc" }],
    });
    const orders = rows.map(mapOrder);
    const active = orders.filter((o) => o.status !== "void");
    return {
      summary: {
        receivable: sumMoney(active.map((o) => o.receivable)),
        paid: sumMoney(active.map((o) => o.paid)),
        owed: sumMoney(active.map((o) => o.owed)),
      },
      orders,
    };
  }

  /** 项目名称取自收费项目目录；未关联目录的项目只能是原单里已有的 */
  private async itemsData(
    dto: SaveChargeOrderDto,
    existingNames: string[] = [],
  ) {
    const ids = [
      ...new Set(
        dto.items.flatMap((i) => (i.feeItemId != null ? [i.feeItemId] : [])),
      ),
    ];
    const feeItems = await this.prisma.feeItem.findMany({
      where: { id: { in: ids } },
    });
    const byId = new Map(feeItems.map((f) => [f.id, f]));
    const items = dto.items.map((i) => {
      let name = i.name.trim();
      if (i.feeItemId != null) {
        const feeItem = byId.get(i.feeItemId);
        if (!feeItem) throw new BadRequestException("收费项目不存在");
        name = feeItem.name;
      } else if (!existingNames.includes(name)) {
        throw new BadRequestException("请从收费项目中选择");
      }
      return {
        feeItemId: i.feeItemId ?? null,
        name,
        teeth: i.teeth?.trim() ?? "",
        unitPrice: roundMoney(i.unitPrice),
        quantity: i.quantity,
        amount: chargeItemAmount(i.unitPrice, i.quantity),
      };
    });
    return { items, receivable: sumMoney(items.map((i) => i.amount)) };
  }

  private async checkVisit(patientId: number, visitId?: number | null) {
    if (visitId == null) return null;
    const visit = await this.prisma.patientVisit.findUnique({
      where: { id: visitId },
    });
    if (!visit || visit.patientId !== patientId) {
      throw new BadRequestException("关联的就诊不存在");
    }
    return visitId;
  }

  async create(dto: SaveChargeOrderDto) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient) throw new NotFoundException("患者不存在");
    const visitId = await this.checkVisit(dto.patientId, dto.visitId);
    const { items, receivable } = await this.itemsData(dto);
    const paidAmount = roundMoney(dto.paidAmount ?? 0);
    if (paidAmount > receivable) {
      throw new BadRequestException("实收不能超过应收");
    }
    const order = await this.prisma.chargeOrder.create({
      data: {
        patientId: dto.patientId,
        visitId,
        chargeDate: dto.chargeDate,
        doctor: dto.doctor?.trim() ?? "",
        remark: dto.remark?.trim() ?? "",
        receivable,
        items: { create: items },
        payments:
          paidAmount > 0
            ? {
                create: {
                  amount: paidAmount,
                  method: dto.payMethod?.trim() ?? "",
                  paidAt: dto.chargeDate,
                  visitId,
                },
              }
            : undefined,
      },
      include: orderInclude,
    });
    return mapOrder(order);
  }

  private async courseRecord(recordId: number) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id: recordId },
      include: {
        planItems: {
          orderBy: { sort: "asc" },
          include: { lines: { orderBy: { sort: "asc" } } },
        },
      },
    });
    if (!record) throw new NotFoundException("病历不存在");
    if (record.type !== "first" && record.type !== "orthoFirst") {
      throw new BadRequestException("只有初诊病历可以生成治疗收费单");
    }
    return record;
  }

  /** 以初诊病历为一个治疗，按治疗计划报价生成一张收费单；后续只分次收款 */
  async createForCourse(recordId: number) {
    const record = await this.courseRecord(recordId);
    if (record.visitId == null) {
      throw new BadRequestException(
        "初诊病历还没有关联就诊，不能生成治疗收费单",
      );
    }
    const existing = await this.prisma.chargeOrder.findFirst({
      where: { visitId: record.visitId, isCourse: true },
    });
    if (existing) throw new BadRequestException("该治疗已生成收费单");
    const { items, unquotedCount, receivable } = courseChargeItems(
      record.planItems,
    );
    if (!items.length) {
      throw new BadRequestException("治疗计划还没有报价，请先填写单价");
    }
    const order = await this.prisma.chargeOrder.create({
      data: {
        patientId: record.patientId,
        visitId: record.visitId,
        isCourse: true,
        chargeDate: dayjs().format("YYYY-MM-DD"),
        doctor: record.doctor,
        receivable,
        items: { create: items },
      },
      include: orderInclude,
    });
    return { order: mapOrder(order), unquotedCount };
  }
  async syncForCourse(recordId: number) {
    const record = await this.courseRecord(recordId);
    if (record.visitId == null) {
      throw new BadRequestException("初诊病历还没有关联就诊，不能同步收费单");
    }
    const order = await this.prisma.chargeOrder.findFirst({
      where: { visitId: record.visitId, isCourse: true },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException("该治疗还没有收费单");
    if (order.status === "void") {
      throw new BadRequestException("已作废的收费单不能同步");
    }
    const { items, unquotedCount, receivable } = courseChargeItems(
      record.planItems,
    );
    if (!items.length) {
      throw new BadRequestException("治疗计划还没有报价，请先填写单价");
    }
    const paid = sumMoney(order.payments.map((p) => p.amount));
    if (receivable < paid) {
      throw new BadRequestException("新总价低于已收金额，请先处理退款");
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.chargeItem.deleteMany({ where: { orderId: order.id } });
      return tx.chargeOrder.update({
        where: { id: order.id },
        data: { receivable, items: { create: items } },
        include: orderInclude,
      });
    });
    return { order: mapOrder(updated), unquotedCount };
  }
  /** 按就诊收款：找到该就诊对应的初诊病历，记到其治疗收费单上 */
  async collectByVisit(dto: {
    patientId: number;
    visitId: number;
    amount: number;
    method?: string;
    doctor?: string;
    paidAt: string;
  }) {
    const visit = await this.prisma.patientVisit.findFirst({
      where: { id: dto.visitId, patientId: dto.patientId },
    });
    if (!visit) throw new NotFoundException("就诊记录不存在");
    const initial = await this.resolveInitialRecord(visit.id);
    if (!initial) {
      throw new BadRequestException("该就诊没有关联初诊病历，不能收费");
    }
    if (initial.visitId == null) {
      throw new BadRequestException("初诊病历还没有关联就诊，不能收费");
    }
    let order = await this.prisma.chargeOrder.findFirst({
      where: { visitId: initial.visitId, isCourse: true },
      include: orderInclude,
    });
    if (!order) {
      const { items, unquotedCount, receivable } = courseChargeItems(
        initial.planItems,
      );
      if (!items.length) {
        throw new BadRequestException(
          unquotedCount > 0
            ? "治疗计划还没有报价，请先填写单价"
            : "初诊病历还没有治疗计划，不能收费",
        );
      }
      order = await this.prisma.chargeOrder.create({
        data: {
          patientId: dto.patientId,
          visitId: initial.visitId,
          isCourse: true,
          chargeDate: dto.paidAt,
          doctor: initial.doctor,
          receivable,
          items: { create: items },
        },
        include: orderInclude,
      });
    }
    const paid = sumMoney(order.payments.map((p) => p.amount));
    const owed = roundMoney(order.receivable - paid);
    if (dto.amount > owed) {
      throw new BadRequestException("收款金额不能超过欠费");
    }
    const updated = await this.prisma.chargeOrder.update({
      where: { id: order.id },
      data: {
        payments: {
          create: {
            amount: dto.amount,
            method: dto.method?.trim() ?? "",
            doctor: dto.doctor?.trim() || visit.doctor,
            paidAt: dto.paidAt,
            visitId: visit.id,
          },
        },
      },
      include: orderInclude,
    });
    return { order: mapOrder(updated) };
  }

  /** 就诊对应的初诊病历：初诊本身或复诊计划关联的初诊 */
  private async resolveInitialRecord(visitId: number) {
    const direct = await this.prisma.medicalRecord.findFirst({
      where: {
        visitId,
        type: { in: ["first", "orthoFirst"] },
      },
      include: {
        planItems: {
          orderBy: { sort: "asc" },
          include: { lines: { orderBy: { sort: "asc" } } },
        },
      },
      orderBy: { id: "asc" },
    });
    if (direct) return direct;
    const follow = await this.prisma.medicalRecord.findFirst({
      where: { visitId, type: { in: ["return", "orthoReturn"] } },
      include: {
        planLinks: {
          include: { planItem: { select: { recordId: true } } },
          orderBy: { planItem: { sort: "asc" } },
        },
      },
      orderBy: { id: "asc" },
    });
    const recordId = follow?.planLinks[0]?.planItem.recordId;
    if (!recordId) return null;
    return this.prisma.medicalRecord.findUnique({
      where: { id: recordId },
      include: {
        planItems: {
          orderBy: { sort: "asc" },
          include: { lines: { orderBy: { sort: "asc" } } },
        },
      },
    });
  }
  private async findOrder(id: number) {
    const order = await this.prisma.chargeOrder.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException("收费单不存在");
    return order;
  }

  async update(id: number, dto: SaveChargeOrderDto) {
    const existing = await this.findOrder(id);
    if (existing.patientId !== dto.patientId) {
      throw new BadRequestException("收费单不属于该患者");
    }
    if (existing.status === "void") {
      throw new BadRequestException("已作废的收费单不能修改");
    }
    const visitId = await this.checkVisit(dto.patientId, dto.visitId);
    const { items, receivable } = await this.itemsData(
      dto,
      existing.items.map((i) => i.name),
    );
    const paid = sumMoney(existing.payments.map((p) => p.amount));
    if (receivable < paid) {
      throw new BadRequestException("应收不能低于已收金额");
    }
    const order = await this.prisma.$transaction(async (tx) => {
      await tx.chargeItem.deleteMany({ where: { orderId: id } });
      return tx.chargeOrder.update({
        where: { id },
        data: {
          visitId,
          chargeDate: dto.chargeDate,
          doctor: dto.doctor?.trim() ?? "",
          remark: dto.remark?.trim() ?? "",
          receivable,
          items: { create: items },
        },
        include: orderInclude,
      });
    });
    return mapOrder(order);
  }

  async addPayment(id: number, dto: AddChargePaymentDto) {
    const existing = mapOrder(await this.findOrder(id));
    if (existing.status === "void") {
      throw new BadRequestException("已作废的收费单不能收款");
    }
    const amount = roundMoney(dto.amount);
    if (amount > existing.owed) {
      throw new BadRequestException("收款金额不能超过欠费");
    }
    const visitId = await this.checkVisit(existing.patientId, dto.visitId);
    const visitDoctor = visitId
      ? (
          await this.prisma.patientVisit.findUnique({
            where: { id: visitId },
            select: { doctor: true },
          })
        )?.doctor
      : "";
    await this.prisma.chargePayment.create({
      data: {
        orderId: id,
        amount,
        method: dto.method?.trim() ?? "",
        doctor: dto.doctor?.trim() || visitDoctor || "",
        paidAt: dto.paidAt,
        visitId,
      },
    });
    return mapOrder(await this.findOrder(id));
  }

  async voidOrder(id: number) {
    await this.findOrder(id);
    await this.prisma.chargeOrder.update({
      where: { id },
      data: { status: "void" },
    });
    return mapOrder(await this.findOrder(id));
  }

  async remove(id: number) {
    await this.findOrder(id);
    await this.prisma.chargeOrder.delete({ where: { id } });
    return { ok: true };
  }
}
