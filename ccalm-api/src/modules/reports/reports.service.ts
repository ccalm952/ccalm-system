import { BadRequestException, Injectable } from "@nestjs/common";
import dayjs from "dayjs";

import { PrismaService } from "../../prisma/prisma.service";
import { roundMoney } from "../charges/charge-calc";
import type { RevenueGranularity } from "./dto/revenue-query.dto";

/** 单次查询最长区间（天），避免一次拉过多数据 */
const MAX_RANGE_DAYS = 1100;

type DistributionRow = {
  name: string;
  /** 期间实收（按收款日期归属） */
  received: number;
  /** 期间开单应收（按开单日期归属） */
  receivable: number;
};

type Acc = { received: number; receivable: number };

type ChargeItemRow = {
  name: string;
  amount: number;
  feeItemId: number | null;
};

type FeeMeta = { category: string; item: string };

function addAcc(map: Map<string, Acc>, name: string, add: Partial<Acc>): void {
  const label = name.trim() || "未指定";
  const cur = map.get(label) ?? { received: 0, receivable: 0 };
  cur.received += add.received ?? 0;
  cur.receivable += add.receivable ?? 0;
  map.set(label, cur);
}

function toRows(map: Map<string, Acc>): DistributionRow[] {
  return [...map.entries()]
    .map(([name, v]) => ({
      name,
      received: roundMoney(v.received),
      receivable: roundMoney(v.receivable),
    }))
    .filter((row) => row.received !== 0 || row.receivable !== 0)
    .sort(
      (a, b) =>
        b.received - a.received ||
        b.receivable - a.receivable ||
        a.name.localeCompare(b.name, "zh-CN"),
    );
}

