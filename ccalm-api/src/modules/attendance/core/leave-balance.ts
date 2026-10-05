function nextMonth(month: string): string {
  const [yearText, monthText] = month.split("-");
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + 1);
  const monthNumber = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${monthNumber}`;
}

/** 初始额度加上创建月到查看月的每月假期和假期抵消，再减去已休。 */
export function remainingLeaveSinceStart(params: {
  createdMonth: string;
  month: string;
  initialBalance: number;
  allowanceByMonth: ReadonlyMap<string, number>;
  leaveDaysByMonth: ReadonlyMap<string, number>;
  offsetDaysByMonth?: ReadonlyMap<string, number>;
}): number {
  let balance = params.initialBalance;
  if (
    !/^\d{4}-\d{2}$/.test(params.createdMonth) ||
    !/^\d{4}-\d{2}$/.test(params.month)
  ) {
    return balance;
  }
  if (params.month < params.createdMonth) return balance;

  let cursor = params.createdMonth;
  while (cursor < params.month) {
    balance += params.allowanceByMonth.get(cursor) ?? 0;
    balance -= params.leaveDaysByMonth.get(cursor) ?? 0;
    balance += params.offsetDaysByMonth?.get(cursor) ?? 0;
    cursor = nextMonth(cursor);
  }

  balance += params.allowanceByMonth.get(params.month) ?? 0;
  balance -= params.leaveDaysByMonth.get(params.month) ?? 0;
  balance += params.offsetDaysByMonth?.get(params.month) ?? 0;
  return balance;
}
