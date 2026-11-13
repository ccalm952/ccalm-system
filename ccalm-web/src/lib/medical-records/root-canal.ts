import { parseTeethStrict } from "@/lib/tooth-fdi";

/**
 * 根管长度：处置文本里「根管名 + 长度」的结构化视图。
 * 文本仍是唯一存储（ToothEntry.text），这里只负责解析 / 回写，
 * 所以旧病历（一段长句）也能被识别出根管条。
 */
export type RootCanal = {
  /** 规范根管名，如 近颊 / 近颊2 / 腭 / 单根管 */
  name: string;
  /** 工作长度（mm），保留输入中间态，如 "18"、"18.5" */
  length: string;
  /** 主尖锉 / 器械号，如 0625；解析旧文本时保留，编辑时不改 */
  file?: string;
};

const SINGLE = ["单根"];
// 名字要和 CANAL_ALIASES 的规范名一致：腭根统一写成「腭」、颊根统一写成「颊」，
// 否则回写后再解析会多出一个根管
const UPPER_PREMOLAR = ["颊", "腭"];
const UPPER_MOLAR = ["近颊", "近颊2", "远颊", "腭"];
const LOWER_MOLAR = ["近颊", "近舌", "远中"];
const UPPER_DECIDUOUS_MOLAR = ["近颊", "远颊", "腭"];
const LOWER_DECIDUOUS_MOLAR = ["近中", "远中"];

/** 没选牙位（或牙位是自由文本）时的兜底候选 */
export const GENERIC_CANALS = ["近颊", "近舌", "远颊", "远中", "腭", "单根"];

function canalsForFdi(fdi: number): string[] {
  const quadrant = Math.floor(fdi / 10);
  const position = fdi % 10;
  if (quadrant >= 5) {
    // 乳牙：乳切牙/乳尖牙单根管，乳磨牙按上/下颌分
    if (position <= 3) return SINGLE;
    return quadrant === 5 || quadrant === 6
      ? UPPER_DECIDUOUS_MOLAR
      : LOWER_DECIDUOUS_MOLAR;
  }
  if (position <= 3) return SINGLE;
  if (position <= 5) {
    return quadrant === 1 || quadrant === 2 ? UPPER_PREMOLAR : SINGLE;
  }
  return quadrant === 1 || quadrant === 2 ? UPPER_MOLAR : LOWER_MOLAR;
}

/** 按牙位给出根管候选；多牙位时按顺序合并。无牙位时给通用候选 */
export function canalPresetsForTeeth(teeth: string): string[] {
  const fdis = parseTeethStrict(teeth);
  if (!fdis?.length) return GENERIC_CANALS;
  const out: string[] = [];
  for (const fdi of fdis) {
    for (const canal of canalsForFdi(fdi)) {
      if (!out.includes(canal)) out.push(canal);
    }
  }
  return out;
}

/** 不是每颗牙都有的根管（MB2），默认不占槽位，点一下再加 */
const OPTIONAL_CANALS = ["近颊2"];

/** 默认槽位：每颗牙通常都要记的根管 */
export function canalSlotsForTeeth(teeth: string): string[] {
  return canalPresetsForTeeth(teeth).filter(
    (c) => !OPTIONAL_CANALS.includes(c),
  );
}

/** 可选根管：默认不显示输入框，需要时再点出来 */
export function optionalCanalPresetsForTeeth(teeth: string): string[] {
  return canalPresetsForTeeth(teeth).filter((c) => OPTIONAL_CANALS.includes(c));
}

/** 别名 → 规范名；长别名在前，正则才能优先匹配「近中颊」而不是「近中」 */
const CANAL_ALIASES: [alias: string, name: string][] = [
  ["近中颊2", "近颊2"],
  ["近颊2", "近颊2"],
  ["近中颊", "近颊"],
  ["近颊", "近颊"],
  ["远中颊", "远颊"],
  ["远颊", "远颊"],
  ["近中舌", "近舌"],
  ["近舌", "近舌"],
  ["远中根", "远中"],
  ["远中", "远中"],
  ["近中根", "近中"],
  ["近中", "近中"],
  ["腭根", "腭"],
  ["腭侧", "腭"],
  ["腭", "腭"],
  ["颊根", "颊"],
  ["颊侧", "颊"],
  ["颊", "颊"],
  ["舌根", "舌"],
  ["单根管", "单根"],
  ["单根", "单根"],
  ["单管", "单根"],
];

const escapeAlias = (alias: string) =>
  alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** 名字以数字结尾的（近颊2），和长度连写会分不清，必须用空格/分隔符隔开 */
const endsWithDigit = (alias: string) => /\d$/.test(alias);

const SAFE_NAME_PATTERN = CANAL_ALIASES.filter(([a]) => !endsWithDigit(a))
  .sort(([a], [b]) => b.length - a.length)
  .map(([a]) => escapeAlias(a))
  .join("|");

const DIGIT_NAME_PATTERN = CANAL_ALIASES.filter(([a]) => endsWithDigit(a))
  .sort(([a], [b]) => b.length - a.length)
  .map(([a]) => escapeAlias(a))
  .join("|");

/**
 * 三段可选：
 * 1. 普通根管名 + 可选分隔符 + 长度（允许 "18." 这类输入中间态）+ 可选 mm + 可选锉号；
 * 2. 以数字结尾的根管名（近颊2），必须跟空格或分隔符再接长度，避免「近颊22」被拆错；
 * 3. 只有根管名（长度还没填），要求名字后面是空白或分隔符，避免误判「近颊侧壁」。
 */