/** 周起点取周一 */
function weekStart(date: string): string {
  const d = dayjs(date);
  return d.subtract((d.day() + 6) % 7, "day").format("YYYY-MM-DD");
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async revenue(from: string, to: string, granularity: RevenueGranularity) {
    const start = dayjs(from);
    const end = dayjs(to);
    if (!start.isValid() || !end.isValid()) {
      throw new BadRequestException("日期无效");
    }
    if (end.isBefore(start, "day")) {
      throw new BadRequestException("结束日期不能早于开始日期");
    }
    const days = end.diff(start, "day") + 1;
    if (days > MAX_RANGE_DAYS) {
      throw new BadRequestException("查询区间过长，请缩小到 3 年以内");
    }

    const [orders, payments, feeItems, feeCategories] = await Promise.all([
      this.prisma.chargeOrder.findMany({
        where: {
          status: { not: "void" },
          chargeDate: { gte: from, lte: to },
        },
        select: {
          id: true,
          patientId: true,
          patient: { select: { name: true } },
          chargeDate: true,
          doctor: true,
          receivable: true,
          items: { select: { name: true, amount: true, feeItemId: true } },
          payments: { select: { amount: true } },
        },
        orderBy: [{ chargeDate: "desc" }, { id: "desc" }],
      }),
      this.prisma.chargePayment.findMany({
        where: { paidAt: { gte: from, lte: to } },
        select: {
          amount: true,
          method: true,
          doctor: true,
          paidAt: true,
          order: {
            select: {
              id: true,
              patientId: true,
              doctor: true,
              status: true,
              items: { select: { name: true, amount: true, feeItemId: true } },
            },
          },
        },
      }),
      this.prisma.feeItem.findMany({
        select: {
          id: true,
          name: true,
          category: { select: { name: true } },
        },
      }),
      this.prisma.feeCategory.findMany({ select: { name: true } }),
    ]);

    const feeById = new Map<number, FeeMeta>();
    const feeByName = new Map<string, FeeMeta>();
    for (const item of feeItems) {
      const meta: FeeMeta = { category: item.category.name, item: item.name };
      feeById.set(item.id, meta);
      feeByName.set(item.name, meta);
    }
    const categoryNames = new Set(feeCategories.map((c) => c.name));

    /**
     * 历史收费项目可能没有关联收费目录（feeItemId 为空），
     * 依次按「大类同名」→「小类同名」兜底归类。
     */
    const resolveFee = (name: string, feeItemId: number | null): FeeMeta => {
      if (feeItemId != null) {
        const hit = feeById.get(feeItemId);
        if (hit) return hit;
      }
      const trimmed = name.trim();
      if (categoryNames.has(trimmed)) {
        return { category: trimmed, item: trimmed };
      }
      const byName = feeByName.get(trimmed);
      if (byName) return byName;
      return { category: "其他", item: trimmed || "未分类" };
    };

    const activePayments = payments.filter((p) => p.order.status !== "void");

    // 收费单项目：期间开单的收费单 + 有期间收款的收费单（可能早于区间开单）
    const itemsByOrderId = new Map<number, ChargeItemRow[]>();
    for (const order of orders) itemsByOrderId.set(order.id, order.items);
    for (const payment of activePayments) {
      if (!itemsByOrderId.has(payment.order.id)) {
        itemsByOrderId.set(payment.order.id, payment.order.items);
      }
    }

    const periodPaidByOrder = new Map<number, number>();
    for (const payment of activePayments) {
      periodPaidByOrder.set(
        payment.order.id,
        (periodPaidByOrder.get(payment.order.id) ?? 0) + payment.amount,
      );
    }

    const received = roundMoney(
      activePayments.reduce((sum, p) => sum + p.amount, 0),
    );
    const receivable = roundMoney(
      orders.reduce((sum, order) => sum + order.receivable, 0),
    );
    const outstanding = roundMoney(
      orders.reduce((sum, order) => {
        const paid = order.payments.reduce((s, p) => s + p.amount, 0);
        return sum + Math.max(0, order.receivable - paid);
      }, 0),
    );

    const patientIds = new Set<number>();
    for (const order of orders) patientIds.add(order.patientId);
    for (const payment of activePayments) {
      patientIds.add(payment.order.patientId);
    }
    const patientCount = patientIds.size;

    // 分布统计
    const doctorMap = new Map<string, Acc>();
    const methodMap = new Map<string, Acc>();
    const categoryMap = new Map<string, Acc>();
    const feeItemMap = new Map<string, Acc>();

    for (const order of orders) {
      addAcc(doctorMap, order.doctor, { receivable: order.receivable });
      for (const item of order.items) {
        const fee = resolveFee(item.name, item.feeItemId);
        addAcc(categoryMap, fee.category, { receivable: item.amount });
        addAcc(feeItemMap, fee.item, { receivable: item.amount });
      }
    }

    for (const payment of activePayments) {
      addAcc(doctorMap, payment.doctor || payment.order.doctor, {
        received: payment.amount,
      });
      addAcc(methodMap, payment.method, { received: payment.amount });
    }

    // 实收到项目/大类：按收费单项目金额占比分摊该单本期实收
    for (const [orderId, paid] of periodPaidByOrder) {
      const items = itemsByOrderId.get(orderId) ?? [];
      const total = items.reduce((sum, item) => sum + item.amount, 0);
      if (!items.length || total <= 0) {
        addAcc(categoryMap, "其他", { received: paid });
        addAcc(feeItemMap, "未分类", { received: paid });
        continue;
      }
      for (const item of items) {
        const share = (paid * item.amount) / total;
        const fee = resolveFee(item.name, item.feeItemId);
        addAcc(categoryMap, fee.category, { received: share });
        addAcc(feeItemMap, fee.item, { received: share });
      }
    }

    // 趋势
    const bucketKeyOf = (date: string): string => {
      if (granularity === "month") return date.slice(0, 7);
      if (granularity === "week") return weekStart(date);
      return date;
    };
    const points: {
      key: string;
      label: string;
      received: number;
      receivable: number;
      orderCount: number;
    }[] = [];
    const pointByKey = new Map<string, (typeof points)[number]>();

    let cursor =
      granularity === "week"
        ? dayjs(weekStart(from))
        : granularity === "month"
          ? start.startOf("month")
          : start;
    while (!cursor.isAfter(end, "day")) {
      const key =
        granularity === "month"
          ? cursor.format("YYYY-MM")
          : cursor.format("YYYY-MM-DD");
      const point = {
        key,
        label:
          granularity === "month"
            ? cursor.format("YYYY-MM")
            : cursor.format("MM-DD"),
        received: 0,
        receivable: 0,
        orderCount: 0,
      };
      points.push(point);
      pointByKey.set(key, point);
      cursor =
        granularity === "month"
          ? cursor.add(1, "month")
          : cursor.add(granularity === "week" ? 7 : 1, "day");
    }

    for (const order of orders) {
      const point = pointByKey.get(bucketKeyOf(order.chargeDate));
      if (!point) continue;
      point.receivable += order.receivable;
      point.orderCount += 1;
    }
    for (const payment of activePayments) {
      const point = pointByKey.get(bucketKeyOf(payment.paidAt));
      if (!point) continue;
      point.received += payment.amount;
    }
    for (const point of points) {
      point.receivable = roundMoney(point.receivable);
      point.received = roundMoney(point.received);
    }

    const recentOrders = orders.slice(0, 20).map((order) => {
      const paid = roundMoney(
        order.payments.reduce((sum, p) => sum + p.amount, 0),
      );
      const owed = roundMoney(Math.max(0, order.receivable - paid));
      return {
        id: order.id,
        chargeDate: order.chargeDate,
        patientId: order.patientId,
        patientName: order.patient.name,
        doctor: order.doctor,
        items: order.items.map((item) => item.name),
        receivable: roundMoney(order.receivable),
        paid,
        owed,
        state: owed > 0 ? ("owing" as const) : ("settled" as const),
      };
    });

    return {
      range: { from, to, days },
      granularity,
      summary: {
        received,
        receivable,
        outstanding,
        orderCount: orders.length,
        paymentCount: activePayments.length,
        patientCount,
        averageTicket: patientCount ? roundMoney(received / patientCount) : 0,
      },
      trend: points,
      distributions: {
        doctor: toRows(doctorMap),
        method: toRows(methodMap),
        category: toRows(categoryMap),
        feeItem: toRows(feeItemMap),
      },
      recentOrders,
    };
  }
}
