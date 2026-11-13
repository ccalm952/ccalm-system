import { NotFoundException } from "@nestjs/common";
import type { Patient, Prisma } from "@prisma/client";

export type PatientIdentity = {
  name: string;
  phone: string;
  chartNo: string;
};

type PatientClient = Pick<Prisma.TransactionClient, "patient">;

export function normalizePatientIdentity(raw: {
  name: string;
  phone?: string | null;
  chartNo?: string | null;
}): PatientIdentity {
  return {
    name: raw.name.trim(),
    phone: raw.phone?.trim() ?? "",
    chartNo: raw.chartNo?.trim() ?? "",
  };
}

/**
 * 同一个人 = 姓名相同，且病历号或手机号（非空）相同。
 * 只比手机号会把共用家长手机号的孩子合并成一人。
 */
export function patientMatchWhere(
  identity: PatientIdentity,
): Prisma.PatientWhereInput | null {
  if (!identity.name) return null;
  const or: Prisma.PatientWhereInput[] = [];
  if (identity.chartNo) or.push({ chartNo: identity.chartNo });
  if (identity.phone) or.push({ phone: identity.phone });
  if (!or.length) return null;
  return { name: identity.name, OR: or };
}

/** 找到同一个人就补全空字段，找不到就新建；传了 patientId（下拉选中的已有患者）就直接用它 */
export async function findOrCreatePatient(
  client: PatientClient,
  identity: PatientIdentity,
  extra: {
    birthday?: string | null;
    age?: number | null;
    patientId?: number;
  } = {},
): Promise<Patient> {
  const where = patientMatchWhere(identity);
  const existing =
    extra.patientId != null
      ? await client.patient.findUnique({ where: { id: extra.patientId } })
      : where
        ? await client.patient.findFirst({ where, orderBy: { id: "asc" } })
        : null;
  if (extra.patientId != null && !existing) {
    throw new NotFoundException("患者不存在");
  }

  if (!existing) {
    return client.patient.create({
      data: {
        ...identity,
        birthday: extra.birthday || null,
        age: extra.age ?? null,
      },
    });
  }

  const data: Prisma.PatientUpdateInput = {};
  if (!existing.chartNo && identity.chartNo) data.chartNo = identity.chartNo;
  if (!existing.phone && identity.phone) data.phone = identity.phone;
  if (!existing.birthday && extra.birthday) data.birthday = extra.birthday;
  if (existing.age == null && extra.age != null) data.age = extra.age;
  if (!Object.keys(data).length) return existing;
  return client.patient.update({ where: { id: existing.id }, data });
}
