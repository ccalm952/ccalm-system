const { getMissingHistory, getMonthlySummary } = require("./attendance");
const { getSession, hasSession } = require("../store/session");
const { monthKey } = require("../utils/time");

async function fetchMissingCount() {
  if (!hasSession()) return 0;
  const session = getSession();
  const userId = session.user && session.user.id;
  const [monthly, history] = await Promise.all([
    getMonthlySummary(monthKey(), userId),
    getMissingHistory().catch(() => ({ allMissingSlots: 0 })),
  ]);
  const current = monthly ? Number(monthly.allMissingSlots) : 0;
  const previous = history ? Number(history.allMissingSlots) : 0;
  return current + previous;
}

module.exports = {
  fetchMissingCount,
};
