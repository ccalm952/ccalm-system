import { Injectable } from "@nestjs/common";
import dayjs from "dayjs";

import { PrismaService } from "../../prisma/prisma.service";
import {
  planCourseStatus,
  planItemDoneDate,
} from "../medical-records/record-rules";
import {
  daysSinceVisit,
  isOrthodonticsFollowUpDue,
} from "../orthodontics/follow-up";

@Injectable()
export class WorkbenchService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const today = dayjs().format("YYYY-MM-DD");

    const [
      clinicVisits,
      implantVisits,
      orthodonticsToday,
      orthodonticsOpen,
      openCourses,
    ] = await Promise.all([
      this.prisma.patientVisit.findMany({
        where: { visitDate: today, status: { not: "cancelled" } },
        include: { patient: true },
        orderBy: [{ startTime: "asc" }, { id: "asc" }],
      }),
      this.prisma.implantVisit.findMany({
        where: { visitDate: today },
        include: { patient: true, teeth: { orderBy: { id: "asc" } } },
        orderBy: { id: "asc" },
      }),
      this.prisma.orthodonticsPatient.findMany({
        where: { lastVisitDate: today },
        include: { patient: true },
        orderBy: { id: "asc" },
      }),
      this.prisma.orthodonticsPatient.findMany({
        where: {
          category: { not: "completed" },
          lastVisitDate: { not: null },
        },
        include: { patient: true },
      }),
      this.prisma.medicalRecord.findMany({
        where: {
          type: "first",
          planStoppedAt: null,
          planItems: { some: { followUps: { none: { completes: true } } } },
        },
        include: {
          patient: true,
          planItems: {
            orderBy: { sort: "asc" },
            include: {
              followUps: {
                select: {
                  completes: true,
                  record: { select: { visitDate: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const todayVisits = [
      ...clinicVisits.map((v) => ({
        key: `clinic-${v.id}`,
        kind: "clinic" as const,
        patientId: v.patientId,
        name: v.patient.name,
        phone: v.patient.phone,
        chartNo: v.patient.chartNo,
        detail: v.kind,
        startTime: v.startTime,
        endTime: v.endTime,
        status: v.status,
        staff: v.doctor,
      })),
      ...implantVisits.map((v) => ({
        key: `implant-${v.id}`,
        kind: "implant" as const,
        patientId: v.patientId,
        name: v.patient.name,
        phone: v.patient.phone,
        chartNo: v.patient.chartNo,
        detail: v.teeth
          .map((t) => t.toothNo?.trim())
          .filter(Boolean)
          .join("、"),
        staff: v.staff ?? "",
      })),
      ...orthodonticsToday.map((o) => ({
        key: `orthodontics-${o.id}`,
        kind: "orthodontics" as const,
        patientId: o.patientId,
        name: o.patient.name,
        phone: o.patient.phone,
        chartNo: o.patient.chartNo,
        detail: o.category,
        staff: o.doctor,
      })),
    ];

    const followUps = orthodonticsOpen
      .map((o) => ({
        id: o.id,
        patientId: o.patientId,
        name: o.patient.name,
        phone: o.patient.phone,
        chartNo: o.patient.chartNo,
        category: o.category,
        applianceModel: o.applianceModel,
        lastVisitDate: o.lastVisitDate,
        daysSinceLastVisit: daysSinceVisit(o.lastVisitDate),
        doctor: o.doctor,
      }))
      .filter((o) =>
        isOrthodonticsFollowUpDue(o.category, o.daysSinceLastVisit),
      )
      .sort(
        (a, b) => (b.daysSinceLastVisit ?? 0) - (a.daysSinceLastVisit ?? 0),
      );

    const pendingCourses = openCourses
      .map((r) => {
        const items = r.planItems.map((i) => ({
          teeth: i.teeth,
          text: i.text,
          doneDate: planItemDoneDate(
            i.followUps.map((f) => ({
              visitDate: f.record.visitDate,
              completes: f.completes,
            })),
          ),
        }));
        const lastVisitDate = r.planItems
          .flatMap((i) => i.followUps.map((f) => f.record.visitDate))
          .reduce((max, d) => (d > max ? d : max), r.visitDate);
        return { r, items, lastVisitDate };
      })
      .filter(
        ({ r, items }) =>
          planCourseStatus(items, r.planStoppedAt) === "pending",
      )
      .map(({ r, items, lastVisitDate }) => ({
        recordId: r.id,
        patientId: r.patientId,
        name: r.patient.name,
        phone: r.patient.phone,
        chartNo: r.patient.chartNo,
        firstVisitDate: r.visitDate,
        doneCount: items.filter((i) => i.doneDate).length,
        totalCount: items.length,
        pendingItems: items
          .filter((i) => !i.doneDate)
          .map((i) => ({ teeth: i.teeth, text: i.text })),
        lastVisitDate,
        daysSinceLastVisit: daysSinceVisit(lastVisitDate),
        doctor: r.doctor,
      }))
      .sort(
        (a, b) => (b.daysSinceLastVisit ?? 0) - (a.daysSinceLastVisit ?? 0),
      );

    return { date: today, todayVisits, followUps, pendingCourses };
  }
}
