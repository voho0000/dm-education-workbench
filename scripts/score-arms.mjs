/**
 * 用確定性驗證器評分各 arm 的實際輸出。
 *
 * 用法：node scripts/score-arms.mjs --run <materialize 的輸出目錄> --patients <病人 JSON 目錄>
 *
 * 只計分「程式可以 100% 判定」的項目。語氣、臨床合理性不在此範圍，
 * 需要人或 LLM 稽核；但那些不該和機械規則混在同一個分數裡。
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { extractPatientFacts } from "../app/lib/patient-facts.ts";
import { assembleClinicianReport, assemblePatientReport, parseModuleSelection, resolvePlan } from "../app/lib/module-plan.ts";
import { validateReport, summarizeValidation } from "../app/lib/validate-report.ts";
import { formatPatientJson } from "../app/lib/format-patient.ts";

function parseArgs(argv) {
  const args = { run: null, patients: null, json: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--run") args.run = argv[++index];
    else if (argv[index] === "--patients") args.patients = argv[++index];
    else if (argv[index] === "--json") args.json = argv[++index];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.run || !args.patients) {
  console.error("用法：--run <輸出目錄> --patients <病人 JSON 目錄>");
  process.exit(1);
}

const patientFiles = (await readdir(args.patients)).filter((name) => name.endsWith(".json")).sort();
const rows = [];

for (const name of patientFiles) {
  const id = name.replace(/\.json$/, "").slice(0, 12);
  const dir = path.join(args.run, id);
  const parsed = JSON.parse(await readFile(path.join(args.patients, name), "utf8"));
  const facts = extractPatientFacts(parsed);
  const patientText = formatPatientJson(parsed);
  const positiveComplications = facts.existingComplications
    .filter((item) => (item.value ?? 0) > 0)
    .map((item) => Number(item.code.slice(1)));

  // 由出生日期與報告日期合法推導的數字，不算捏造。
  const derivedNumbers = [];
  if (facts.ageYears.known) derivedNumbers.push(facts.ageYears.value, facts.ageYears.value + 1);
  if (facts.diabetesDurationYears.known) {
    const years = facts.diabetesDurationYears.value;
    derivedNumbers.push(years, Math.round(years), years.toFixed(1), years.toFixed(2));
  }
  // T 欄位原值常有多位小數，模型合理四捨五入不算捏造。
  const rawT = Number(parsed?.userInput?.T);
  if (Number.isFinite(rawT)) {
    derivedNumbers.push(rawT.toFixed(1), rawT.toFixed(2), Math.round(rawT));
  }

  const row = { id, arms: {} };

  // arm A：LLM 直接寫病人正文
  const armAText = await readFile(path.join(dir, "A.output.txt"), "utf8").catch(() => null);
  if (armAText) {
    row.arms.A = {
      chars: [...armAText].length,
      validation: validateReport({ report: armAText, patientText, profile: "v14", positiveComplications, derivedNumbers }),
    };
  }

  // arm C：LLM 只選模組，程式組裝
  const armCRaw = await readFile(path.join(dir, "C.output.json"), "utf8").catch(() => null);
  if (armCRaw) {
    const selection = parseModuleSelection(armCRaw);
    const plan = resolvePlan(selection, facts);
    const options = {
      reportDate: facts.reportDate.known ? facts.reportDate.value : null,
      dataCutoff: facts.dataCutoff.known ? facts.dataCutoff.value : null,
    };
    const assembled = assemblePatientReport(plan, options);
    await writeFile(path.join(dir, "C.assembled.txt"), assembled, "utf8");
    await writeFile(path.join(dir, "C.clinician.txt"), assembleClinicianReport(plan, facts, options), "utf8");
    row.arms.C = {
      chars: [...assembled].length,
      fullTopics: plan.decisions.filter((d) => d.kind === "established" || d.kind === "prevention-active").map((d) => `R${d.topic}`),
      moderateTopics: plan.moderateTopics.map((d) => `R${d.topic}`),
      excludedTopics: plan.decisions.filter((d) => d.kind === "excluded").map((d) => `R${d.topic}`),
      selfCare: plan.selfCareModuleIds,
      patientModules: plan.patientModuleIds,
      priorities: plan.selection?.priorities.map((p) => p.module_id) ?? [],
      rejectedPriorities: plan.rejectedPriorities,
      disagreements: plan.selection?.disagreements.length ?? 0,
      programTypeVerdict: facts.diabetesType.verdict,
      validation: validateReport({ report: assembled, patientText, profile: "modules", positiveComplications, derivedNumbers }),
    };
  }

  rows.push(row);
}

const pad = (value, width) => String(value).padStart(width);
const padEnd = (value, width) => String(value).padEnd(width);

console.log("【確定性驗證分數】分母只算適用於該 profile 的檢查\n");
console.log(`${padEnd("病人", 14)}${padEnd("arm", 6)}${pad("字數", 8)}${pad("通過", 10)}${pad("分數", 8)}  未通過的檢查`);
for (const row of rows) {
  for (const [armId, result] of Object.entries(row.arms)) {
    const failed = result.validation.results
      .filter((item) => item.applicable && !item.passed)
      .map((item) => item.id);
    console.log(
      padEnd(row.id, 14) +
        padEnd(armId, 6) +
        pad(result.chars.toLocaleString("en-US"), 8) +
        pad(`${result.validation.passedCount}/${result.validation.applicableCount}`, 10) +
        pad(`${Math.round(result.validation.score * 100)}%`, 8) +
        "  " +
        (failed.join(", ") || "—"),
    );
  }
}

console.log("\n【arm C：程式的主題判定與模組組合】");
console.log(`${padEnd("病人", 14)}${pad("完整主題", 10)}${pad("簡短提醒", 10)}${pad("不納入", 8)}${pad("自照護", 8)}${pad("字數", 8)}  完整主題明細`);
for (const row of rows) {
  if (!row.arms.C) continue;
  const c = row.arms.C;
  console.log(
    padEnd(row.id, 14) +
      pad(c.fullTopics.length, 10) +
      pad(c.moderateTopics.length, 10) +
      pad(c.excludedTopics.length, 8) +
      pad(c.selfCare.length, 8) +
      pad(c.chars.toLocaleString("en-US"), 8) +
      "  " + (c.fullTopics.join(",") || "—"),
  );
}
console.log("\n【arm C：LLM 的附加價值】");
for (const row of rows) {
  if (!row.arms.C) continue;
  const c = row.arms.C;
  console.log(`${padEnd(row.id, 14)}優先項：${c.priorities.join(",") || "—"}｜被忽略：${c.rejectedPriorities.join(",") || "無"}｜不同意見：${c.disagreements}`);
}

console.log("\n【arm A 未通過項目的細節】");
for (const row of rows) {
  if (!row.arms.A) continue;
  const failed = row.arms.A.validation.results.filter((item) => item.applicable && !item.passed);
  if (!failed.length) continue;
  console.log(`\n${row.id}`);
  console.log(summarizeValidation(row.arms.A.validation).split("\n").filter((line) => line.startsWith("✗") || line.startsWith("    ")).join("\n"));
}

if (args.json) {
  await writeFile(args.json, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
}
