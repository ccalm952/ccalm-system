const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { describe, it } = require("node:test");

const statsDir = __dirname;
const wxml = fs.readFileSync(path.join(statsDir, "stats.wxml"), "utf8");
const wxss = fs.readFileSync(path.join(statsDir, "stats.wxss"), "utf8");
const statsJs = fs.readFileSync(path.join(statsDir, "stats.js"), "utf8");

function ruleBody(source, selector) {
  const pattern = new RegExp(`${selector}\\s*\\{([^}]*)\\}`);
  const match = pattern.exec(source);
  assert.ok(match, `missing ${selector}`);
  return match[1];
}

function timeInput() {
  const match = /<input\b[\s\S]*?\/>/.exec(wxml);
  assert.ok(match, "missing native input");
  return match[0];
}

describe("makeup dialog time editor markup", () => {
  it("keeps one numeric input wired to the existing keypad handlers", () => {
    const inputs = wxml.match(/<input\b/g) || [];
    assert.equal(inputs.length, 1);
    const input = timeInput();
    assert.match(input, /class="time-key"/);
    assert.match(input, /type="number"/);
    assert.match(input, /always-embed="\{\{true\}\}"/);
    assert.match(input, /focus="\{\{timeFocus\}\}"/);
    assert.match(input, /value="\{\{digitBuffer\}\}"/);
    assert.match(input, /disabled="\{\{makeupSubmitting\}\}"/);
    assert.match(input, /adjust-position="\{\{false\}\}"/);
    assert.match(input, /bindinput="onTimeDigit"/);
    assert.match(input, /bindblur="onTimeBlur"/);
    assert.match(input, /bindkeyboardheightchange="onMakeupKeyboardHeight"/);
    assert.match(
      input,
      /aria-label="补卡时间 \{\{hourText\}\}:\{\{minuteText\}\}"/,
    );
    assert.doesNotMatch(input, /disabled="\{\{true\}\}"/);
    assert.doesNotMatch(input, /\bhidden\b/);
  });

  it("keeps hour and minute taps, highlight classes, and names", () => {
    assert.match(wxml, /catchtap="onFocusHour"/);
    assert.match(wxml, /catchtap="onFocusMinute"/);
    assert.match(wxml, /hourSegOn \? 'time-seg-on'/);
    assert.match(wxml, /minuteSegOn \? 'time-seg-on'/);
    assert.match(wxml, /aria-role="button"/);
    assert.match(wxml, /aria-label="编辑小时，当前 \{\{hourText\}\}"/);
    assert.match(wxml, /aria-label="编辑分钟，当前 \{\{minuteText\}\}"/);
    assert.match(
      wxml,
      /wx:if="\{\{makeupDirect\}\}" slot="footer-extra" class="time-field"/,
    );
  });

  it("clips the caret inside the time field instead of moving focus off screen", () => {
    const clip = ruleBody(wxss, ".time-key-clip");
    const key = ruleBody(wxss, ".time-key");
    assert.match(clip, /overflow:\s*hidden/);
    assert.match(clip, /width:\s*1px/);
    assert.match(clip, /height:\s*1px/);
    assert.match(clip, /left:\s*0/);
    assert.match(clip, /top:\s*0/);
    assert.match(key, /width:\s*1px/);
    assert.match(key, /height:\s*1px/);
    assert.match(key, /opacity:\s*0/);
    assert.match(key, /text-indent:\s*-9999px/);
    assert.match(key, /pointer-events:\s*none/);
    assert.doesNotMatch(key, /display:\s*none/);
    assert.doesNotMatch(key, /left:\s*-/);
    assert.match(wxml, /class="time-key-clip"/);
  });

  it("still lifts the dialog with the keyboard height", () => {
    assert.match(statsJs, /onMakeupKeyboardHeight\(event\)/);
    assert.match(
      statsJs,
      /shellStyle: height > 0 \? "justify-content: flex-end;" : ""/,
    );
    assert.match(
      statsJs,
      /makeupDialogLift: height > 0 \? `margin-bottom: \$\{height\}px;` : ""/,
    );
  });
});
