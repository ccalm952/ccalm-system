import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcrypt"
import dayjs from "dayjs"
import pg from "pg"
import "dotenv/config"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

/** 距今天数：仅上班卡、缺下班卡，可发起补卡 */
const MAKEUP_ELIGIBLE_DAYS_AGO = [1, 2, 3, 4, 5, 6, 7, 8]

/** 预置待审批补卡（管理员待办）；其余日期留空供员工自行申请 */
const PENDING_MAKEUP: Array<{
  daysAgo: number
  type: "morning_out" | "afternoon_out"
  time: string
  reason: string
}> = [
  { daysAgo: 1, type: "morning_out", time: "12:05", reason: "外出办事忘记打上午下班卡" },
  { daysAgo: 1, type: "afternoon_out", time: "18:10", reason: "会议结束较晚忘记打下午下班卡" },
  { daysAgo: 2, type: "morning_out", time: "12:00", reason: "上午接待客户未打卡" },
  { daysAgo: 3, type: "afternoon_out", time: "18:30", reason: "加班后忘记打下班卡" },
  { daysAgo: 4, type: "morning_out", time: "12:15", reason: "临时外出未补卡" },
  { daysAgo: 5, type: "afternoon_out", time: "17:55", reason: "设备故障未能正常打卡" },
  { daysAgo: 6, type: "morning_out", time: "12:20", reason: "培训结束忘记打卡" },
  { daysAgo: 7, type: "afternoon_out", time: "18:05", reason: "门诊延时未打下班卡" },
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

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, displayName: true, role: true },
    orderBy: { username: "asc" },
  })
  console.log("Users:", JSON.stringify(users, null, 2))

  const employee =
    users.find((u) => u.role === "user") ??
    (await prisma.user.upsert({
      where: { username: "staff1" },
      create: {
        username: "staff1",
        displayName: "测试员工",
        role: "user",
        passwordHash: await bcrypt.hash("staff123456", 10),
      },
      update: {},
      select: { id: true, username: true, displayName: true, role: true },
    }))

  const testDates = MAKEUP_ELIGIBLE_DAYS_AGO.map(dateStr)

  for (const date of testDates) {
    const { start, end } = dayBounds(date)

    await prisma.attendanceRecord.deleteMany({
      where: {
        userId: employee.id,
        punchTime: { gte: start, lte: end },
      },
    })

    await prisma.attendanceMakeupRequest.deleteMany({
      where: {
        userId: employee.id,
        date,
      },
    })

    await prisma.attendanceRecord.createMany({
      data: [
        {
          userId: employee.id,
          type: "morning_in",
          punchTime: new Date(`${date}T08:35:00`),
          latitude: 22.5431,
          longitude: 114.0579,
          address: "测试地址-上午上班",
          source: "normal",
        },
        {
          userId: employee.id,
          type: "afternoon_in",
          punchTime: new Date(`${date}T14:32:00`),
          latitude: 22.5431,
          longitude: 114.0579,
          address: "测试地址-下午上班",
          source: "normal",
        },
      ],
    })
  }

  console.log(`Created morning_in + afternoon_in (no clock-out) for ${testDates.length} days`)

  const pendingCreated: Array<{ date: string; type: string; reason: string }> = []

  for (const item of PENDING_MAKEUP) {
    const date = dateStr(item.daysAgo)
    if (!testDates.includes(date)) continue

    await prisma.attendanceMakeupRequest.create({
      data: {
        userId: employee.id,
        date,
        type: item.type,
        punchTime: new Date(`${date}T${item.time}:00`),
        reason: item.reason,
        status: "pending",
      },
    })
    pendingCreated.push({ date, type: item.type, reason: item.reason })
  }

  const applyOnlyDates = testDates.filter(
    (d) => !pendingCreated.some((p) => p.date === d),
  )

  console.log(
    JSON.stringify(
      {
        employee: employee.username,
        displayName: employee.displayName,
        makeupEligibleDates: testDates,
        pendingMakeupRequests: pendingCreated,
        pendingCount: pendingCreated.length,
        datesForManualApply: applyOnlyDates,
        note: "有 pending 的日期管理员待办可见；无 pending 的日期员工仍可点击补卡申请",
        login: {
          username: employee.username,
          password: employee.username === "staff1" ? "staff123456" : "(使用现有密码)",
        },
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
