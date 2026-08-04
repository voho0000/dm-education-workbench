/**
 * A/B/C 流程比較。
 *
 * 用法：
 *   node scripts/compare-arms.mjs --patients <目錄或檔案…> [--guideline <指引TXT>] [--json <輸出檔>]
 *
 * 這支腳本只做「不需要呼叫 LLM」的部分：
 *   - 各 arm 的輸入組成、字元數、token 數與相對倍數
 *   - arm C 的事實抽取結果與規則判定
 * 生成品質比較需要實際跑模型，見 scripts/run-arms.mjs。
 *
 * 病人資料與指引全文都由參數指定路徑讀取，不會寫進 repo。
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { formatPatientJson } from "../app/lib/format-patient.ts";
import { extractPatientFacts, factsForSelectorPrompt } from "../app/lib/patient-facts.ts";
import { MODULE_SELECTOR_PROMPT, decisionsForPrompt, resolvePlan } from "../app/lib/module-plan.ts";
import { buildGenerationInput, buildSelectorInput } from "../app/lib/build-input.ts";
import { COLLEAGUE_GENERATOR_PROMPT, WORKBENCH_GENERATOR_PROMPT } from "../app/prompt-presets.ts";
import { guidelineTokens } from "../app/lib/tokens.ts";

function parseArgs(argv) {
  const args = { patients: [], guideline: null, json: null, prompt: "v14" };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--patients") {
      while (argv[index + 1] && !argv[index + 1].startsWith("--")) args.patients.push(argv[++index]);
    } else if (token === "--guideline") args.guideline = argv[++index];
    else if (token === "--json") args.json = argv[++index];
    else if (token === "--prompt") args.prompt = argv[++index];
  }
  return args;
}

async function collectPatientFiles(inputs) {
  const files = [];
  for (const entry of inputs) {
    const stat = await readdir(entry).catch(() => null);
    if (stat) {
      for (const name of stat.filter((item) => item.endsWith(".json")).sort()) {
        files.push(path.join(entry, name));
      }
    } else if (entry.endsWith(".json")) {
      files.push(entry);
    }
  }
  return files;
}

const args = parseArgs(process.argv.slice(2));
if (!args.patients.length) {
  console.error("請以 --patients <目錄或 .json 檔…> 指定病人資料。");
  process.exit(1);
}

const generatorPrompt = args.prompt === "workbench" ? WORKBENCH_GENERATOR_PROMPT : COLLEAGUE_GENERATOR_PROMPT;
const guidelineText = args.guideline ? await readFile(args.guideline, "utf8") : "";
const patientFiles = await collectPatientFiles(args.patients);

if (guidelineText) {
  const count = guidelineTokens(guidelineText);
  console.log(
    `指引全文：${[...guidelineText].length.toLocaleString("zh-TW")} 字元／${count.tokens.toLocaleString("zh-TW")} tokens（${count.method === "measured" ? "官方實測" : "估算"}）\n`,
  );
}

const rows = [];

for (const file of patientFiles) {
  const raw = await readFile(file, "utf8");
  const parsed = JSON.parse(raw);

  const llmText = formatPatientJson(parsed);
  const facts = extractPatientFacts(parsed);
  const factsText = factsForSelectorPrompt(facts);

  const armA = buildGenerationInput({
    systemPrompt: generatorPrompt,
    patientText: llmText,
    includeGuideline: false,
    guidelineText: "",
  });
  const armB = buildGenerationInput({
    systemPrompt: generatorPrompt,
    patientText: llmText,
    includeGuideline: Boolean(guidelineText),
    guidelineText,
  });
  const armC = buildSelectorInput({
    systemPrompt: MODULE_SELECTOR_PROMPT,
    factsText: `${factsText}\n\n${decisionsForPrompt(resolvePlan(null, facts))}`,
  });

  rows.push({
    file: path.basename(file),
    sourceBytes: Buffer.byteLength(raw),
    medicationRecords: facts.medicationRecordCount,
    labRecords: facts.labRecordCount,
    labHasDrawDates: facts.labHasDrawDates,
    diabetesType: facts.diabetesType.verdict,
    positiveComplications: facts.existingComplications.filter((item) => (item.value ?? 0) > 0).map((item) => item.code),
    presentPredictions: facts.riskPredictions.filter((item) => item.present).map((item) => item.code),
    armA: { chars: armA.totalChars, tokens: armA.totalTokens },
    armB: { chars: armB.totalChars, tokens: armB.totalTokens, guidelineIncluded: armB.guidelineIncluded },
    armC: { chars: armC.totalChars, tokens: armC.totalTokens },
  });
}

const pad = (value, width) => String(value).padStart(width);
const padEnd = (value, width) => String(value).padEnd(width);

console.log("【每位病人的輸入規模】");
console.log(
  `${padEnd("病人檔", 14)}${pad("用藥筆數", 10)}${pad("檢驗筆數", 10)}${pad("A tokens", 12)}${pad("B tokens", 12)}${pad("C tokens", 11)}${pad("B/A", 8)}${pad("A/C", 8)}${pad("B/C", 9)}`,
);
for (const row of rows) {
  console.log(
    padEnd(row.file.slice(0, 12), 14) +
      pad(row.medicationRecords, 10) +
      pad(row.labRecords, 10) +
      pad(row.armA.tokens.toLocaleString("en-US"), 12) +
      pad(row.armB.tokens.toLocaleString("en-US"), 12) +
      pad(row.armC.tokens.toLocaleString("en-US"), 11) +
      pad(`${(row.armB.tokens / row.armA.tokens).toFixed(1)}×`, 8) +
      pad(`${(row.armA.tokens / row.armC.tokens).toFixed(1)}×`, 8) +
      pad(`${(row.armB.tokens / row.armC.tokens).toFixed(1)}×`, 9),
  );
}

const sum = (pick) => rows.reduce((total, row) => total + pick(row), 0);
const totalA = sum((row) => row.armA.tokens);
const totalB = sum((row) => row.armB.tokens);
const totalC = sum((row) => row.armC.tokens);

console.log(
  `\n${padEnd("合計", 14)}${pad("", 20)}${pad(totalA.toLocaleString("en-US"), 12)}${pad(totalB.toLocaleString("en-US"), 12)}${pad(totalC.toLocaleString("en-US"), 11)}${pad(`${(totalB / totalA).toFixed(1)}×`, 8)}${pad(`${(totalA / totalC).toFixed(1)}×`, 8)}${pad(`${(totalB / totalC).toFixed(1)}×`, 9)}`,
);

console.log("\n【arm C 的確定性抽取結果】");
for (const row of rows) {
  console.log(
    `${padEnd(row.file.slice(0, 12), 14)}類型：${padEnd(row.diabetesType, 18)}已發生：${padEnd(row.positiveComplications.join(",") || "無", 16)}預測：${padEnd(row.presentPredictions.join(",") || "無", 20)}檢驗有採檢日：${row.labHasDrawDates ? "有" : "沒有"}`,
  );
}

if (args.json) {
  await writeFile(args.json, `${JSON.stringify({ rows, totals: { totalA, totalB, totalC } }, null, 2)}\n`, "utf8");
  console.log(`\n已寫出：${args.json}`);
}
