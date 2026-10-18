const { get, post } = require("./http");

function listMyUnbindRequests(status) {
  const query = status ? `?status=${status}` : "";
  return get(`/attendance/punch-device/unbind-requests/mine${query}`);
}

function listUnbindRequests(status) {
  const query = status ? `?status=${status}` : "";
  return get(`/attendance/punch-device/unbind-requests${query}`);
}

function approveUnbindRequest(id) {
  return post(`/attendance/punch-device/unbind-requests/${id}/approve`);
}

function rejectUnbindRequest(id) {
  return post(`/attendance/punch-device/unbind-requests/${id}/reject`);
}

module.exports = {
  listMyUnbindRequests,
  listUnbindRequests,
  approveUnbindRequest,
  rejectUnbindRequest,
};
