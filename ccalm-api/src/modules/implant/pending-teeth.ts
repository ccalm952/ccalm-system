const TOOTH_SEPARATOR = /[\s、，,/]+/;
const FDI_TOOTH = /^(?:[1-4][1-8]|[5-8][1-5])$/;

/**
 * 待种植牙位去掉已种的。
 * 返回 null 表示不改：待种植牙位不是纯 FDI 牙位列表（含文字说明等），或一颗都没种到。
 */
export function remainingPendingTeeth(
  pendingTeeth: string,
  implantedToothNos: (string | null)[],
): string[] | null {
  const pending = pendingTeeth.trim().split(TOOTH_SEPARATOR).filter(Boolean);
  if (!pending.length || !pending.every((t) => FDI_TOOTH.test(t))) return null;
  const implanted = new Set(
    implantedToothNos.flatMap((t) => (t ?? "").split(TOOTH_SEPARATOR)),
  );
  const rest = pending.filter((t) => !implanted.has(t));
  return rest.length === pending.length ? null : rest;
}

/** 种植日期不早于拔牙日期（没填拔牙日期时用登记日期）才算种的是这条待种植 */
export function implantCountsForPending(
  visitDate: string,
  pending: { extractionDate: string | null; createdDate: string },
): boolean {
  return visitDate >= (pending.extractionDate || pending.createdDate);
}
