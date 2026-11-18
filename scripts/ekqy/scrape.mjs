import fs from "node:fs/promises";

const ROOT = "C:/Users/ccalm/Desktop/ccalm-system";
const NAME_FILE = `${ROOT}/scripts/ekqy/.name.txt`;
const OUT_FILE = `${ROOT}/scripts/ekqy/.raw.json`;

const name = (await fs.readFile(NAME_FILE, "utf8")).trim();
if (!name) throw new Error("name file is empty");

const task = await taskSpace("e看牙导入");
const page = (await task.pages())[0];

await page.goto(`https://qzyzkq.linkedcare.cn/ares3/?t=${Date.now()}#/new/patient`, {
  timeout: 60000,
});
await page.waitForSelector("input.searchTerm", { timeout: 30000 });
await page.waitForTimeout(1000);

await page.evaluate(() => {
  window.__ekqy = [];
  window.__patient = null;
  window.__search = null;
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u, ...rest) {
    this.__ekqyUrl = String(u);
    return origOpen.call(this, m, u, ...rest);
  };
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (body) {
    this.addEventListener("load", () => {
      try {
        const u = this.__ekqyUrl || "";
        if (/\/api\/v1\/patients\?/.test(u)) {
          try { window.__search = JSON.parse(this.responseText); } catch {}
        }
        if (u.includes("patient/full/get")) {
          window.__patient = JSON.parse(this.responseText);
        }
        if (
          /medical-record-summary\/get|medical-record\/full\/get|charge-order\/paging/.test(
            u,
          )
        ) {
          window.__ekqy.push({ url: u, body: String(this.responseText) });
        }
      } catch {}
    });
    return origSend.call(this, body);
  };
});

await page.fill("input.searchTerm", name);
await page.keyboard.press("Enter");
await page.waitForTimeout(5000);

const search = await page.evaluate(() => window.__search);
const found = (search?.items ?? []).find((item) => item.name === name) ?? null;
if (!found) throw new Error(`patient not found: ${name}`);
const patientId = found.id;
await page.evaluate((id) => {
  location.hash = `#/patient/info/${id}/record`;
}, patientId);
await page.waitForTimeout(5000);
await page.evaluate(() => {
  const m = location.hash.match(/patient\/info\/(\d+)/);
  return m ? Number(m[1]) : null;
});
if (!patientId) throw new Error("patient id not found in url");

await page.evaluate(() => {
  [...document.querySelectorAll("a,div,span,li")]
    .find((el) => el.textContent.trim() === "电子病历")
    ?.click();
});
await page.waitForTimeout(3500);

await page.evaluate(() => {
  [...document.querySelectorAll("a,div,span,button")]
    .find((el) =>
      el.textContent.includes("展开当前时间段前20条病历详情"),
    )
    ?.click();
});
await page.waitForTimeout(1500);

const expandCount = await page.evaluate(
  () =>
    [...document.querySelectorAll("a,div,span,button")].filter(
      (el) => el.textContent.trim() === "展开详情",
    ).length,
);
for (let i = 0; i < expandCount; i++) {
  await page.evaluate((idx) => {
    const els = [...document.querySelectorAll("a,div,span,button")].filter(
      (el) => el.textContent.trim() === "展开详情",
    );
    els[idx]?.click();
  }, i);
  await page.waitForTimeout(900);
}
await page.waitForTimeout(2000);

await page.evaluate(() => {
  [...document.querySelectorAll("a,div,span,li")]
    .find((el) => el.textContent.trim() === "收费")
    ?.click();
});
await page.waitForTimeout(3500);

const result = await page.evaluate(() => ({
  responses: window.__ekqy || [],
  patient: window.__patient,
}));
const summaries = [];
const fulls = [];
const orders = [];
for (const r of result.responses) {
  try {
    const body = JSON.parse(r.body);
    if (r.url.includes("medical-record-summary/get")) summaries.push(...body);
    else if (r.url.includes("medical-record/full/get")) fulls.push(body);
    else if (r.url.includes("charge-order/paging"))
      orders.push(...(body.items ?? []));
  } catch {}
}

const raw = {
  name,
  patientId,
  patient: result.patient,
  scrapedAt: new Date().toISOString(),
  summaries,
  fulls,
  orders,
};
await fs.writeFile(OUT_FILE, JSON.stringify(raw, null, 2), "utf8");
console.log(
  JSON.stringify(
    {
      name,
      patientId,
      chartNo: result.patient?.privateId,
      summaries: summaries.length,
      fulls: fulls.length,
      orders: orders.length,
      out: OUT_FILE,
    },
    null,
    2,
  ),
);
