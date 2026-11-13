import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import {
  chargeItemAmount,
  chargeState,
  roundMoney,
  sumMoney,
} from "./charge-calc";
import { AddChargePaymentDto, SaveChargeOrderDto } from "./dto/charge.dto";

const orderInclude = {
  items: { orderBy: { id: "asc" } },
  payments: { orderBy: [{ paidAt: "asc" }, { id: "asc" }] },
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
      paidAt: p.paidAt,
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
                },
              }
            : undefined,
      },
      include: orderInclude,
    });
    return mapOrder(order);
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
    await this.prisma.chargePayment.create({
      data: {
        orderId: id,
        amount,
        method: dto.method?.trim() ?? "",
        paidAt: dto.paidAt,
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
