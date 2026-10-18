const { get, post } = require("./http");

function statusQuery(status) {
  return status ? `?status=${status}` : "";
}

/**
 * 打卡页所需的班次、今日记录、月汇总。
 * @param {string} month YYYY-MM
 */
function getAttendanceBundle(month) {
  return get(`/attendance/bundle?month=${month}`);
}

function getGeofence() {
  return get("/attendance/geofence");
}

function getShift() {
  return get("/attendance/shift");
}

function submitPunch(body) {
  return post("/attendance/punch", body);
}

function declareRest(body) {
  return post("/attendance/rest", body);
}

function clearRest(body) {
  return post("/attendance/rest/clear", body);
}

function createMakeupRequest(body) {
  return post("/attendance/makeup-requests", body);
}

function directMakeup(body) {
  return post("/attendance/makeup", body);
}

function listMyMakeupRequests(status) {
  return get(`/attendance/makeup-requests/mine${statusQuery(status)}`);
}

function listMakeupRequests(status) {
  return get(`/attendance/makeup-requests${statusQuery(status)}`);
}

function approveMakeupRequest(id) {
  return post(`/attendance/makeup-requests/${id}/approve`);
}

function rejectMakeupRequest(id) {
  return post(`/attendance/makeup-requests/${id}/reject`);
}

/**
 * 月汇总；不传 userId 时为当前用户，传 userId 时为管理员查看指定用户。
 * @param {string} month YYYY-MM
 * @param {string} [userId]
 */
function getMonthlySummary(month, userId) {
  const base = `/attendance/summary/monthly?month=${month}`;
  return get(userId ? `${base}&userId=${userId}` : base);
}

/**
 * 管理员查看全员月汇总（不含明细行）。
 * @param {string} month YYYY-MM
 */
function getMonthlySummaries(month) {
  return get(`/attendance/summary/monthly-all?month=${month}&detail=0`);
}

function getSchedule(month) {
  return get(`/attendance/schedule?month=${month}`);
}

function getHolidays(year) {
  return get(`/attendance/holidays?year=${year}`);
}

module.exports = {
  getAttendanceBundle,
  getGeofence,
  getShift,
  submitPunch,
  declareRest,
  clearRest,
  createMakeupRequest,
  directMakeup,
  listMyMakeupRequests,
  listMakeupRequests,
  approveMakeupRequest,
  rejectMakeupRequest,
  getMonthlySummary,
  getMonthlySummaries,
  getSchedule,
  getHolidays,
};
