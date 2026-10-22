/**
 * 月表行/单元格构建：出勤、休息、补卡按钮与审批中状态。
 */

const {
  canEmployeeMakeup,
  halfHasPunch,
  isHalfRest,
  passesMakeupTodayGate,
  slotTime,
} = require("./punch-rule");
const {
  buildEditWindowContext,
  dayOfMonth,
  isWithinEditWindow,
} = require("./time");

const MORNING_IN = { type: "morning_in", half: "morning", isIn: true };
const MORNING_OUT = { type: "morning_out", half: "morning", isIn: false };
const AFTERNOON_IN = { type: "afternoon_in", half: "afternoon", isIn: true };
const AFTERNOON_OUT = { type: "afternoon_out", half: "afternoon", isIn: false };

function emptyCell() {
  return { text: "", tone: "muted", actions: [], pending: false };
}

function isPending(requests, date, type) {
  return (requests || []).some(
    (item) =>
      item.date === date && item.type === type && item.status === "pending",
  );
}

function buildCell(row, meta, shift, requests, at) {
  const time = slotTime(row, meta.type);
  if (time) {
    return { text: time, tone: "plain", actions: [], pending: false };
  }
  if (isHalfRest(row.declaredRest, meta.half)) {
    if (!meta.isIn) {
      return { text: "—", tone: "muted", actions: [], pending: false };
    }
    return {
      text: "",
      tone: "muted",
      actions: [
        { text: "休息", kind: "clearRest", half: meta.half, type: null },
      ],
      pending: false,
    };
  }
  const waiting = isPending(requests, row.date, meta.type);
  const inWindow = isWithinEditWindow(row.date, buildEditWindowContext());
  const gate = shift
    ? {
        morningInWindowEnd: shift.morningInWindowEnd,
        afternoonInWindowEnd: shift.afternoonInWindowEnd,
      }
    : null;
  const gatePassed = passesMakeupTodayGate(row.date, meta.type, gate, at);
  const canMakeup =
    inWindow && gatePassed && canEmployeeMakeup(row, meta.type) && !waiting;
  const canRest = meta.isIn && inWindow && !halfHasPunch(row, meta.half);
  if (!canMakeup && !canRest && !waiting) {
    return emptyCell();
  }
  const actions = [];
  if (canRest) {
    actions.push({
      text: "休息",
      kind: "declareRest",
      half: meta.half,
      type: null,
    });
  }
  if (canMakeup) {
    actions.push({ text: "补卡", kind: "makeup", half: null, type: meta.type });
  }
  return {
    text: "",
    tone: waiting ? "pending" : "muted",
    actions,
    pending: waiting,
  };
}

function buildSlots(row) {
  return [
    { key: "in-am", cell: row.morningIn },
    { key: "out-am", cell: row.morningOut },
    { key: "in-pm", cell: row.afternoonIn },
    { key: "out-pm", cell: row.afternoonOut },
  ];
}

function buildAttendanceRow(row, shift, requests, at = new Date()) {
  const result = {
    date: row.date,
    day: dayOfMonth(row.date),
    source: row,
    morningIn: buildCell(row, MORNING_IN, shift, requests, at),
    morningOut: buildCell(row, MORNING_OUT, shift, requests, at),
    afternoonIn: buildCell(row, AFTERNOON_IN, shift, requests, at),
    afternoonOut: buildCell(row, AFTERNOON_OUT, shift, requests, at),
  };
  result.slots = buildSlots(result);
  return result;
}

function dateDisplay(date) {
  return `${date.slice(0, 4)}年${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日`;
}

function restConfirmMessage(row, half, clearing) {
  const day = `${Number(row.date.slice(5, 7))}月${Number(row.date.slice(8, 10))}日`;
  const halfLabel = half === "morning" ? "上午" : "下午";
  if (clearing) {
    return `确认取消 ${day} ${halfLabel}休息登记？`;
  }
  const becomesFullDay =
    (half === "morning" && row.declaredRest === "afternoon_rest") ||
    (half === "afternoon" && row.declaredRest === "morning_rest");
  return becomesFullDay
    ? `确认将 ${day} 登记为全天休息？`
    : `确认将 ${day} ${halfLabel}登记为休息？`;
}

module.exports = {
  buildAttendanceRow,
  dateDisplay,
  restConfirmMessage,
};
