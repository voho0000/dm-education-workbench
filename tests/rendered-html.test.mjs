import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
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

test("server-renders the complete diabetes education workbench", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-Hant">/i);
  assert.match(html, /<title>糖尿病衛教報告工作台<\/title>/i);
  assert.match(html, /病人資料整理/);
  assert.match(html, /生成糖尿病衛教報告/);
  assert.match(html, /獨立品質稽核/);
  assert.match(html, /gemini-3\.6-flash/);
  assert.match(html, /gemini-3\.5-flash-lite/);
  assert.match(html, /健康存摺安全版（目前預設）/);
  assert.match(html, /v14/);
  assert.match(html, /八面向安全稽核版（目前預設）/);
  assert.match(html, /audit/);
  assert.match(html, /自訂內容（目前文字）/);
  assert.match(html, /Gemini 臨時存取金鑰/);
  assert.match(html, /type="password"/);
  assert.match(html, /重新整理即清除/);
  assert.match(html, /id="dmEducationGeminiTransientCredential2026"/);
  assert.match(html, /name="dmEducationGeminiTransientCredentialManualEntry"/);
  assert.match(html, /autoComplete="new-password"/i);
  assert.match(html, /data-1p-ignore="true"/);
  assert.match(html, /不寫入本站資料庫/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("renders the three-arm selector and the guideline status panel", async () => {
  const html = await (await render()).text();

  assert.match(html, /GUIDELINE A\/B\/C TEST/);
  assert.match(html, /A｜現行流程・不帶入指引/);
  assert.match(html, /B｜現行流程・帶入指引全文/);
  assert.match(html, /C｜模組選擇流程/);

  // 選 B 時使用者必須看得到這五件事，不能只有一句「已載入」。
  assert.match(html, /指引是否已載入/);
  assert.match(html, /指引字元數/);
  assert.match(html, /指引 token 數/);
  assert.match(html, /本次生成會帶入指引/);
  assert.match(html, /本次稽核會帶入指引/);
  assert.match(html, /用 countTokens 精算/);
  assert.match(html, /不會自動截斷指引或病人資料/);
});

test("shows why generation is blocked instead of only greying the button", async () => {
  const html = await (await render()).text();

  // 初次載入沒有病人資料，按鈕旁必須直接列出原因與解法。
  assert.match(html, /目前不能生成的原因/);
  assert.match(html, /目前不能稽核的原因/);
  assert.match(html, /還沒有病人資料。/);
  assert.match(html, /整理為 LLM 好讀文字/);

  // 送出前的輸入組成與估計 token。
  assert.match(html, /本次生成會送出的輸入/);
  assert.match(html, /本次稽核會送出的輸入/);
  assert.match(html, /模型上限的/);
});

test("stamps a build id so a stale cached page can be identified", async () => {
  const html = await (await render()).text();
  assert.match(html, /build \d{14}/, "頁尾必須有可辨識的建置識別碼");
});

test("keeps prompts, credentials and truncation guarantees intact", async () => {
  const [prompts, route, buildInput, geminiClient, packageJson, envExample] = await Promise.all([
    readFile(new URL("../app/prompt-presets.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/gemini/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/build-input.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/gemini-client.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);

  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  // 四段 prompt 內容維持不變。
  assert.match(prompts, /COLLEAGUE_GENERATOR_PROMPT/);
  assert.match(prompts, /COLLEAGUE_EVAL_PROMPT/);
  assert.match(prompts, /WORKBENCH_GENERATOR_PROMPT/);
  assert.match(prompts, /WORKBENCH_EVAL_PROMPT/);
  assert.match(prompts, /"audit_status": "PASS \| REVISE \| FAIL"/);

  assert.match(buildInput, /【參考指引全文：2022第2型糖尿病臨床照護指引】/);
  assert.match(geminiClient, /"x-goog-api-key": apiKey\.trim\(\)/);
  assert.match(geminiClient, /AbortSignal\.any/);
  assert.match(geminiClient, /export async function safeJson/);

  assert.match(route, /process\.env\.GEMINI_API_KEY/);
  assert.match(route, /suppliedApiKey \|\| process\.env\.GEMINI_API_KEY/);
  assert.match(route, /"x-goog-api-key": apiKey/);
  assert.match(route, /store: false/);
  assert.match(route, /Cache-Control/);
  // 回應一律先取文字再解析，避免代理層回 HTML 時丟出 Unexpected token。
  assert.match(route, /await response\.text\(\)/);
  assert.doesNotMatch(route, /await response\.json\(\)/);

  assert.match(envExample, /^GEMINI_API_KEY=$/m);
});
