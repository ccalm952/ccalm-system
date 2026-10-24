const { getMissingHistory, getMonthlySummary } = require("./attendance");
const { hasSession } = require("../store/session");
const { monthKey } = require("../utils/time");

async function fetchMissingTotal() {
  if (!hasSession()) return 0;
  const [monthly, history] = await Promise.all([
    getMonthlySummary(monthKey()),
    getMissingHistory().catch(() => ({ allMissingSlots: 0 })),
  ]);
  const current = monthly ? Number(monthly.allMissingSlots) : 0;
  const previous = history ? Number(history.allMissingSlots) : 0;
  return current + previous;
}

module.exports = {
  fetchMissingTotal,
};
