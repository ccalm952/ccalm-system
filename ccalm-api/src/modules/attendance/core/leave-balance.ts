const LEAVE_START_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeaveStartDate(value: string): boolean {
  const match = LEAVE_START_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function nextMonth(month: string): string {
  const [yearText, monthText] = month.split("-");
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + 1);
  const monthNumber = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${monthNumber}`;
}

/** 从起始日所在月起，累加每月假期，减去起始日及之后的已休。起始月按整月发放。 */
export function remainingLeaveSinceStart(params: {
  startDate: string;
  month: string;
  allowanceByMonth: ReadonlyMap<string, number>;
  leaveDaysByMonth: ReadonlyMap<string, number>;
}): number {
  if (
    !isLeaveStartDate(params.startDate) ||
    !/^\d{4}-\d{2}$/.test(params.month)
  ) {
    return 0;
  }
  const startMonth = params.startDate.slice(0, 7);
  if (params.month < startMonth) return 0;

  let balance = 0;
  let cursor = startMonth;
  while (cursor <= params.month) {
    balance += params.allowanceByMonth.get(cursor) ?? 0;
    balance -= params.leaveDaysByMonth.get(cursor) ?? 0;
    cursor = nextMonth(cursor);
  }
  return balance;
}
