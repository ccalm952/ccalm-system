export type PendingVisitLike = {
  id: number;
  visitDate: string;
  status: string;
  medicalRecordIds: number[];
};

/**
 * 新建病历时默认挂到哪次就诊：当天「已预约 / 已到店」且还没写病历的那条。
 * 正畸名单点「就诊」和挂号建的就诊都会命中，避免写病历时再建一条重复就诊。
 */
export function pickPendingVisitId(
  visits: PendingVisitLike[],
  today: string,
): number | null {
  const pending = visits
    .filter(
      (v) =>
        v.visitDate === today &&
        (v.status === "booked" || v.status === "arrived") &&
        v.medicalRecordIds.length === 0,
    )
    .sort((a, b) => b.id - a.id);
  return pending[0]?.id ?? null;
}
