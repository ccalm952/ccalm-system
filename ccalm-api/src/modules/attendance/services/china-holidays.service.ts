import { Injectable, NotFoundException } from "@nestjs/common"
import dayjs from "dayjs"

export type ChinaHolidayDay = {
  date: string
  name: string
  isOffDay: boolean
}

export type ChinaHolidayPeriod = {
  name: string
  start: string
  end: string
}

export type ChinaHolidayYear = {
  year: number
  days: ChinaHolidayDay[]
  offDayMap: Record<string, string>
  periods: ChinaHolidayPeriod[]
  makeupDays: Array<{ date: string; name: string }>
}

type HolidayCnJson = {
  year: number
  days: Array<{ name: string; date: string; isOffDay: boolean }>
}

@Injectable()
export class ChinaHolidaysService {
  private readonly cache = new Map<number, ChinaHolidayYear>()

  private groupOffDayPeriods(days: ChinaHolidayDay[]): ChinaHolidayPeriod[] {
    const offDays = days
      .filter((d) => d.isOffDay)
      .sort((a, b) => a.date.localeCompare(b.date))
    const periods: ChinaHolidayPeriod[] = []

    for (const day of offDays) {
      const last = periods[periods.length - 1]
      if (
        last &&
        last.name === day.name &&
        dayjs(day.date).diff(dayjs(last.end), "day") === 1
      ) {
        last.end = day.date
        continue
      }
      periods.push({ name: day.name, start: day.date, end: day.date })
    }

    return periods
  }

  private normalize(raw: HolidayCnJson): ChinaHolidayYear {
    const days: ChinaHolidayDay[] = (raw.days ?? []).map((d) => ({
      date: d.date,
      name: d.name,
      isOffDay: d.isOffDay,
    }))

    const offDayMap: Record<string, string> = {}
    for (const d of days) {
      if (d.isOffDay) offDayMap[d.date] = d.name
    }

    const makeupDays = days
      .filter((d) => !d.isOffDay)
      .map((d) => ({ date: d.date, name: `${d.name}补班` }))

    return {
      year: raw.year,
      days,
      offDayMap,
      periods: this.groupOffDayPeriods(days),
      makeupDays,
    }
  }

  async getYear(year: number): Promise<ChinaHolidayYear> {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new NotFoundException("年份不合法")
    }

    const cached = this.cache.get(year)
    if (cached) return cached

    const url = `https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`
    const res = await fetch(url)
    if (!res.ok) {
      throw new NotFoundException(`暂无 ${year} 年节假日数据`)
    }

    const raw = (await res.json()) as HolidayCnJson
    const normalized = this.normalize(raw)
    this.cache.set(year, normalized)
    return normalized
  }
}
