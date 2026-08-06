/**
 * 端到端跑完整條流程，並產出可交給獨立 eval 審查的評估包。
 *
 *   原始申報 JSON
 *     → 01 LLM 好讀文字（formatPatientJson）
 *     → 02 確定性事實抽取 + 主題判定（extractPatientFacts / decideTopics）
 *     → 指引門檻表（事先抽取，非全文餵入）
 *     → 03 病人版報告（程式以固定文字組合）
 *     → 04 醫師版報告（含 DCSI 與 PR）
 *
 * 用法：
 *   node scripts/run-pipeline.mjs --patients <目錄> --out <評估包目錄> [--selector <arm C 輸出目錄>]
 *
 * --selector 指向已跑好的輔助判讀器輸出；沒有的話流程照樣完整，
 * 只是少了 LLM 的優先排序（病人版內容完全不受影響，因為它不由 LLM 產生）。
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { formatPatientJson } from "../app/lib/format-patient.ts";
import { extractPatientFacts, factsForSelectorPrompt } from "../app/lib/patient-facts.ts";
import {
  assembleClinicianReport,
  assemblePatientReport,
  decisionsForPrompt,
  parseDataAudit,
  resolvePlan,
} from "../app/lib/module-plan.ts";
import { GUIDELINE_RULES, formatRules, RULES_VERSION } from "../app/lib/guideline-rules.ts";
import { LAB_REVIEW_PROMPT, labSectionOf, parseLabReview } from "../app/lib/lab-llm.ts";
import { LAB_NARRATIVE_PROMPT, buildNarrativeInput, parseLabNarrative } from "../app/lib/lab-narrative.ts";
import { validateReport } from "../app/lib/validate-report.ts";
import { formatBatchReview, reviewCase, summarizeBatch } from "../app/lib/batch-review.ts";

function parseArgs(argv) {
  const args = { patients: null, out: null, selector: null, only: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--patients") args.patients = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
    else if (argv[i] === "--selector") args.selector = argv[++i];
    else if (argv[i] === "--only") args.only = argv[++i].split(",");
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.patients || !args.out) {
  console.error("用法：--patients <目錄> --out <評估包目錄> [--selector <目錄>] [--only id1,id2]");
  process.exit(1);
}

await mkdir(args.out, { recursive: true });
await writeFile(path.join(args.out, "guideline-rules.txt"), formatRules(GUIDELINE_RULES), "utf8");

const today = new Date().toISOString().slice(0, 10);
const names = (await readdir(args.patients)).filter((n) => n.endsWith(".json")).sort();
const summary = [];
const reviews = [];

for (const name of names) {
  const id = name.replace(/\.json$/, "").slice(0, 12);
  if (args.only && !args.only.includes(id)) continue;

  const raw = JSON.parse(await readFile(path.join(args.patients, name), "utf8"));
  const llmText = formatPatientJson(raw);
  const facts = extractPatientFacts(raw);

  let selection = null;
  if (args.selector) {
    // 輸出檔沒有病人識別碼（刻意的），所以放錯資料夾不會有任何症狀——實測就
    // 發生過兩位病人的輸出對調。判讀器要把年齡與 DCSI 抄回來，這裡核對。
    const candidate = await readFile(path.join(args.selector, id, "C.output.json"), "utf8")
      .then(parseDataAudit)
      .catch(() => null);
    const echo = candidate?.echo;
    const expected = [
      [facts.ageYears.known ? facts.ageYears.value : null, echo?.ageYears ?? null, "年齡"],
      [facts.dcsiTotal.known ? facts.dcsiTotal.value : null, echo?.dcsi ?? null, "DCSI"],
    ];
    const mismatched = echo
      ? expected.filter(([mine, theirs]) => mine !== null && theirs !== null && mine !== theirs)
      : [];
    if (mismatched.length) {
      console.error(
        `⚠ ${id}：選模組輸出不是這位病人的（${mismatched.map(([m, t, label]) => `${label} ${t}≠${m}`).join("／")}），已忽略。`,
      );
    } else {
      if (candidate && !echo) console.error(`⚠ ${id}：選模組輸出沒有 echo 欄位，無法核對是否為本人。`);
      selection = candidate;
    }
  }

  const plan = resolvePlan(selection, facts);
  const options = {
    // 報告是現在產出的；來源的 REPORT_DATE 只代表資料到哪一天。
    reportDate: today,
    dataCutoff: facts.dataCutoff.known ? facts.dataCutoff.value : null,
  };
  // 檢驗判讀：LLM 直接讀原始紀錄自己判斷異常。
  // 程式只做抄寫檢查（引用的數值與項目是否存在於來源），不覆寫它的判定。
  let labReview = null;
  if (args.selector) {
    labReview = await readFile(path.join(args.selector, id, "lab.output.json"), "utf8")
      .then((raw) => parseLabReview(raw, facts))
      .catch(() => null);
  }

  // 病人版的檢驗敘述：由 LLM 直接寫，程式驗證數值與禁止事項。
  let labNarrative = null;
  if (args.selector) {
    labNarrative = await readFile(path.join(args.selector, id, "narrative.output.json"), "utf8")
      .then((text) => parseLabNarrative(text, facts))
      .catch(() => null);
  }

  const patientReport = assemblePatientReport(plan, { ...options, labNarrative: labNarrative ?? undefined });
  const clinicianReport = assembleClinicianReport(plan, facts, { ...options, labReview: labReview ?? undefined });

  const dir = path.join(args.out, id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "01_病人資料_LLM好讀版.txt"), llmText, "utf8");
  await writeFile(
    path.join(dir, "02_確定性事實摘要.txt"),
    `${factsForSelectorPrompt(facts)}\n\n${decisionsForPrompt(plan)}`,
    "utf8",
  );
  await writeFile(path.join(dir, "03_病人版衛教報告.txt"), patientReport, "utf8");
  await writeFile(path.join(dir, "04_醫師版報告.txt"), clinicianReport, "utf8");
  await writeFile(
    path.join(dir, "05_檢驗判讀_LLM輸入.txt"),
    `${LAB_REVIEW_PROMPT}\n\n---\n\n${labSectionOf(llmText)}`,
    "utf8",
  );
  await writeFile(
    path.join(dir, "06_檢驗敘述_LLM輸入.txt"),
    `${LAB_NARRATIVE_PROMPT}\n\n---\n\n${buildNarrativeInput(llmText, facts)}`,
    "utf8",
  );

  const validation = validateReport({ report: patientReport, patientText: llmText, profile: "modules" });
  const counts = (kind) => plan.decisions.filter((d) => d.kind === kind).length;

  /*
   * 例外訊號原本只寫在各自那份報告裡。跑三千份時沒有人會逐份打開醫師版，
   * 等於寫在沒人看的檔案中——稽核提的異議、型別判不出來、某次呼叫失敗，
   * 全都會靜靜地過去。這裡收成一則紀錄，跑完彙總成一份清單。
   */
  const review = reviewCase({
    id,
    facts,
    plan,
    validation,
    audit: selection,
    labReview,
    labNarrative,
    llmRequested: Boolean(args.selector),
  });
  reviews.push(review);
  if (review.needsReview) {
    await writeFile(
      path.join(dir, "00_需人工檢查.txt"),
      formatBatchReview([review]),
      "utf8",
    );
  }

  summary.push({
    id,
    needsReview: review.needsReview,
    flags: review.flags.filter((item) => item.severity !== "note").map((item) => item.code),
    patientChars: [...patientReport].length,
    clinicianChars: [...clinicianReport].length,
    questionMarks: (patientReport.match(/？/g) ?? []).length,
    established: counts("established"),
    statusUnconfirmed: counts("status-unconfirmed"),
    preventionActive: counts("prevention-active"),
    moderate: plan.moderateTopics.length,
    excluded: counts("excluded"),
    selfCare: plan.selfCareModuleIds.length,
    validationScore: `${validation.passedCount}/${validation.applicableCount}`,
    llmUsed: Boolean(selection),
  });
}

