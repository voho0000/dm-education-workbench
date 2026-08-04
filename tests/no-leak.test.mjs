import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));

function trackedFiles() {
  return execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function walk(dir) {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else found.push(full);
  }
  return found;
}

async function readTextFiles(files) {
  const contents = [];
  for (const file of files) {
    const info = await stat(file).catch(() => null);
    if (!info || !info.isFile() || info.size > 8 * 1024 * 1024) continue;
    if (/\.(png|jpg|jpeg|gif|webp|woff2?|ico|zip|pdf)$/i.test(file)) continue;
    contents.push({ file, text: await readFile(file, "utf8").catch(() => "") });
  }
  return contents;
}

test("git 追蹤的檔案不含 Gemini API 金鑰樣式", async () => {
  const files = trackedFiles()
    .filter((name) => !name.startsWith("node_modules/"))
    .map((name) => path.join(repoRoot, name));
  const contents = await readTextFiles(files);

  const offenders = contents
    .filter(({ text }) => /AIza[0-9A-Za-z_-]{20,}/.test(text))
    .map(({ file }) => path.relative(repoRoot, file));
  assert.deepEqual(offenders, [], "這些被追蹤的檔案疑似含有 Gemini API 金鑰");
});

test("git 追蹤的檔案不含指引全文", async (t) => {
  const guidelinePath = process.env.DM_GUIDELINE_TXT;
  if (!guidelinePath) {
    t.skip("未設定 DM_GUIDELINE_TXT，略過。設定後才能用實際指引內容比對。");
    return;
  }

  // 從指引正文中段取出數段特徵字串，在執行時才產生，不寫進 repo。
  const guideline = await readFile(guidelinePath, "utf8");
  const candidates = guideline
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 28 && line.length < 70 && /[一-鿿]{12,}/.test(line));
  assert.ok(candidates.length > 100, "指引檔看起來不完整，無法取出特徵字串");
  const markers = [50, 400, 900, 1200].map((index) => candidates[index]).filter(Boolean);

  const files = trackedFiles()
    .filter((name) => !name.startsWith("node_modules/"))
    .map((name) => path.join(repoRoot, name));
  const contents = await readTextFiles(files);

  for (const marker of markers) {
    const offenders = contents
      .filter(({ text }) => text.includes(marker))
      .map(({ file }) => path.relative(repoRoot, file));
    assert.deepEqual(offenders, [], `這些被追蹤的檔案含有指引正文片段：${marker.slice(0, 16)}…`);
  }
});

test("建置產物不含指引全文、金鑰或開發用模擬分支", async (t) => {
  const distDir = path.join(repoRoot, "dist");
  const files = await walk(distDir);
  if (!files.length) {
    t.skip("尚未建置，略過。請先執行 npm run build。");
    return;
  }
  const contents = await readTextFiles(files);
  assert.ok(contents.length > 0, "dist 中沒有可檢查的文字檔");

  const withKeys = contents
    .filter(({ text }) => /AIza[0-9A-Za-z_-]{20,}/.test(text))
    .map(({ file }) => path.relative(repoRoot, file));
  assert.deepEqual(withKeys, [], "建置產物疑似含有 Gemini API 金鑰");

  const withSimulate = contents
    .filter(({ text }) => text.includes("x-dm-simulate"))
    .map(({ file }) => path.relative(repoRoot, file));
  assert.deepEqual(withSimulate, [], "正式建置不應包含開發用的失敗模擬分支");

  const guidelinePath = process.env.DM_GUIDELINE_TXT;
  if (guidelinePath) {
    const guideline = await readFile(guidelinePath, "utf8");
    const candidates = guideline
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 28 && line.length < 70 && /[一-鿿]{12,}/.test(line));
    const markers = [50, 400, 900].map((index) => candidates[index]).filter(Boolean);
    for (const marker of markers) {
      const offenders = contents
        .filter(({ text }) => text.includes(marker))
        .map(({ file }) => path.relative(repoRoot, file));
      assert.deepEqual(offenders, [], "建置產物含有指引正文片段");
    }
  }
});

test("原始碼不會截斷指引或病人資料", async () => {
  const buildInput = await readFile(new URL("../app/lib/build-input.ts", import.meta.url), "utf8");
  assert.doesNotMatch(buildInput, /guidelineText\s*\.\s*(slice|substring|substr)/, "組裝輸入時不得截斷指引");
  assert.doesNotMatch(buildInput, /patientText\s*\.\s*(slice|substring|substr)/, "組裝輸入時不得截斷病人資料");
});

test("git 追蹤的檔案不含病人識別碼或真實生日", async () => {
  // 這個 repo 是私有的，但病人資料一律不進版本控制——包含測試資料、
  // LLM 整理後的內容、以及產生好的報告。
  const files = execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" }).trim().split("\n");
  // 來源匯出的 userId 形態：22 字元以上的 base64 樣式，後接底線與西元生日
  const idPattern = /[A-Za-z0-9_+/-]{20,}_(19|20)\d{2}-\d{2}-\d{2}/;
  const offenders = [];
  for (const file of files) {
    if (file === "package-lock.json") continue; // npm integrity hash 會誤判
    let text;
    try {
      text = await readFile(path.join(repoRoot, file), "utf8");
    } catch {
      continue;
    }
    if (idPattern.test(text)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `這些檔案含疑似病人識別碼：${offenders.join(", ")}`);
});

test("git 追蹤的檔案不含病人資料衍生的產出", async () => {
  const files = execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" }).trim().split("\n");
  const banned = /衛教報告|醫師版報告|LLM好讀版|確定性事實摘要|lab\.output|C\.output/;
  const offenders = files.filter((file) => banned.test(file));
  assert.deepEqual(offenders, [], `產出檔不該被追蹤：${offenders.join(", ")}`);
});
