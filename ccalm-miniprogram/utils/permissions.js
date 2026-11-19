/** 与 Web / API 一致：管理他人考勤/排班 */
const ATTENDANCE_MANAGE = "attendance.manage";

/**
 * @param {{permissions?: string[]}|null|undefined} user
 */
function canManageAttendance(user) {
  return (
    !!user &&
    Array.isArray(user.permissions) &&
    user.permissions.includes(ATTENDANCE_MANAGE)
  );
}

module.exports = {
  ATTENDANCE_MANAGE,
  canManageAttendance,
};
