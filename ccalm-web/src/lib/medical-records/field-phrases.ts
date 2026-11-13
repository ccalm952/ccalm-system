/** 各病历字段的词条：点输入框弹出面板，点词条插到光标处 */
export type PhraseGroup = {
  label: string;
  phrases: string[];
};

export type PhraseField =
  | "chiefComplaint"
  | "presentIllness"
  | "pastHistory"
  | "oralExam"
  | "auxiliaryExam"
  | "diagnosis"
  | "treatmentPlan"
  | "treatment"
  | "advice";

export const PHRASE_FIELD_LABELS: Record<PhraseField, string> = {
  chiefComplaint: "主诉",
  presentIllness: "现病史",
  pastHistory: "既往史",
  oralExam: "口腔检查",
  auxiliaryExam: "辅助检查",
  diagnosis: "诊断",
  treatmentPlan: "治疗计划",
  treatment: "处置",
  advice: "医嘱",
};

/** 部位与时间：直接拼在前面，不加逗号 */
const DIRECT_GROUPS = ["部位", "时间"];

const COMPLAINT: PhraseGroup[] = [
  {
    label: "部位",
    phrases: [
      "左上",
      "左下",
      "右上",
      "右下",
      "左",
      "右",
      "上",
      "下",
      "前牙",
      "后牙",
      "前后牙",
      "半口牙",
      "全口牙",
    ],
  },
  {
    label: "症状",
    phrases: [
      "有洞",
      "折断",
      "缺失",
      "咬合不适",
      "食物嵌塞",
      "刷牙出血",
      "牙冠变色",
      "牙列不齐",
      "充填物脱落",
      "冷热刺激痛",
      "冷热酸甜敏感",
    ],
  },
  { label: "时间", phrases: ["1小时", "1天", "1周", "1月", "1年"] },
  { label: "要求", phrases: ["要求拔牙", "要求洗牙", "要求镶牙", "要求矫正"] },
  {
    label: "转诊",
    phrases: [
      "接牙体转诊",
      "接修复转诊",
      "接牙周转诊",
      "接外科转诊",
      "接正畸转诊",
    ],
  },
  {
    label: "复诊",
    phrases: [
      "无明显不适，今日继续治疗",
      "无明显不适，今日治疗",
      "定期复诊洁治",
    ],
  },
];

const PRESENT_ILLNESS: PhraseGroup[] = [
  { label: "时间", phrases: ["1小时前", "1天前", "1周前", "1月来", "1年来"] },
  {
    label: "部位",
    phrases: [
      "左上",
      "左下",
      "右上",
      "右下",
      "左",
      "右",
      "上",
      "下",
      "前牙",
      "后牙",
      "前后牙",
      "半口牙",
      "全口牙",
      "患者自觉",
      "体检发现",
    ],
  },
  {
    label: "症状",
    phrases: [
      "有洞",
      "折断",
      "缺失",
      "咬合不适",
      "食物嵌塞",
      "刷牙出血",
      "牙冠变色",
      "牙列不齐",
      "充填物脱落",
      "冷热刺激痛",
      "冷热酸甜敏感",
    ],
  },
  {
    label: "治疗情况",
    phrases: [
      "未治疗。",
      "本院治疗，",
      "外院治疗，",
      "牙髓治疗，",
      "充填治疗，",
      "牙周治疗，",
      "治疗，具体不详，",
    ],
  },
  { label: "症状变化", phrases: ["缓解，", "稍缓解，", "未缓解，"] },
  {
    label: "口腔习惯",
    phrases: [
      "刷牙 2次/日，2min/次，不使用牙线，不使用间隙刷。",
      "使用电动牙刷。",
    ],
  },
];

const PAST_HISTORY: PhraseGroup[] = [
  { label: "常规", phrases: ["体健。", "无特殊。", "否认系统性病史。"] },
  {
    label: "高血压",
    phrases: [
      "否认高血压。",
      "高血压史 10年，服药控制，血压 140/80mmHg。",
      "每日服用抗高血压药物",
    ],
  },
  {
    label: "心脏病",
    phrases: [
      "否认心脏病。",
      "心脏病史 5年，",
      "每日服用阿司匹林。",
      "每日服用华法令。",
      "未服抗凝药。",
    ],
  },
  {
    label: "糖尿病",
    phrases: [
      "否认糖尿病。",
      "糖尿病史 5年，维持血糖 mmol/L。",
      "每日服用抗糖尿病药物",
    ],
  },
  {
    label: "药物过敏",
    phrases: ["不详。", "否认药物过敏。", "青霉素类过敏。", "磺胺类过敏。"],
  },
  {
    label: "传染病史",
    phrases: ["乙型肝炎病史。", "AIDS病史。", "结核病史。", "甲型肝炎病史。"],
  },
  { label: "家族病史", phrases: ["无特殊家族病史。"] },
];

