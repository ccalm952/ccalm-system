import type { SalaryGlobalSettings, SalaryTierRates, SalaryTierThresholds } from "./types";

const WU_JIECHEN_NAME = "吴介尘";

export function receiptTierLabels(
  thresholds: SalaryTierThresholds,
): readonly [string, string, string, string, string, string] {
  const wan = (n: number) => {
    const v = n / 10000;
    return Number.isInteger(v) ? String(v) : String(parseFloat(v.toFixed(2)));
  };
  const { tier1, tier2, tier3, tier4, tier5 } = thresholds;
  return [
    `≤${wan(tier1)}万`,
    `${wan(tier1)}-${wan(tier2)}万`,
    `${wan(tier2)}-${wan(tier3)}万`,
    `${wan(tier3)}-${wan(tier4)}万`,
    `${wan(tier4)}-${wan(tier5)}万`,
    `≥${wan(tier5)}万`,
  ];
}

export function createDefaultSalaryGlobalSettings(): SalaryGlobalSettings {
  return {
    tierThresholds: {
      tier1: 20000,
      tier2: 40000,
      tier3: 60000,
      tier4: 80000,
      tier5: 100000,
    },
    docTierRates: {
      tier1Rate: 0.1,
      tier2Rate: 0.12,
      tier3Rate: 0.14,
      tier4Rate: 0.16,
      tier5Rate: 0.18,
      tier6Rate: 0.2,
    },
    asstTierRates: {
      tier1Rate: 0.07,
      tier2Rate: 0.08,
      tier3Rate: 0.09,
      tier4Rate: 0.1,
      tier5Rate: 0.11,
      tier6Rate: 0.12,
    },
    actualReceiptDeductionRate: 0.2,
    plantingBonusPerUnit: 50,
    wuJiechenPlantingBonusPerUnit: 500,
  };
}

function normalizeTierRates(
  value: unknown,
  fallback: SalaryTierRates,
): SalaryTierRates {
  if (!value || typeof value !== "object") return fallback;
  const rates = value as Partial<SalaryTierRates>;
  const num = (key: keyof SalaryTierRates) => {
    const n = rates[key];
    return typeof n === "number" && Number.isFinite(n) ? n : fallback[key];
  };
  return {
    tier1Rate: num("tier1Rate"),
    tier2Rate: num("tier2Rate"),
    tier3Rate: num("tier3Rate"),
    tier4Rate: num("tier4Rate"),
    tier5Rate: num("tier5Rate"),
    tier6Rate: num("tier6Rate"),
  };
}

function normalizeTierThresholds(
  value: unknown,
  fallback: SalaryTierThresholds,
): SalaryTierThresholds {
  if (!value || typeof value !== "object") return fallback;
  const thresholds = value as Partial<SalaryTierThresholds>;
  const keys: (keyof SalaryTierThresholds)[] = [
    "tier1",
    "tier2",
    "tier3",
    "tier4",
    "tier5",
  ];
  const complete = keys.every(
    (key) => typeof thresholds[key] === "number" && Number.isFinite(thresholds[key]),
  );
  if (!complete) return fallback;
  return {
    tier1: thresholds.tier1 as number,
    tier2: thresholds.tier2 as number,
    tier3: thresholds.tier3 as number,
    tier4: thresholds.tier4 as number,
    tier5: thresholds.tier5 as number,
  };
}

export function normalizeSalaryGlobalSettings(data: unknown): SalaryGlobalSettings {
  const defaults = createDefaultSalaryGlobalSettings();
  if (!data || typeof data !== "object") return defaults;
  const settings = data as Partial<SalaryGlobalSettings>;
  return {
    tierThresholds: normalizeTierThresholds(
      settings.tierThresholds,
      defaults.tierThresholds,
    ),
    docTierRates: normalizeTierRates(settings.docTierRates, defaults.docTierRates),
    asstTierRates: normalizeTierRates(settings.asstTierRates, defaults.asstTierRates),
    actualReceiptDeductionRate:
      typeof settings.actualReceiptDeductionRate === "number" &&
      Number.isFinite(settings.actualReceiptDeductionRate)
        ? settings.actualReceiptDeductionRate
        : defaults.actualReceiptDeductionRate,
    plantingBonusPerUnit:
      typeof settings.plantingBonusPerUnit === "number"
        ? settings.plantingBonusPerUnit
        : defaults.plantingBonusPerUnit,
    wuJiechenPlantingBonusPerUnit:
      typeof settings.wuJiechenPlantingBonusPerUnit === "number"
        ? settings.wuJiechenPlantingBonusPerUnit
        : defaults.wuJiechenPlantingBonusPerUnit,
  };
}

export function plantingBonusPerUnitForEmployee(
  name: string,
  settings: SalaryGlobalSettings,
): number {
  if (name === WU_JIECHEN_NAME) return settings.wuJiechenPlantingBonusPerUnit;
  return settings.plantingBonusPerUnit;
}

export function tierRatesForTitle(
  title: string,
  settings: SalaryGlobalSettings,
): SalaryTierRates {
  if (title === "执业医师") return settings.docTierRates;
  return settings.asstTierRates;
}
