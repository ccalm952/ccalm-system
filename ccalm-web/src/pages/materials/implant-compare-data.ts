/** 种植体对比页的静态文案。改内容只改这个文件。 */

export const implantCompareCopy = {
  title: "种植体怎么选：七款常见植体对比",
  subtitle: "给患者的简明版：七款常见种植体的特点、愈合时间和适合人群。",
  termsTitle: "先懂三个词",
  tableTitle: "对比一览",
  tableNote:
    "愈合期为健康人群一般参考（厂家资料），上颌通常比下颌久；星级为综合参考。",
  cornerLabel: "项目",
  picksTitle: "按情况怎么选",
  faqTitle: "常见问题",
  disclaimerTitle: "重要提示",
  disclaimer: "具体用哪款、多久能戴牙，由医生结合口腔检查和 CBCT 决定。",
} as const;

export type ImplantComparePair = {
  label: string;
  value: string;
};

export const implantCompareTerms: ImplantComparePair[] = [
  { label: "钛锆合金", value: "比纯钛更结实，骨头窄时能用细植体。" },
  { label: "亲水表面", value: "帮助骨头更快长上来。" },
  { label: "即刻种植", value: "拔牙当天就种上植体。" },
];

export const implantComparePicks: ImplantComparePair[] = [
  {
    label: "预算优先、情况常规",
    value: "奥齿泰 TSIII、安卓健 REG、士卓曼纯钛",
  },
  { label: "拔牙当天就想种", value: "士卓曼 BLX、安卓健 PX" },
  { label: "想尽快戴牙", value: "士卓曼 BLX、瑞锆；预算有限看奥齿泰 CA" },
  { label: "骨头窄、想少植骨", value: "悦锆、瑞锆、BLX" },
  {
    label: "糖尿病、吸烟、骨质疏松",
    value: "瑞锆、BLX；预算有限看奥齿泰 CA",
  },
];

export const implantCompareFaq: ImplantComparePair[] = [
  {
    label: "种植牙能用多久？",
    value: "主流品牌 10 年成功率普遍在 95% 以上，关键在于日常清洁和定期复查。",
  },
  {
    label: "哪个植体最好？",
    value: "没有“最好”，只有最适合你的骨头条件、缺牙位置和预算的。",
  },
  {
    label: "贵的就一定好吗？",
    value: "贵的多在愈合速度和复杂情况上有优势；情况常规时，经济款同样可靠。",
  },
];

export const implantTiers = ["经济", "中端", "高端", "旗舰"] as const;

export type ImplantTier = (typeof implantTiers)[number];

export type ImplantCompare = {
  name: string;
  tier: ImplantTier;
  brand: string;
  shape: string;
  material: string;
  surface: string;
  healing: string;
  healingSpeed: string;
  immediate: string;
  narrowBone: string;
  diabetesSmoking: string;
  feature: string;
  suitableFor: string;
};

export type ImplantCompareField = Exclude<
  keyof ImplantCompare,
  "name" | "tier"
>;

export type ImplantCompareRow = {
  label: string;
  key: ImplantCompareField;
  /** 星级行：按换行拆开，整行按星级展示 */
  stars?: boolean;
};

export const implantCompareRows: ImplantCompareRow[] = [
  { label: "品牌", key: "brand" },
  { label: "外形", key: "shape" },
  { label: "材质", key: "material" },
  { label: "表面", key: "surface" },
  { label: "愈合期", key: "healing" },
  { label: "愈合速度", key: "healingSpeed", stars: true },
  { label: "即刻种植", key: "immediate", stars: true },
  { label: "骨头窄", key: "narrowBone", stars: true },
  { label: "糖尿病/吸烟", key: "diabetesSmoking", stars: true },
  { label: "一句话特点", key: "feature" },
  { label: "适合谁", key: "suitableFor" },
];

const S3 = "★★★☆☆";
const S4 = "★★★★☆";
const S5 = "★★★★★";

