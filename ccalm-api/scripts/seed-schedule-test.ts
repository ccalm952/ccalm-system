import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcrypt"
import dayjs from "dayjs"
import pg from "pg"
import "dotenv/config"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const PASSWORD = "staff123456"

type SeedUser = {
  username: string
  displayName: string
}

const TEST_USERS: SeedUser[] = [
  { username: "staff_am", displayName: "测试-仅上午" },
  { username: "staff_pm", displayName: "测试-仅下午" },
  { username: "staff_full", displayName: "测试-全天出勤" },
  { username: "staff_rest", displayName: "测试-无打卡" },
]

/** 距今天数 → 各员工当天打卡类型 */
const SCENARIOS: Array<{
  daysAgo: number
  records: Record<string, Array<"morning_in" | "afternoon_in">>
}> = [
  {
    daysAgo: 1,
    records: {
      staff_am: ["morning_in"],
      staff_pm: ["afternoon_in"],
      staff_full: ["morning_in", "afternoon_in"],
      staff_rest: [],
    },
  },
  {
    daysAgo: 2,
    records: {
      staff_am: ["morning_in"],
      staff_pm: ["afternoon_in"],
      staff_full: ["morning_in", "afternoon_in"],
      staff_rest: [],
    },
  },
  {
    daysAgo: 3,
    records: {
      staff_am: ["morning_in"],
      staff_pm: ["afternoon_in"],
      staff_full: ["morning_in", "afternoon_in"],
      staff_rest: [],
    },
  },
  {
    daysAgo: 5,
    records: {
      staff_am: ["morning_in"],
      staff_pm: ["afternoon_in"],
      staff_full: ["morning_in", "afternoon_in"],
      staff_rest: [],
    },
  },
  {
    daysAgo: 7,
    records: {
      staff_am: ["morning_in"],
      staff_pm: ["afternoon_in"],
      staff_full: ["morning_in", "afternoon_in"],
      staff_rest: [],
    },
  },
]

function dateStr(daysAgo: number): string {
  return dayjs().subtract(daysAgo, "day").format("YYYY-MM-DD")
}

function dayBounds(date: string) {
  return {
    start: dayjs(date, "YYYY-MM-DD").startOf("day").toDate(),
    end: dayjs(date, "YYYY-MM-DD").endOf("day").toDate(),
  }
}

function punchTime(date: string, type: "morning_in" | "afternoon_in"): Date {
  const hm = type === "morning_in" ? "08:35:00" : "14:32:00"
  return new Date(`${date}T${hm}`)
}

async function ensureUser(seed: SeedUser) {
  return await prisma.user.upsert({
    where: { username: seed.username },
    create: {
      username: seed.username,
      displayName: seed.displayName,
      role: "user",
      passwordHash: await bcrypt.hash(PASSWORD, 10),
    },
    update: {
      displayName: seed.displayName,
    },
    select: { id: true, username: true, displayName: true },
  })
}

async function main() {
  const userMap = new Map<string, { id: string; username: string; displayName: string }>()
  for (const seed of TEST_USERS) {
    const u = await ensureUser(seed)
    userMap.set(seed.username, u)
  }

  const dates = SCENARIOS.map((s) => dateStr(s.daysAgo))

  for (const scenario of SCENARIOS) {
    const date = dateStr(scenario.daysAgo)
    const { start, end } = dayBounds(date)

    for (const seed of TEST_USERS) {
      const user = userMap.get(seed.username)!
      const types = scenario.records[seed.username] ?? []

      await prisma.attendanceRecord.deleteMany({
        where: {
          userId: user.id,
          punchTime: { gte: start, lte: end },
        },
      })

      await prisma.scheduleEntry.deleteMany({
        where: { userId: user.id, date },
      })

      if (types.length === 0) continue

      await prisma.attendanceRecord.createMany({
        data: types.map((type) => ({
          userId: user.id,
          type,
          punchTime: punchTime(date, type),
          latitude: 22.5431,
          longitude: 114.0579,
          address: `测试-${type}`,
          source: "normal" as const,
        })),
      })
    }
  }

  console.log(
    JSON.stringify(
      {
        users: TEST_USERS.map((u) => ({
          username: u.username,
          displayName: u.displayName,
          password: PASSWORD,
        })),
        seededDates: dates,
        expectedAfterAutoFill: {
          staff_am: "下（仅上午上班 → 下午休息）",
          staff_pm: "上（仅下午上班 → 上午休息）",
          staff_full: "空（正常出勤）",
          staff_rest: "全（整天休息）",
        },
        hint: "打开排班表 → 选当月 → 点「根据打卡填写」查看格子",
      },
      null,
      2,
    ),
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
