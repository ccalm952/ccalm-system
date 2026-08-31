import type { SalaryGlobalSettings, SalaryTierRates } from "./types";

export function createDefaultSalaryGlobalSettings(): SalaryGlobalSettings {
  return {
    tierThresholds: { tier1: 30000, tier2: 60000, tier3: 90000 },
    docTierRates: {
      tier1Rate: 0.1,
      tier2Rate: 0.12,
      tier3Rate: 0.14,
      tier4Rate: 0.16,
    },
    asstTierRates: {
      tier1Rate: 0.07,
      tier2Rate: 0.08,
      tier3Rate: 0.09,
      tier4Rate: 0.1,
    },
    plantingBonusPerUnit: 50,
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
  };
}

export function normalizeSalaryGlobalSettings(data: unknown): SalaryGlobalSettings {
  const defaults = createDefaultSalaryGlobalSettings();
  if (!data || typeof data !== "object") return defaults;
  const settings = data as Partial<SalaryGlobalSettings>;
  const thresholds = settings.tierThresholds;
  return {
    tierThresholds: {
      tier1:
        typeof thresholds?.tier1 === "number" ? thresholds.tier1 : defaults.tierThresholds.tier1,
      tier2:
        typeof thresholds?.tier2 === "number" ? thresholds.tier2 : defaults.tierThresholds.tier2,
      tier3:
        typeof thresholds?.tier3 === "number" ? thresholds.tier3 : defaults.tierThresholds.tier3,
    },
    docTierRates: normalizeTierRates(settings.docTierRates, defaults.docTierRates),
    asstTierRates: normalizeTierRates(settings.asstTierRates, defaults.asstTierRates),
    plantingBonusPerUnit:
      typeof settings.plantingBonusPerUnit === "number"
        ? settings.plantingBonusPerUnit
        : defaults.plantingBonusPerUnit,
  };
}

export function tierRatesForTitle(
  title: string,
  settings: SalaryGlobalSettings,
): SalaryTierRates {
  if (title === "执业医师") return settings.docTierRates;
  return settings.asstTierRates;
}
