/** 种植体对比页的静态文案。改内容只改这个文件。 */

export const implantCompareCopy = {
  cornerLabel: "品牌",
  materialNote:
    "结实程度：纯钛 ＜ 钛合金 ＜ 钛锆合金。更适合骨头窄，牙间隙小的人。",
  surfaceNote:
    "愈合速度：普通表面 ＜ 亲水表面。更适合想尽快戴牙，拔牙后即刻种植，骨质差，以及糖尿病，吸烟等愈合条件差的人。",
} as const;

export type ImplantCatalog = {
  label: string;
  url: string;
};

export type ImplantCompare = {
  name: string;
  material: string;
  surface: string;
  healing: string;
  catalogs?: ImplantCatalog[];
};

export type ImplantCompareGroup = {
  name: string;
  catalogs: ImplantCatalog[];
  implants: ImplantCompare[];
};

export type ImplantCompareColumn = ImplantCompare | ImplantCompareGroup;

export type ImplantCompareField = Exclude<
  keyof ImplantCompare,
  "name" | "catalogs"
>;

export type ImplantCompareRow = {
  label: string;
  key: ImplantCompareField;
};

const straumannCatalogBase =
  "https://www.straumann.cn/content/dam/sites/straumann/cn/download/%E5%A3%AB%E5%8D%93%E6%9B%BC-bl-tl%E9%AA%A8%E6%B0%B4%E5%B9%B3%E5%8F%8A%E8%BD%AF%E7%BB%84%E7%BB%87%E6%B0%B4%E5%B9%B3%E7%A7%8D%E6%A4%8D%E4%BD%93/%E4%BA%A7%E5%93%81%E7%9B%AE%E5%BD%95/";

const osstemCatalogs: ImplantCatalog[] = [
  {
    label: "产品目录",
    url: "https://osstem.eu/wp-content/uploads/2025/08/2025-08-01_Product-Catalog_Europe-2025-26_v1.1_Web.pdf",
  },
];

export const implantCompareConsultationCalendar: ImplantCatalog = {
  label: "咨询台历",
  url: "https://www.straumann.cn/content/dam/sites/straumann/cn/download/%E6%82%A3%E8%80%85%E6%B2%9F%E9%80%9A/%E5%8F%A3%E8%85%94%E7%A7%8D%E6%A4%8D%E7%A7%91%E6%99%AE/2026-Consultation-Calendar-Planting-Science-Popularization-and-Straumann-Brand-and-Product-Introduction.pdf",
};

export const implantCompareRows: ImplantCompareRow[] = [
  { label: "材质", key: "material" },
  { label: "表面", key: "surface" },
  { label: "愈合期", key: "healing" },
];

export const implantCompareColumns: ImplantCompareColumn[] = [
  {
    name: "韩国 奥齿泰 SA",
    material: "纯钛",
    surface: "SA 普通",
    healing: "6–8 周",
    catalogs: osstemCatalogs,
  },
  {
    name: "韩国 奥齿泰 CA",
    material: "纯钛",
    surface: "CA 亲水",
    healing: "4–6 周",
    catalogs: osstemCatalogs,
  },
  {
    name: "法国 安卓健 Axiom",
    material: "钛合金",
    surface: "BCP 喷砂",
    healing: "6–8 周",
    catalogs: [
      {
        label: "产品目录",
        url: "https://www.straumann.com/content/dam/media-center/anthogyr/en/documents/catalog/EN_C199_Product-catalog-Axiom_LR.pdf",
      },
    ],
  },
  {
    name: "瑞士 士卓曼 BL/TL",
    catalogs: [
      { label: "外科", url: `${straumannCatalogBase}who-is-who-452.751.pdf` },
      {
        label: "骨水平修复",
        url: `${straumannCatalogBase}who-is-who-HIGH.pdf`,
      },
      {
        label: "软组织水平修复",
        url: `${straumannCatalogBase}who-is-who.pdf`,
      },
    ],
    implants: [
      {
        name: "纯钛",
        material: "纯钛",
        surface: "SLA 普通",
        healing: "6–8 周",
      },
      {
        name: "悦锆",
        material: "钛锆合金",
        surface: "SLA 普通",
        healing: "6–8 周",
      },
      {
        name: "瑞锆",
        material: "钛锆合金",
        surface: "SLActive 亲水",
        healing: "3–4 周",
      },
    ],
  },
  {
    name: "瑞士 士卓曼 BLX",
    material: "钛锆合金",
    surface: "SLActive 亲水",
    healing: "3–4 周",
    catalogs: [
      {
        label: "产品目录",
        url: "https://www.straumann.com/content/dam/media-center/straumann/en/documents/brochure/technical-information/450.036-en_low.pdf",
      },
    ],
  },
];