export const implantCompareImplants: ImplantCompare[] = [
  {
    name: "奥齿泰 TSIII",
    tier: "经济",
    brand: "韩国 Osstem",
    shape: "微锥形，螺纹锋利",
    material: "纯钛",
    surface: "SA 普通\nCA 亲水",
    healing: "SA 6–8 周\nCA 4–6 周",
    healingSpeed: `SA ${S3}\nCA ${S4}`,
    immediate: S4,
    narrowBone: S3,
    diabetesSmoking: `SA ${S3}\nCA ${S4}`,
    feature: "韩国大品牌，性价比高，偏软骨头里也容易拧稳。",
    suitableFor: "预算有限、情况常规；想快一点可选 CA 版。",
  },
  {
    name: "安卓健 REG",
    tier: "经济",
    brand: "法国 Anthogyr\n士卓曼集团",
    shape: "柱锥形、细螺纹",
    material: "钛合金",
    surface: "BCP 喷砂",
    healing: "医生评估\n常见 8–16 周",
    healingSpeed: S3,
    immediate: S3,
    narrowBone: S4,
    diabetesSmoking: S3,
    feature: "欧洲品牌的“万能常规款”，软硬骨都能用，有短款。",
    suitableFor: "想要欧洲品牌、又看重价格的常规病例。",
  },
  {
    name: "安卓健 PX",
    tier: "经济",
    brand: "法国 Anthogyr\n士卓曼集团",
    shape: "锥形、大螺纹",
    material: "钛合金",
    surface: "BCP 喷砂",
    healing: "医生评估\n常见 8–16 周",
    healingSpeed: S3,
    immediate: S5,
    narrowBone: S4,
    diabetesSmoking: S3,
    feature: "专为拔牙后马上种和松软骨头设计。",
    suitableFor: "拔牙当天想种、预算有限。",
  },
  {
    name: "士卓曼纯钛",
    tier: "中端",
    brand: "瑞士 Straumann\n上海生产",
    shape: "经典柱 / 柱锥形",
    material: "纯钛",
    surface: "SLA 普通",
    healing: "6–8 周",
    healingSpeed: S3,
    immediate: S3,
    narrowBone: S3,
    diabetesSmoking: S3,
    feature: "士卓曼经典款，用了近 30 年，已进集采。",
    suitableFor: "想用士卓曼、身体健康、骨量够。",
  },
  {
    name: "士卓曼 悦锆",
    tier: "高端",
    brand: "瑞士 Straumann\n进口",
    shape: "锥形 / 柱形，有细款",
    material: "钛锆合金",
    surface: "SLA 普通",
    healing: "6–8 周",
    healingSpeed: S3,
    immediate: S3,
    narrowBone: S5,
    diabetesSmoking: S3,
    feature: "更结实，骨头窄时可用细植体、少植骨。",
    suitableFor: "骨头偏窄、咬合力大，但不急着戴牙。",
  },
  {
    name: "士卓曼 瑞锆",
    tier: "高端",
    brand: "瑞士 Straumann\n进口",
    shape: "锥形 / 柱形，有细款",
    material: "钛锆合金",
    surface: "SLActive 亲水",
    healing: "3–4 周",
    healingSpeed: S5,
    immediate: S4,
    narrowBone: S5,
    diabetesSmoking: S5,
    feature: "又结实又长得快。",
    suitableFor: "想快、糖尿病或吸烟等愈合条件差、情况较复杂。",
  },
  {
    name: "士卓曼 BLX",
    tier: "旗舰",
    brand: "瑞士 Straumann\n进口",
    shape: "全锥形、深螺纹",
    material: "钛锆合金",
    surface: "SLActive 亲水",
    healing: "3–4 周",
    healingSpeed: S5,
    immediate: S5,
    narrowBone: S5,
    diabetesSmoking: S5,
    feature: "为拔牙当天种、尽快戴临时牙而设计。",
    suitableFor: "拔牙即刻种植、想尽快戴牙、骨质偏软。",
  },
];
