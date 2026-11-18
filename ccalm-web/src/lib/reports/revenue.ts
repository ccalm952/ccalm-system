export type RevenueGranularity = "day" | "week" | "month";

export type RevenueSummary = {
  /** 期间实收（按收款日期） */
  received: number;
  /** 期间开单应收（按开单日期） */
  receivable: number;
  /** 期间开单仍未收的金额 */
  outstanding: number;
  orderCount: number;
  paymentCount: number;
  patientCount: number;
  /** 客单价 = 期间实收 / 患者数 */
  averageTicket: number;
};

export type RevenueTrendPoint = {
  key: string;
  label: string;
  received: number;
  receivable: number;
  orderCount: number;
};

export type RevenueDistributionRow = {
  name: string;
  received: number;
  receivable: number;
};

export type RevenueOrder = {
  id: number;
  chargeDate: string;
  patientId: number;
  patientName: string;
  doctor: string;
  items: string[];
  receivable: number;
  paid: number;
  owed: number;
  state: "settled" | "owing";
};

export type RevenueReport = {
  range: { from: string; to: string; days: number };
  granularity: RevenueGranularity;
  summary: RevenueSummary;
  trend: RevenueTrendPoint[];
  distributions: {
    doctor: RevenueDistributionRow[];
    method: RevenueDistributionRow[];
    category: RevenueDistributionRow[];
    feeItem: RevenueDistributionRow[];
  };
  recentOrders: RevenueOrder[];
};
