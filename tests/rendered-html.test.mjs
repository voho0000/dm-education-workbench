/**
 * 對伺服器實際輸出的 HTML 做斷言。
 *
 * 為什麼不是對原始碼做 regex：先前那樣寫，任何搬移函式都會弄壞測試，
 * 而真正該保證的是「使用者打開頁面看得到什麼」。
 */

import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("首頁伺服器渲染完整，並保證資料不落地", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-Hant">/i);
  assert.match(html, /病人資料/);
  assert.match(html, /產出兩份報告/);
  assert.match(html, /gemini-3\.6-flash/);
  assert.match(html, /gemini-3\.5-flash-lite/);
  assert.match(html, /不寫入本站資料庫/);
  assert.match(html, /只暫存在本頁記憶體，不寫入資料庫或瀏覽器儲存空間/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("首頁畫出實際的資料流：程式判定為主，三次 LLM 呼叫", async () => {
  const html = await (await render()).text();

  assert.match(html, /資料流：程式判定為主，三次 LLM 呼叫只負責規則做不到的事/);
  assert.match(html, /① 資料稽核/);
  assert.match(html, /② 檢驗判讀/);
  assert.match(html, /③ 檢驗敘述/);
  assert.match(html, /病人版衛教報告/);
  assert.match(html, /醫師版報告/);

  // 管線每一站都要看得到，包含餵進去什麼、程式採用了什麼
  assert.match(html, /管線的每一站/);
  assert.match(html, /system prompt 由程式定義並隨版本一起送審，不在頁面上編輯/);
  assert.match(html, /讀取申報 JSON/);
  assert.match(html, /確定性判定/);
  assert.match(html, /驗證與組裝/);
  assert.match(html, /原始回應（未解析）/);

  // 每一站都要有材料、食譜、成品三段；食譜是真的程式碼，不是另抄一份說明
  assert.match(html, /材料/);
  assert.match(html, /食譜/);
  assert.match(html, /成品/);
  assert.match(html, /assemblePatientReport\(\)/);
  assert.match(html, /parseLabNarrative\(\)/);
  // 切不到的符號會留下這個字樣，代表函式改名而食譜沒跟上
  assert.doesNotMatch(html, /可能已改名/);

  // 每一站上方要有小流程圖標出「你在這裡」，而且和頁首那張共用同一份座標
  assert.match(html, /資料流位置：目前在「健保申報 JSON、LLM 好讀文字、濾掉無關檢驗」/);
  assert.match(html, /資料流位置：目前在「驗證與組裝、固定衛教模組、病人版衛教報告、醫師版報告」/);
});

test("三份固定內容攤在頁面上，逐條看得到，且標明未核准", async () => {
  const html = await (await render()).text();

  assert.match(html, /報告會用到的固定內容/);
  assert.match(html, /衛教模組 draft-0\.3/);
  assert.match(html, /自我照護模組 draft-0\.2/);
  assert.match(html, /指引門檻表 2022-guideline-extract-0\.7/);
  assert.match(html, /DRAFT・未經醫療團隊核准/);

  // 不是只列標題——正文要真的在頁面上，才能拿去逐條審。
  // 分頁只渲染當前那一頁，所以這裡只能驗預設頁（衛教模組）的正文；
  // 另兩頁的內容由 lib.test.mjs 的資料測試把關。
  assert.match(html, /關於這份報告/);
  assert.match(html, /每天查看腳背、腳底、腳趾縫與腳跟/);

  // 門檻表要標明來源，才知道是依哪一份指引
  assert.match(html, /中華民國糖尿病學會/);
});

test("A/B/C 比較與指引全文載入已從流程移除", async () => {
  const html = await (await render()).text();

  // 指引全文標示未授權不得轉載；流程改用抽取後的門檻表，頁面不再接受整份上傳
  assert.doesNotMatch(html, /GUIDELINE A\/B\/C TEST/);
  assert.doesNotMatch(html, /帶入指引全文/);
  assert.doesNotMatch(html, /載入指引 TXT/);
  assert.doesNotMatch(html, /獨立品質稽核/);
});

test("沒有病人資料時直接說明原因與解法，不是只把按鈕變灰", async () => {
  const html = await (await render()).text();

  assert.match(html, /目前不能執行的原因/);
  assert.match(html, /還沒有病人資料。/);
  assert.match(html, /載入合成示範資料/);

  // 送出前要看得到三次呼叫合計的輸入量
  assert.match(html, /三次呼叫合計送出/);
  assert.match(html, /模型上限的/);
  assert.match(html, /不會自動截斷病人資料/);
});

test("示範資料是合成的，公開產物不得出現真實病人", async () => {
  const html = await (await render()).text();
  assert.match(html, /示範資料為虛構，非真實病人/);

  // 示範資料是點擊後才填入的，只存在於 JS bundle——而 bundle 正是會被公開的東西。
  const dir = new URL("../github-pages/dm-education-workbench/assets/", import.meta.url);
  const files = await readdir(dir);
  const bundles = await Promise.all(
    files.filter((name) => name.endsWith(".js")).map((name) => readFile(new URL(name, dir), "utf8")),
  );
  const all = bundles.join("\n");

  assert.match(all, /SAMPLE-DEMO-NOT-A-REAL-PATIENT/, "示範資料必須明確標示為合成");
  // 來源匯出的識別碼形態：長 base64 後接西元生日
  assert.doesNotMatch(all, /[A-Za-z0-9_+/-]{20,}_(19|20)\d{2}-\d{2}-\d{2}/, "公開 bundle 不得含病人識別碼");
});

test("頁尾有建置識別碼，可判斷是不是舊快取", async () => {
  const html = await (await render()).text();
  assert.match(html, /build \d{14}/, "頁尾必須有可辨識的建置識別碼");
});

test("金鑰處理與不截斷的保證維持不變", async () => {
  const [route, buildInput, geminiClient, packageJson, envExample] = await Promise.all([
    readFile(new URL("../app/api/gemini/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/build-input.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/gemini-client.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);

  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  assert.match(buildInput, /絕不截斷/);
  assert.match(geminiClient, /"x-goog-api-key": apiKey\.trim\(\)/);
  assert.match(geminiClient, /AbortSignal\.any/);
  assert.match(geminiClient, /export async function safeJson/);

  assert.match(route, /process\.env\.GEMINI_API_KEY/);
  assert.match(route, /suppliedApiKey \|\| process\.env\.GEMINI_API_KEY/);
  assert.doesNotMatch(envExample, /AIza[A-Za-z0-9_-]{10,}/);
});