const pad = (v, w) => String(v).padStart(w);
const padEnd = (v, w) => String(v).padEnd(w);

console.log(`指引門檻表：${GUIDELINE_RULES.length} 條（${RULES_VERSION}），事先抽取，不餵全文\n`);
console.log(
  `${padEnd("病人", 14)}${pad("已發生", 7)}${pad("不明", 6)}${pad("預防", 6)}${pad("提醒", 6)}${pad("排除", 6)}${pad("自照護", 7)}${pad("病人版", 8)}${pad("醫師版", 8)}${pad("問句", 6)}${pad("驗證", 7)}${pad("需檢查", 8)}`,
);
for (const r of summary) {
  console.log(
    padEnd(r.id, 14) +
      pad(r.established, 7) +
      pad(r.statusUnconfirmed, 6) +
      pad(r.preventionActive, 6) +
      pad(r.moderate, 6) +
      pad(r.excluded, 6) +
      pad(r.selfCare, 7) +
      pad(r.patientChars.toLocaleString("en-US"), 8) +
      pad(r.clinicianChars.toLocaleString("en-US"), 8) +
      pad(r.questionMarks, 6) +
      pad(r.validationScore, 7) +
      pad(r.needsReview ? r.flags.join(",").slice(0, 24) : "—", 8),
  );
}

await writeFile(path.join(args.out, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

/*
 * 跑完最重要的一個輸出：接下來要去看哪幾份。
 *
 * 只列需要行動的案件——三千份裡有兩千九百份沒事，把它們也印出來會讓真正
 * 該看的那幾份被埋掉。
 */
const batch = summarizeBatch(reviews);
await writeFile(path.join(args.out, "需人工檢查.txt"), formatBatchReview(reviews), "utf8");

console.log(`\n${batch.total} 份中 ${batch.needsReview} 份需要人看過，${batch.blocking} 份不可直接使用。`);
for (const row of batch.byCode) {
  if (row.severity === "note") continue;
  console.log(`  ${pad(row.cases, 4)} 份　[${row.severity === "blocking" ? "不可使用" : "需看過"}] ${row.code}`);
}
console.log(`\n評估包：${args.out}`);
console.log(`需人工檢查清單：${path.join(args.out, "需人工檢查.txt")}`);
