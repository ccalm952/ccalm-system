const FIELD_LABELS: Record<string, string> = {
  month: "月份",
  monthAllowance: "本月假期",
  username: "账号",
  password: "密码",
  displayName: "显示名",
  date: "日期",
  half: "时段",
  type: "类型",
  role: "角色",
  initialLeaveBalance: "初始假期额度",
};

const NEST_DEFAULT_MESSAGES: Record<string, string> = {
  Forbidden: "无权限",
  Unauthorized: "未登录或登录已失效",
  "Not Found": "资源不存在",
  "Bad Request": "请求参数不合法",
  "Internal Server Error": "服务器错误",
};

function fieldLabel(name: string): string {
  return FIELD_LABELS[name] ?? name;
}

function translateOneMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;

  const nest = NEST_DEFAULT_MESSAGES[trimmed];
  if (nest) return nest;

  const http = /^HTTP (\d+)$/.exec(trimmed);
  if (http) return `请求失败（${http[1]}）`;

  let m = /^property (\w+) should not exist$/i.exec(trimmed);
  if (m) return `包含不允许的字段：${fieldLabel(m[1])}`;

  m = /^(\w+) should not exist$/i.exec(trimmed);
  if (m) return `包含不允许的字段：${fieldLabel(m[1])}`;

  m = /^(\w+) should not be empty$/.exec(trimmed);
  if (m) return `${fieldLabel(m[1])}不能为空`;

  m = /^(\w+) must be a string$/.exec(trimmed);
  if (m) return `${fieldLabel(m[1])}须为文本`;

  m = /^(\w+) must be a number conforming to the specified constraints$/.exec(trimmed);
  if (m) return `${fieldLabel(m[1])}须为数字`;

  m = /^(\w+) must be a number$/.exec(trimmed);
  if (m) return `${fieldLabel(m[1])}须为数字`;

  m = /^(\w+) must be an integer number$/.exec(trimmed);
  if (m) return `${fieldLabel(m[1])}须为整数`;

  m = /^(\w+) must be a boolean value$/.exec(trimmed);
  if (m) return `${fieldLabel(m[1])}须为是/否`;

  m = /^(\w+) must not be less than (\d+(?:\.\d+)?)$/.exec(trimmed);
  if (m) return `${fieldLabel(m[1])}不能小于 ${m[2]}`;

  m = /^(\w+) must match .+ regular expression$/.exec(trimmed);
  if (m) return `${fieldLabel(m[1])}格式不正确`;

  m = /^(\w+) must be one of the following values: .+$/.exec(trimmed);
  if (m) return `${fieldLabel(m[1])}取值不合法`;

  return trimmed;
}

function translateUserFacingMessage(message: string): string {
  if (message.includes("; ")) {
    return message.split("; ").map(translateOneMessage).join("；");
  }
  return translateOneMessage(message);
}

/** 将异常转为可展示文案 */
export function errorMessage(e: unknown): string {
  let raw = "";
  if (e instanceof Error) raw = e.message;
  else if (typeof e === "string") raw = e;
  else if (e != null && typeof e === "object" && "message" in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === "string") raw = m;
    else if (Array.isArray(m)) {
      const parts = m.filter((x): x is string => typeof x === "string");
      if (parts.length) raw = parts.join("; ");
    }
  } else {
    try {
      raw = JSON.stringify(e);
    } catch {
      raw = String(e);
    }
  }
  return translateUserFacingMessage(raw);
}
