/**
 * 补卡时间输入行为：小时/分钟分段输入、数字键盘缓冲和确认态。
 * 组件需提供 makeupDirect、makeupSubmitting 两个 data 字段。
 */

const { pad2 } = require("../utils/time");

const ARROW_DIGITS = "0123456789";

function isDigitAt(value, index) {
  return ARROW_DIGITS.indexOf(value.substring(index, index + 1)) >= 0;
}

module.exports = Behavior({
  data: {
    makeupTime: "08:30",
    makeupConfirmDisabled: false,
    hourText: "08",
    minuteText: "30",
    hourSegOn: false,
    minuteSegOn: false,
    hourTextOn: false,
    minuteTextOn: false,
    timePart: "",
    digitBuffer: "",
    timeFocus: false,
  },

  lifetimes: {
    attached() {
      this.lastDigitEvent = "";
      this.timeRefocus = false;
    },
  },

  methods: {
    isClockTime(value) {
      if (!value || value.length !== 5) return false;
      if (value.substring(2, 3) !== ":") return false;
      return (
        isDigitAt(value, 0) &&
        isDigitAt(value, 1) &&
        isDigitAt(value, 3) &&
        isDigitAt(value, 4)
      );
    },

    resetTimeEntry() {
      this.lastDigitEvent = "";
      this.timeRefocus = false;
      this.setData({
        timePart: "",
        digitBuffer: "",
        timeFocus: false,
      });
      this.syncTimeDisplay();
    },

    timePartText(isHour) {
      const current = this.data.makeupTime || "";
      if (isHour) {
        return current.length >= 2 ? current.substring(0, 2) : "00";
      }
      return current.length >= 5 ? current.substring(3, 5) : "00";
    },

    syncTimeDisplay() {
      const current = this.data.makeupTime || "";
      const buffer = this.data.digitBuffer || "";
      const part = this.data.timePart;
      let hourText = current.substring(0, 2);
      let minuteText = current.substring(3, 5);
      if (part === "hour" && buffer.length === 1) hourText = buffer;
      if (part === "minute" && buffer.length === 1) minuteText = buffer;
      const confirmDisabled = this.data.makeupDirect
        ? buffer.length > 0 || !this.isClockTime(current)
        : false;
      this.setData({
        hourText,
        minuteText,
        hourSegOn: part === "hour",
        minuteSegOn: part === "minute",
        hourTextOn: part === "hour",
        minuteTextOn: part === "minute",
        makeupConfirmDisabled: confirmDisabled,
      });
    },

    writePart(isHour, text) {
      if (isHour) {
        this.setData({
          makeupTime: `${text}:${this.timePartText(false)}`,
        });
      } else {
        this.setData({
          makeupTime: `${this.timePartText(true)}:${text}`,
        });
      }
      this.syncTimeDisplay();
    },

    commitPendingDigit() {
      const buffer = this.data.digitBuffer || "";
      if (buffer.length !== 1) return;
      const digit = ARROW_DIGITS.indexOf(buffer);
      if (digit < 0) {
        this.setData({ digitBuffer: "" });
        this.syncTimeDisplay();
        return;
      }
      this.writePart(this.data.timePart === "hour", pad2(digit));
      this.setData({ digitBuffer: "" });
      this.syncTimeDisplay();
    },

    applyDigit(isHour, digit) {
      const maxFirst = isHour ? 2 : 5;
      const maxValue = isHour ? 23 : 59;
      const buffer = this.data.digitBuffer || "";
      if (buffer.length === 0) {
        if (digit > maxFirst) {
          this.writePart(isHour, pad2(digit));
          if (isHour) this.setData({ timePart: "minute" });
          this.syncTimeDisplay();
          return;
        }
        this.setData({ digitBuffer: ARROW_DIGITS.substring(digit, digit + 1) });
        this.syncTimeDisplay();
        return;
      }
      const typed = ARROW_DIGITS.indexOf(buffer) * 10 + digit;
      if (typed > maxValue) return;
      this.writePart(isHour, pad2(typed));
      this.setData({ digitBuffer: "" });
      if (isHour) this.setData({ timePart: "minute" });
      this.syncTimeDisplay();
    },

    focusTimePart(part) {
      if (this.data.makeupSubmitting) return;
      this.commitPendingDigit();
      this.setData({
        timePart: part,
        digitBuffer: "",
      });
      this.lastDigitEvent = "";
      if (this.data.timeFocus) {
        this.timeRefocus = true;
        this.setData({ timeFocus: false });
        wx.nextTick(() => this.setData({ timeFocus: true }));
      } else {
        wx.nextTick(() => this.setData({ timeFocus: true }));
      }
      this.syncTimeDisplay();
    },

    onFocusHour() {
      this.focusTimePart("hour");
    },

    onFocusMinute() {
      this.focusTimePart("minute");
    },

    onTimeDigit(event) {
      const incoming = String((event.detail && event.detail.value) || "");
      if (incoming === this.lastDigitEvent) return this.data.digitBuffer;
      this.lastDigitEvent = incoming;
      let digitText = "";
      for (let index = 0; index < incoming.length; index += 1) {
        const ch = incoming.substring(index, index + 1);
        if (ARROW_DIGITS.indexOf(ch) >= 0) digitText = ch;
      }
      if (!digitText) return this.data.digitBuffer;
      const digit = ARROW_DIGITS.indexOf(digitText);
      if (this.data.timePart === "hour") {
        this.applyDigit(true, digit);
      } else if (this.data.timePart === "minute") {
        this.applyDigit(false, digit);
      }
      return this.data.digitBuffer;
    },

    onTimeBlur() {
      if (this.timeRefocus) {
        this.timeRefocus = false;
        return;
      }
      this.commitPendingDigit();
      this.setData({ timeFocus: false, timePart: "" });
      this.syncTimeDisplay();
    },
  },
});
