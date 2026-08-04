/**
 * 比較兩種檢驗判定方式，同一批病人：
 *
 *   D（程式）：解析值與來源參考範圍 → 算出超出範圍清單 → LLM 只做分組
 *   L（純 LLM）：把檢驗原文整段交給 LLM → 由它判斷哪些異常
 *
 * 用法：
 *   node scripts/lab-arm-compare.mjs --patients <目錄> --out <目錄> --mode prepare
 *   （跑完 LLM，把輸出放到 <目錄>/<id>/L.output.json 後）
 *   node scripts/lab-arm-compare.mjs --patients <目錄> --out <目錄> --mode compare
 *
 * 比的是三件事：找到的異常項目是否一致、LLM 是否引用了資料中不存在的數字、
 * 以及輸入成本。
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { formatPatientJson } from "../app/lib/format-patient.ts";
import { extractPatientFacts } from "../app/lib/patient-facts.ts";
import { parseNumericValue, scanReferenceRanges } from "../app/lib/lab-reference.ts";
import { estimateTokens } from "../app/lib/tokens.ts";

export const PURE_LLM_LAB_PROMPT = `你是協助整理檢驗報告的助手，讀者是忙碌的醫師。

輸入是一位糖尿病人的健保申報檢驗紀錄原文，每一筆包含項目名稱、數值、單位與來源提供的參考值。

請判斷哪些項目的數值超出其參考範圍，並依生理系統分組。

限制：
- 只能使用輸入中實際出現的項目名稱與數值，不得引入輸入以外的任何項目或數字。
- 不得推測診斷，不得提出處置建議。
- 這些紀錄只有費用年月、沒有採檢日期，不得敘述趨勢、先後順序或「最近一次」。
- 糖尿病人的血糖與糖化血色素應以糖尿病控制目標判讀，不可直接套用健康人的參考範圍。

輸出格式：只輸出一個 JSON 物件，不要加說明文字或程式碼圍籬。

{
  "abnormal": [
    { "item": "項目名稱", "worst": "最偏離的數值", "reference": "參考範圍原文", "direction": "high|low|both" }
  ],
  "groups": [
    { "system": "系統名稱", "items": ["項目名稱"], "pattern": "一句話描述整體型態" }
  ]
}`;

function parseArgs(argv) {
  const args = { patients: null, out: null, mode: "prepare" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--patients") args.patients = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
    else if (argv[i] === "--mode") args.mode = argv[++i];
  }
  return args;
}

/** 取出病人資料中的檢驗段落，也就是純 LLM 方案必須讀完的東西。 */
function labSection(llmText) {
  const start = llmText.indexOf("【檢驗與檢查紀錄】");
  if (start === -1) return "";
  const end = llmText.indexOf("【其他來源的非空紀錄】", start);
  return llmText.slice(start, end === -1 ? undefined : end);
}

const args = parseArgs(process.argv.slice(2));
if (!args.patients || !args.out) {
  console.error("用法：--patients <目錄> --out <目錄> [--mode prepare|compare]");
  process.exit(1);
}

const names = (await readdir(args.patients)).filter((n) => n.endsWith(".json")).sort();
const rows = [];

for (const name of names) {
  const id = name.replace(/\.json$/, "").slice(0, 12);
  const raw = JSON.parse(await readFile(path.join(args.patients, name), "utf8"));
  const facts = extractPatientFacts(raw);
  const scan = scanReferenceRanges(facts);
  const labText = labSection(formatPatientJson(raw));
  const dir = path.join(args.out, id);
  await mkdir(dir, { recursive: true });

  if (args.mode === "prepare") {
    await writeFile(path.join(dir, "L.input.txt"), `${PURE_LLM_LAB_PROMPT}\n\n---\n\n${labText}`, "utf8");
    rows.push({ id, labRecords: facts.labRecordCount, pureTokens: estimateTokens(labText), items: scan.findings.length });
    continue;
  }

  // compare：把 LLM 的判定和程式的判定放在一起看
  const llmRaw = await readFile(path.join(dir, "L.output.json"), "utf8").catch(() => null);
  if (!llmRaw) {
    rows.push({ id, missing: true });
    continue;
  }
  const parsed = JSON.parse(llmRaw.replace(/```(?:json)?|```/g, "").trim());
  const llmItems = new Set((parsed.abnormal ?? []).map((x) => String(x.item).trim()));
  const codeItems = new Set(scan.findings.map((f) => f.itemName));

  // LLM 提到的數值是否真的在原始資料裡
  const sourceNumbers = new Set();
  for (const item of facts.labItems) {
    for (const value of item.rawValues) {
      const n = parseNumericValue(value);
      if (n !== null) sourceNumbers.add(String(n));
    }
  }
  const invented = (parsed.abnormal ?? [])
    .map((x) => String(x.worst ?? "").trim())
    .map((v) => ({ raw: v, n: parseNumericValue(v) }))
    .filter((v) => v.n !== null && !sourceNumbers.has(String(v.n)))
    .map((v) => v.raw);

  rows.push({
    id,
    labRecords: facts.labRecordCount,
    codeItems: codeItems.size,
    llmItems: llmItems.size,
    both: [...codeItems].filter((x) => llmItems.has(x)).length,
    onlyCode: [...codeItems].filter((x) => !llmItems.has(x)).length,
    onlyLlm: [...llmItems].filter((x) => !codeItems.has(x)).length,
    invented: invented.length,
    inventedExamples: invented.slice(0, 3),
  });
}

const pad = (v, w) => String(v).padStart(w);
const padEnd = (v, w) => String(v).padEnd(w);

if (args.mode === "prepare") {
  console.log(`${padEnd("病人", 14)}${pad("檢驗筆數", 10)}${pad("純LLM輸入tokens", 18)}${pad("程式找到項目", 14)}`);
  for (const r of rows) console.log(padEnd(r.id, 14) + pad(r.labRecords, 10) + pad(r.pureTokens.toLocaleString("en-US"), 18) + pad(r.items, 14));
  const total = rows.reduce((s, r) => s + r.pureTokens, 0);
  console.log(`\n五位合計 ${total.toLocaleString("en-US")} tokens；推 3000 位約 ${Math.round((total / 5) * 3000 / 1e6)}M tokens`);
  console.log(`輸入檔：${args.out}/<id>/L.input.txt`);
} else {
  console.log(
    `${padEnd("病人", 14)}${pad("檢驗筆數", 10)}${pad("程式", 6)}${pad("LLM", 6)}${pad("兩者都有", 10)}${pad("只有程式", 10)}${pad("只有LLM", 9)}${pad("查無此數", 10)}`,
  );
  for (const r of rows) {
    if (r.missing) {
      console.log(padEnd(r.id, 14) + "  （沒有 L.output.json）");
      continue;
    }
    console.log(
      padEnd(r.id, 14) + pad(r.labRecords, 10) + pad(r.codeItems, 6) + pad(r.llmItems, 6) +
        pad(r.both, 10) + pad(r.onlyCode, 10) + pad(r.onlyLlm, 9) + pad(r.invented, 10),
    );
    if (r.inventedExamples.length) console.log(`${" ".repeat(14)}  查無此數的例子：${r.inventedExamples.join("、")}`);
  }
}