const CANAL_PATTERN = new RegExp(
  [
    // 1) 以数字结尾的根管名（近颊2）：必须用空格/分隔符隔开，优先于普通名字匹配
    `(${DIGIT_NAME_PATTERN})(?:\\s*[=:：]\\s*|\\s+)(\\d{1,2}(?:\\.\\d*)?)\\s*(?:mm|MM|毫米)?(?:\\s+(\\d{3,4}))?`,
    // 2) 普通根管名 + 可选分隔符 + 长度（允许 "18." 这类输入中间态）+ 可选 mm + 可选锉号
    `(${SAFE_NAME_PATTERN})\\s*[=:：]?\\s*(\\d{1,2}(?:\\.\\d*)?)\\s*(?:mm|MM|毫米)?(?:\\s+(\\d{3,4}))?`,
    // 3) 只有根管名（长度还没填），要求后面是空白或分隔符，避免误判「近颊侧壁」
    `(${SAFE_NAME_PATTERN})(?=\\s|$|[，,、/;；])`,
  ].join("|"),
  "g",
);

function canonicalName(alias: string): string {
  return CANAL_ALIASES.find(([a]) => a === alias)?.[1] ?? alias;
}

/** 收拢空白与收尾分隔符，避免反复编辑后文本越来越乱 */
function tidyPrefix(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/^[\s，,、/;；]+/, "")
    .replace(/[\s，,、/;；]+$/, "");
}

/** 一个牙位的根管组；tooth 为空表示不区分牙位（单牙位时的旧写法） */
export type RootCanalGroup = {
  tooth: string;
  canals: RootCanal[];
  /** 该组里根管前面的文字，如「根备」 */
  before: string;
  /** 该组里根管后面的文字，如「试尖」 */
  after: string;
};

/** 把一段文字拆成「根管条目 + 其余文字」，其余文字按前后原样保留 */
function parseCanals(text: string): {
  before: string;
  after: string;
  canals: RootCanal[];
} {
  const canals: RootCanal[] = [];
  let before = "";
  let last = 0;
  for (const match of text.matchAll(CANAL_PATTERN)) {
    const index = match.index ?? 0;
    before += text.slice(last, index);
    last = index + match[0].length;
    const alias = match[1] ?? match[4] ?? match[7];
    if (!alias) continue;
    const name = canonicalName(alias);
    const length = (match[1] ? match[2] : match[4] ? match[5] : "") ?? "";
    const file = (match[1] ? match[3] : match[6]) ?? "";
    const canal: RootCanal = {
      name,
      length,
      ...(file ? { file } : {}),
    };
    // 同名根管重复出现时以最后一次为准，避免出现两个「近颊2」
    const existingIndex = canals.findIndex((c) => c.name === name);
    if (existingIndex >= 0) canals[existingIndex] = canal;
    else canals.push(canal);
  }
  return {
    before: tidyPrefix(before),
    after: tidyPrefix(text.slice(last)),
    canals,
  };
}

/**
 * 解析处置文本为按牙位分组的根管组，每个牙位一行：
 * 「根备 36 近颊18 近舌17\n37 近颊18」→ 36、37 两组，36 组前面带「根备」。
 * 牙位后也兼容旧的「：」，行间也兼容旧的「；」；没有牙位前缀的旧文本会解析成 tooth 为空的一组。
 */
export function parseCanalGroups(text: string): {
  prefix: string;
  groups: RootCanalGroup[];
} {
  const groups: RootCanalGroup[] = [];
  const prefixParts: string[] = [];
  for (const rawPart of text.split(/[\n\r；;]+/)) {
    const part = rawPart.trim();
    if (!part) continue;
    const label = /^(\d{1,2})(?:\s*[:：]\s*|\s+)/.exec(part);
    const tooth = label?.[1] ?? "";
    const { before, after, canals } = parseCanals(
      label ? part.slice(label[0].length) : part,
    );
    if (!canals.length) {
      // 不是根管行（如「36 近颊侧壁龋坏」）：牙位号也一起留在自由文字里
      const rest = [before, after].filter(Boolean).join(" ");
      const text = label ? `${label[1]} ${rest}`.trim() : rest;
      if (text) prefixParts.push(text);
      continue;
    }
    // 同一个牙位写了多行时合并，避免出现两组同牙位
    const same = tooth ? groups.find((g) => g.tooth === tooth) : undefined;
    if (same) {
      for (const canal of canals) {
        const i = same.canals.findIndex((c) => c.name === canal.name);
        if (i >= 0) same.canals[i] = canal;
        else same.canals.push(canal);
      }
      same.before = [same.before, before].filter(Boolean).join(" ");
      same.after = [same.after, after].filter(Boolean).join(" ");
      continue;
    }
    groups.push({ tooth, canals, before, after });
  }
  return { prefix: tidyPrefix(prefixParts.join(" ")), groups };
}

/** 按牙位分组回写处置文本，每个牙位一行，如「36 近颊18 近舌17\n37 近颊18」 */
export function formatCanalGroups(
  prefix: string,
  groups: RootCanalGroup[],
): string {
  const parts = groups
    .map((group) => {
      const tokens = group.canals
        .filter((c) => c.name.trim() !== "")
        .map((c) => {
          const name = c.name.trim();
          // 近颊2 这类名字与长度连写会歧义，中间留空格
          const separator = endsWithDigit(name) ? " " : "";
          return `${name}${separator}${c.length.trim()}${c.file ? ` ${c.file}` : ""}`;
        })
        .join(" ");
      const body = [tidyPrefix(group.before), tokens, tidyPrefix(group.after)]
        .filter(Boolean)
        .join(" ");
      if (!body) return "";
      return group.tooth ? `${group.tooth} ${body}` : body;
    })
    .filter(Boolean);
  return [
    [tidyPrefix(prefix), parts[0]].filter(Boolean).join(" "),
    ...parts.slice(1),
  ]
    .filter(Boolean)
    .join("\n");
}