const EXAM: PhraseGroup[] = [
  {
    label: "常规检查",
    phrases: [
      "探",
      "叩",
      "松动",
      "牙龈",
      "-，",
      "±，",
      "＋，",
      "++",
      "＋＋＋,",
    ],
  },
  {
    label: "特殊检查",
    phrases: [
      "冷测试",
      "热测试",
      "电活力测试",
      "敏感，",
      "疼痛，",
      "迟钝，",
      "无反应，",
      "正常，",
    ],
  },
  {
    label: "龋坏",
    phrases: [
      "浅龋坏，",
      "龋坏，",
      "深大龋坏，",
      "白垩色，",
      "墨浸样改变，",
      "质软，",
      "质硬，",
    ],
  },
  {
    label: "非龋性",
    phrases: [
      "畸形尖，",
      "畸形沟，",
      "冠根折，",
      "微裂纹，",
      "氟斑牙，",
      "楔形缺损，",
      "重度磨耗，",
      "釉质发育不全，",
    ],
  },
  {
    label: "旧充填",
    phrases: [
      "牙色充填体，",
      "银汞充填体，",
      "暂封材料，",
      "边缘可，",
      "边缘密合，",
      "边缘不密合，",
      "继发龋坏，",
      "悬突，",
      "充填体部分脱落，",
      "充填体折断，",
    ],
  },
  {
    label: "牙周",
    phrases: [
      "口腔卫生状况不良，牙龈红肿，",
      "牙石",
      "软垢",
      "色素",
      "BI=",
      "PD=",
      "AL=",
    ],
  },
  {
    label: "修复",
    phrases: [
      "缺失，未修复，",
      "缺失，活动义齿修复，",
      "缺失，种植体修复，",
      "缺失，固定修复，",
      "缺隙近远中距离 mm，",
      "颌龈距 mm，",
      "无对牙合牙，",
      "牙槽嵴丰满，",
    ],
  },
  {
    label: "咬合",
    phrases: [
      "前牙",
      "后牙",
      "深覆合，",
      "深覆盖，",
      "对刃，",
      "开合，",
      "反合，",
      "锁合，",
      "尖牙关系",
      "磨牙关系",
      "近中，",
      "远中，",
      "正常，",
    ],
  },
  {
    label: "关节",
    phrases: ["左侧关节", "右侧关节", "两侧关节", "疼痛", "弹响", "压痛"],
  },
];

const TREATMENT_PLAN: PhraseGroup[] = [
  {
    label: "牙体牙髓",
    phrases: ["充填治疗", "根管治疗", "根管再治疗", "根管治疗+冠修复"],
  },
  { label: "正畸", phrases: ["隐形矫治", "固定矫治"] },
  { label: "儿牙", phrases: ["窝沟封闭", "充填治疗", "根管治疗", "乳牙拔除"] },
  { label: "外科", phrases: ["拔除", "手术切除"] },
  {
    label: "修复",
    phrases: [
      "冠修复",
      "桩冠修复",
      "固定桥修复",
      "活动义齿修复",
      "全口活动义齿修复",
      "种植修复",
      "贴面修复",
      "美白",
    ],
  },
  {
    label: "牙周",
    phrases: ["OHI", "洁治", "刮治、根面平整", "冠延长手术", "牙周手术"],
  },
];

