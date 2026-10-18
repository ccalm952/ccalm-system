const {
  approveMakeupRequest,
  listMakeupRequests,
  listMyMakeupRequests,
  rejectMakeupRequest,
} = require("./attendance");
const {
  approveUnbindRequest,
  listMyUnbindRequests,
  listUnbindRequests,
  rejectUnbindRequest,
} = require("./unbind");
const { getSession, isAdmin } = require("../store/session");
const { REVIEW_STATUS_LABELS } = require("../constants/review");
const { formatHm, formatYmdHm } = require("../utils/time");
const { badgeText } = require("../utils/badge");

function mapMakeup(item, review) {
  return {
    key: `makeup-${item.id}`,
    kind: "makeup",
    id: item.id,
    title: review ? item.userName || "" : "补卡申请",
    line: `${item.date} ${formatHm(item.punchTime)}`,
    status: item.status,
    statusLabel: REVIEW_STATUS_LABELS[item.status] || item.status,
    canReview: review && item.status === "pending",
  };
}

function mapUnbind(item, review) {
  return {
    key: `unbind-${item.id}`,
    kind: "unbind",
    id: item.id,
    title: review ? item.userName || "" : "解绑申请",
    line: formatYmdHm(item.createdAt),
    status: item.status,
    statusLabel: REVIEW_STATUS_LABELS[item.status] || item.status,
    canReview: review && item.status === "pending",
  };
}

async function fetchTodoState() {
  const session = getSession();
  if (!session || !session.accessToken) {
    return { isAdmin: false, badge: "", mine: [], pending: [] };
  }
  const admin = isAdmin(session);
  const [mineMakeups, mineUnbinds] = await Promise.all([
    listMyMakeupRequests(null).catch(() => []),
    listMyUnbindRequests(null).catch(() => []),
  ]);
  let pendingMakeups = [];
  let pendingUnbinds = [];
  if (admin) {
    [pendingMakeups, pendingUnbinds] = await Promise.all([
      listMakeupRequests("pending").catch(() => []),
      listUnbindRequests("pending").catch(() => []),
    ]);
  }
  const minePending =
    mineMakeups.filter((item) => item.status === "pending").length +
    mineUnbinds.filter((item) => item.status === "pending").length;
  const reviewCount = pendingMakeups.length + pendingUnbinds.length;
  return {
    isAdmin: admin,
    badge: badgeText(admin ? reviewCount : minePending),
    mine: [
      ...mineMakeups.map((item) => mapMakeup(item, false)),
      ...mineUnbinds.map((item) => mapUnbind(item, false)),
    ],
    pending: [
      ...pendingMakeups.map((item) => mapMakeup(item, true)),
      ...pendingUnbinds.map((item) => mapUnbind(item, true)),
    ],
  };
}

/**
 * 审批通过（补卡 / 解绑）。
 * @param {"makeup"|"unbind"} kind
 * @param {string} id
 */
function approveRequest(kind, id) {
  return kind === "unbind"
    ? approveUnbindRequest(id)
    : approveMakeupRequest(id);
}

/**
 * 审批拒绝（补卡 / 解绑）。
 * @param {"makeup"|"unbind"} kind
 * @param {string} id
 */
function rejectRequest(kind, id) {
  return kind === "unbind" ? rejectUnbindRequest(id) : rejectMakeupRequest(id);
}

module.exports = {
  fetchTodoState,
  approveRequest,
  rejectRequest,
};
