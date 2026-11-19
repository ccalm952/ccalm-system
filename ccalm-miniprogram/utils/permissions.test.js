const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { canManageAttendance } = require("./permissions");

describe("canManageAttendance", () => {
  it("有 attendance.manage 时为真", () => {
    assert.equal(
      canManageAttendance({ permissions: ["attendance.manage"] }),
      true,
    );
  });

  it("无该权限时为假", () => {
    assert.equal(canManageAttendance({ permissions: ["staff.manage"] }), false);
  });

  it("旧 role=admin 字段不再视为可管理考勤", () => {
    assert.equal(canManageAttendance({ role: "admin" }), false);
  });

  it("无 user / permissions 时为假", () => {
    assert.equal(canManageAttendance(null), false);
    assert.equal(canManageAttendance({}), false);
  });
});
