const assert = require("node:assert/strict");
const { describe, it, beforeEach } = require("node:test");

global.Behavior = (definition) => definition;
global.wx = {
  nextTick(callback) {
    callback();
  },
};

const behavior = require("./makeup-time");

function createHost() {
  const host = {
    data: {
      ...behavior.data,
      makeupDirect: true,
      makeupSubmitting: false,
    },
    setData(patch) {
      Object.assign(this.data, patch);
    },
  };
  Object.assign(host, behavior.methods);
  behavior.lifetimes.attached.call(host);
  return host;
}

describe("makeup time entry", () => {
  let host;

  beforeEach(() => {
    host = createHost();
  });

  it("keeps the numeric keypad path and confirms a complete clock time", () => {
    assert.equal(typeof host.onTimeDigit, "function");
    assert.equal(typeof host.onTimeBlur, "function");
    assert.equal(typeof host.onFocusHour, "function");
    assert.equal(typeof host.onFocusMinute, "function");
    assert.equal(host.isClockTime("08:30"), true);
    assert.equal(host.isClockTime("8:30"), false);
  });

  it("highlights the tapped segment and focuses the hidden input", () => {
    host.onFocusHour();
    assert.equal(host.data.timePart, "hour");
    assert.equal(host.data.timeFocus, true);
    assert.equal(host.data.hourSegOn, true);
    assert.equal(host.data.minuteSegOn, false);

    host.onFocusMinute();
    assert.equal(host.data.timePart, "minute");
    assert.equal(host.data.timeFocus, true);
    assert.equal(host.data.minuteSegOn, true);
    assert.equal(host.data.hourSegOn, false);
  });

  it("does not focus while a makeup submit is in progress", () => {
    host.data.makeupSubmitting = true;
    host.onFocusHour();
    assert.equal(host.data.timeFocus, false);
    assert.equal(host.data.timePart, "");
  });

  it("buffers the first hour digit and advances after the second", () => {
    host.onFocusHour();
    host.onTimeDigit({ detail: { value: "1" } });
    assert.equal(host.data.digitBuffer, "1");
    assert.equal(host.data.hourText, "1");
    assert.equal(host.data.makeupTime, "08:30");
    assert.equal(host.data.makeupConfirmDisabled, true);
    assert.equal(host.data.timePart, "hour");

    host.onTimeDigit({ detail: { value: "8" } });
    assert.equal(host.data.digitBuffer, "");
    assert.equal(host.data.makeupTime, "18:30");
    assert.equal(host.data.hourText, "18");
    assert.equal(host.data.timePart, "minute");
    assert.equal(host.data.minuteSegOn, true);
    assert.equal(host.data.makeupConfirmDisabled, false);
  });

  it("writes a single hour digit above 2 and moves to minutes", () => {
    host.onFocusHour();
    host.onTimeDigit({ detail: { value: "9" } });
    assert.equal(host.data.makeupTime, "09:30");
    assert.equal(host.data.timePart, "minute");
    assert.equal(host.data.digitBuffer, "");
  });

  it("rejects an hour above 23 and keeps the pending digit", () => {
    host.onFocusHour();
    host.onTimeDigit({ detail: { value: "2" } });
    host.onTimeDigit({ detail: { value: "24" } });
    assert.equal(host.data.digitBuffer, "2");
    assert.equal(host.data.makeupTime, "08:30");
    assert.equal(host.data.timePart, "hour");
  });

  it("commits a buffered hour on blur", () => {
    host.onFocusHour();
    host.onTimeDigit({ detail: { value: "2" } });
    host.onTimeBlur();
    assert.equal(host.data.makeupTime, "02:30");
    assert.equal(host.data.hourText, "02");
    assert.equal(host.data.digitBuffer, "");
    assert.equal(host.data.timeFocus, false);
    assert.equal(host.data.timePart, "");
    assert.equal(host.data.hourSegOn, false);
  });

  it("commits a pending hour digit when switching to minutes", () => {
    host.onFocusHour();
    host.onTimeDigit({ detail: { value: "1" } });
    host.onFocusMinute();
    assert.equal(host.data.makeupTime, "01:30");
    assert.equal(host.data.timePart, "minute");
    assert.equal(host.data.minuteTextOn, true);
    assert.equal(host.data.digitBuffer, "");
  });

  it("keeps the new segment when focus is toggled to hold the keyboard", () => {
    host.onFocusHour();
    host.onTimeDigit({ detail: { value: "1" } });
    host.onFocusMinute();
    host.onTimeBlur();
    assert.equal(host.data.timePart, "minute");
    assert.equal(host.data.timeFocus, true);
    assert.equal(host.data.makeupTime, "01:30");
  });

  it("pads a minute digit above 5 and accepts a two-digit minute through 59", () => {
    host.onFocusMinute();
    host.onTimeDigit({ detail: { value: "6" } });
    assert.equal(host.data.makeupTime, "08:06");
    assert.equal(host.data.timePart, "minute");
    assert.equal(host.data.digitBuffer, "");

    host.onTimeDigit({ detail: { value: "5" } });
    host.onTimeDigit({ detail: { value: "9" } });
    assert.equal(host.data.makeupTime, "08:59");
    assert.equal(host.data.minuteText, "59");
  });

  it("rejects a minute above 59", () => {
    host.onFocusMinute();
    host.setData({ digitBuffer: "6" });
    host.applyDigit(false, 0);
    assert.equal(host.data.digitBuffer, "6");
    assert.equal(host.data.makeupTime, "08:30");
    assert.equal(host.data.timePart, "minute");
  });

  it("restores the pending digit when the keypad sends a delete", () => {
    host.onFocusHour();
    host.onTimeDigit({ detail: { value: "1" } });
    const restored = host.onTimeDigit({ detail: { value: "" } });
    assert.equal(restored, "1");
    assert.equal(host.data.digitBuffer, "1");
    assert.equal(host.data.hourText, "1");
  });
});