const TREATMENT: PhraseGroup[] = [
  {
    label: "口腔宣教",
    phrases: ["OHI口腔卫生宣教，刷牙、牙线、间隙刷使用宣教。"],
  },
  {
    label: "知情同意",
    phrases: [
      "向患者交代病情、治疗计划、费用、预后等，患者知情并同意治疗。",
      "解释病情，患者及家属知情，要求考虑，择日治疗。",
      "告知病情，治疗方案，费用，风险，患者要求拔牙，知情同意",
    ],
  },
  {
    label: "麻醉",
    phrases: [
      "4%阿替卡因局部浸润麻醉，",
      "4%阿替卡因阻滞麻醉，",
      "2%利多卡因局部浸润麻醉，",
      "2%利多卡因阻滞麻醉，",
    ],
  },
  {
    label: "充填",
    phrases: [
      "去尽腐质，达牙本质深层，未及露髓点,比色,排龈,上领面修复系统,护髓,垫底，树脂充填，调磨充填体高点，抛光",
      "去旧充填体，",
      "dycal护髓，",
      "玻璃离子垫底，",
    ],
  },
  {
    label: "根管",
    phrases: [
      "去腐质未尽露髓，出血大量，扩大穿髓孔，封无砷失活剂，Cervitron暂封。",
      "去暂封，取封药，揭顶，探及3根管，拔髓不成形，少量出血，手用锉疏通根管至15#，测根长。",
      "Glyde辅助下，机用镍钛，根管预备。",
      "冲洗，荡洗，干燥，根管封药，暂封。",
      "试主尖片，达根长，荡洗，拭净，热牙胶根充，垫底，GIC暂封。",
      "拍片，恰填。",
      "根管不通畅，疏通根管，超声尖去除髓腔钙化物。",
      "橡皮障，",
      "显微镜，",
      "5.25%NaClO冲洗，",
      "封药Ca(OH)2，",
    ],
  },
  {
    label: "牙周",
    phrases: [
      "3%双氧水含漱，超声洁治、抛光，3%双氧水冲洗，上药。",
      "刮治，根面平整。",
    ],
  },
  {
    label: "拔牙",
    phrases: [
      "分龈，增隙、挺松，钳拔除，搔刮，生理盐水冲洗，置明胶海绵，压迫止血。",
      "切开翻瓣，",
      "缝合，1针。",
      "消毒，拆线，生理盐水冲洗。",
    ],
  },
  {
    label: "修复",
    phrases: [
      "基牙预备，精修。",
      "制取硅橡胶印模，硅橡胶咬合记录，",
      "临时冠修复。",
      "去除临时冠及暂封材料，清洁基牙和修复体，",
      "试戴修复体边缘密合，邻接良好。",
      "调合、抛光，永久粘固。",
      "灌制石膏模型，口外制作个别托盘。",
      "试支架，就位顺利，基托密合，固位良好，无翘动。",
      "戴义齿，就位顺利，固位良好，基托密合，无翘动。",
    ],
  },
  {
    label: "种植",
    phrases: [
      "常规消毒铺巾，4%阿替卡因1.7mlX1支局部浸润麻醉，牙槽嵴顶水平切口，全层切开粘骨膜，翻瓣，定位，备洞至预定深度，置入植体，旋入覆盖螺丝，减张缝合，拍片位置可。",
      "植入骨粉，",
      "种植术区消毒，拆除缝合线，局部上药。",
      "切开翻瓣，暴露覆盖螺丝。拆下覆盖螺丝，局部冲洗，旋入愈合帽，加扭力15Ncm。",
      "旋出愈合帽，局部冲洗吹干。旋入取模柱，拍片确认到位，制取硅橡胶印模。重新旋入愈合帽。咬合记录。",
      "旋出愈合帽，局部冲洗吹干。在就位导板引导下旋入基台，拍片确认到位。试戴，边缘密合，邻接良好。调合、抛光。基台加扭力35Ncm，封闭螺丝孔。",
    ],
  },
  {
    label: "正畸",
    phrases: [
      "取模型，照相，正、侧位片。",
      "粘托槽、带环。",
      "去除托槽、带环。",
      "加力，",
      "片切，",
      "调合，",
      "弓丝： 尺寸 ，材质 ，弯曲 。",
      "牵引：类型 ，型号 ，时间 。",
      "活动矫治器： 类型 ，处置 。",
    ],
  },
];

const ADVICE: PhraseGroup[] = [
  { label: "常规医嘱", phrases: ["不适随诊。"] },
  {
    label: "充填医嘱",
    phrases: ["忌咬硬物，若出现牙髓症状行根管治疗。"],
  },
  {
    label: "根管医嘱",
    phrases: ["不适随诊，约两周后复诊取出失活剂。", "勿咬硬物，一周后复诊。"],
  },
  {
    label: "拔牙医嘱",
    phrases: [
      "不适随诊，咬棉卷40min，24h不刷牙漱口，2h后可饮食，饮食不宜过热。",
      "一周复诊拆线。",
    ],
  },
];

export const FIELD_PHRASES: Partial<Record<PhraseField, PhraseGroup[]>> = {
  chiefComplaint: COMPLAINT,
  presentIllness: PRESENT_ILLNESS,
  pastHistory: PAST_HISTORY,
  oralExam: EXAM,
  auxiliaryExam: EXAM,
  treatmentPlan: TREATMENT_PLAN,
  treatment: TREATMENT,
  advice: ADVICE,
};

/** 部位、时间直接接在前面，其余用中文逗号隔开（原词条已自带标点的除外） */
function separatorFor(before: string, groupLabel: string): string {
  if (!before) return "";
  if (DIRECT_GROUPS.includes(groupLabel)) return "";
  if (/[，,。；;、\s]$/.test(before)) return "";
  return "，";
}

/** 在光标处插入词条，返回新文本和插入后的光标位置 */
export function insertPhrase(
  text: string,
  start: number,
  end: number,
  groupLabel: string,
  phrase: string,
): { text: string; caret: number } {
  const before = text.slice(0, start);
  const after = text.slice(end);
  // 词条本身以标点结尾时不再补逗号
  const separator = /[，,。；;、]$/.test(phrase)
    ? ""
    : separatorFor(before, groupLabel);
  return {
    text: before + separator + phrase + after,
    caret: before.length + separator.length + phrase.length,
  };
}

/** 按关键字过滤词条；关键字为空时返回全部 */
export function filterPhraseGroups(
  groups: PhraseGroup[],
  query: string,
): PhraseGroup[] {
  const q = query.trim();
  if (!q) return groups;
  return groups
    .map((group) => ({
      label: group.label,
      phrases: group.phrases.filter((p) => p.includes(q)),
    }))
    .filter((group) => group.phrases.length > 0);
}

/** 光标前最后一个片段：从上一个标点/空格到光标，用于输入联想 */
export function segmentBefore(
  text: string,
  caret: number,
): { start: number; text: string } {
  const before = text.slice(0, Math.max(0, Math.min(caret, text.length)));
  const match = /[，,。；;、/\s]([^，,。；;、/\s]*)$/.exec(before);
  if (!match) return { start: 0, text: before };
  return { start: before.length - match[1].length, text: match[1] };
}
