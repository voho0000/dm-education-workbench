/**
 * 把各 arm 的實際輸入寫成檔案，供實跑比較使用。
 *
 * 用法：
 *   node scripts/materialize-arm-inputs.mjs --patients <目錄> --out <輸出目錄> [--guideline <TXT>]
 *
 * 輸出目錄請指向 repo 以外的暫存位置：這些檔案含病人資料與（選用的）指引全文，
 * 不得提交。
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { formatPatientJson } from "../app/lib/format-patient.ts";
import { extractPatientFacts, factsForSelectorPrompt } from "../app/lib/patient-facts.ts";
import { MODULE_SELECTOR_PROMPT, decisionsForPrompt, resolvePlan } from "../app/lib/module-plan.ts";
import { buildGenerationInput, buildSelectorInput } from "../app/lib/build-input.ts";
import { COLLEAGUE_GENERATOR_PROMPT } from "../app/prompt-presets.ts";

function parseArgs(argv) {
  const args = { patients: null, out: null, guideline: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--patients") args.patients = argv[++index];
    else if (argv[index] === "--out") args.out = argv[++index];
    else if (argv[index] === "--guideline") args.guideline = argv[++index];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.patients || !args.out) {
  console.error("用法：--patients <目錄> --out <輸出目錄> [--guideline <TXT>]");
  process.exit(1);
}

const guidelineText = args.guideline ? await readFile(args.guideline, "utf8") : "";
const names = (await readdir(args.patients)).filter((name) => name.endsWith(".json")).sort();
const manifest = [];

for (const name of names) {
  const id = name.replace(/\.json$/, "").slice(0, 12);
  const parsed = JSON.parse(await readFile(path.join(args.patients, name), "utf8"));
  const llmText = formatPatientJson(parsed);
  const facts = extractPatientFacts(parsed);

  const armA = buildGenerationInput({
    systemPrompt: COLLEAGUE_GENERATOR_PROMPT,
    patientText: llmText,
    includeGuideline: false,
    guidelineText: "",
  });
  const armC = buildSelectorInput({
    systemPrompt: MODULE_SELECTOR_PROMPT,
    factsText: `${factsForSelectorPrompt(facts)}\n\n${decisionsForPrompt(resolvePlan(null, facts))}`,
  });

  const dir = path.join(args.out, id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "patient-llm-text.txt"), llmText, "utf8");
  await writeFile(path.join(dir, "A.system.txt"), armA.systemPrompt, "utf8");
  await writeFile(path.join(dir, "A.input.txt"), armA.text, "utf8");
  await writeFile(path.join(dir, "C.system.txt"), armC.systemPrompt, "utf8");
  await writeFile(path.join(dir, "C.input.txt"), armC.text, "utf8");
  await writeFile(
    path.join(dir, "facts.json"),
    `${JSON.stringify(
      {
        diabetesType: facts.diabetesType,
        positiveComplications: facts.existingComplications.filter((item) => (item.value ?? 0) > 0).map((item) => item.code),
        presentPredictions: facts.riskPredictions.filter((item) => item.present).map((item) => item.code),
        reportDate: facts.reportDate,
        dataQualityFlags: facts.dataQualityFlags,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  if (guidelineText) {
    const armB = buildGenerationInput({
      systemPrompt: COLLEAGUE_GENERATOR_PROMPT,
      patientText: llmText,
      includeGuideline: true,
      guidelineText,
    });
    await writeFile(path.join(dir, "B.system.txt"), armB.systemPrompt, "utf8");
    await writeFile(path.join(dir, "B.input.txt"), armB.text, "utf8");
    manifest.push({ id, dir, armA: armA.totalTokens, armB: armB.totalTokens, armC: armC.totalTokens });
  } else {
    manifest.push({ id, dir, armA: armA.totalTokens, armB: null, armC: armC.totalTokens });
  }
}

await writeFile(path.join(args.out, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(manifest, null, 2));
