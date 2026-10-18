const { getMonthlySummary } = require("./attendance");
const { hasSession } = require("../store/session");
const { monthKey } = require("../utils/time");

async function fetchMissingCount() {
  if (!hasSession()) return 0;
  const monthly = await getMonthlySummary(monthKey());
  return Number(monthly && monthly.missingSlots) || 0;
}

module.exports = {
  fetchMissingCount,
};
