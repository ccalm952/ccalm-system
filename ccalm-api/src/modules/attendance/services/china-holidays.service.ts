import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import dayjs from "dayjs";

import { PrismaService } from "../../../prisma/prisma.service";

const REMOTE_TIMEOUT_MS = 8000;
/** 当年及以后的数据可能随国务院通知更新，存了超过 7 天就在后台重新下载 */
const REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export type ChinaHolidayDay = {
  date: string;
  name: string;
  isOffDay: boolean;
};

export type ChinaHolidayPeriod = {
  name: string;
  start: string;
  end: string;
};

export type ChinaHolidayYear = {
  year: number;
  days: ChinaHolidayDay[];
  offDayMap: Record<string, string>;
  periods: ChinaHolidayPeriod[];
  makeupDays: Array<{ date: string; name: string }>;
};

type HolidayCnJson = {
  year: number;
  days: Array<{ name: string; date: string; isOffDay: boolean }>;
};

@Injectable()
export class ChinaHolidaysService {
  private readonly cache = new Map<number, ChinaHolidayYear>();
  private readonly pending = new Map<number, Promise<ChinaHolidayYear>>();

  constructor(private readonly prisma: PrismaService) {}

  private groupOffDayPeriods(days: ChinaHolidayDay[]): ChinaHolidayPeriod[] {
    const offDays = days
      .filter((d) => d.isOffDay)
      .sort((a, b) => a.date.localeCompare(b.date));
    const periods: ChinaHolidayPeriod[] = [];

    for (const day of offDays) {
      const last = periods[periods.length - 1];
      if (
        last &&
        last.name === day.name &&
        dayjs(day.date).diff(dayjs(last.end), "day") === 1
      ) {
        last.end = day.date;
        continue;
      }
      periods.push({ name: day.name, start: day.date, end: day.date });
    }

    return periods;
  }

  private normalize(raw: HolidayCnJson): ChinaHolidayYear {
    const days: ChinaHolidayDay[] = (raw.days ?? []).map((d) => ({
      date: d.date,
      name: d.name,
      isOffDay: d.isOffDay,
    }));

    const offDayMap: Record<string, string> = {};
    for (const d of days) {
      if (d.isOffDay) offDayMap[d.date] = d.name;
    }

    const makeupDays = days
      .filter((d) => !d.isOffDay)
      .map((d) => ({ date: d.date, name: `${d.name}补班` }));

    return {
      year: raw.year,
      days,
      offDayMap,
      periods: this.groupOffDayPeriods(days),
      makeupDays,
    };
  }

  async getYear(year: number): Promise<ChinaHolidayYear> {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new NotFoundException("年份不合法");
    }

    const cached = this.cache.get(year);
    if (cached) return cached;

    let pending = this.pending.get(year);
    if (!pending) {
      pending = this.loadYear(year).finally(() => this.pending.delete(year));
      this.pending.set(year, pending);
    }
    return pending;
  }

  private async loadYear(year: number): Promise<ChinaHolidayYear> {
    const stored = await this.prisma.holidayYear.findUnique({
      where: { year },
    });
    if (!stored) return this.fetchRemote(year);

    const normalized = this.normalize(stored.data as unknown as HolidayCnJson);
    this.cache.set(year, normalized);
    const stale = Date.now() - stored.fetchedAt.getTime() > REFRESH_AFTER_MS;
    if (stale && year >= dayjs().year()) {
      void this.fetchRemote(year).catch(() => undefined);
    }
    return normalized;
  }

  private async fetchRemote(year: number): Promise<ChinaHolidayYear> {
    const url = `https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`;
    let res: Response;
    try {
      res = await fetch(url, {
        signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableException("节假日数据下载失败，请稍后再试");
    }
    if (!res.ok) {
      throw new NotFoundException(`暂无 ${year} 年节假日数据`);
    }

    const raw = (await res.json()) as HolidayCnJson;
    const data = raw as unknown as Prisma.InputJsonValue;
    await this.prisma.holidayYear.upsert({
      where: { year },
      create: { year, data },
      update: { data, fetchedAt: new Date() },
    });
    const normalized = this.normalize(raw);
    this.cache.set(year, normalized);
    return normalized;
  }
}
