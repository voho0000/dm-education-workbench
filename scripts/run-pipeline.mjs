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
  DATA_AUDIT_PROMPT,
  assembleClinicianReport,
  assemblePatientReport,
  decisionsForPrompt,
  parseDataAudit,
  resolvePlan,
} from "../app/lib/module-plan.ts";
import { GUIDELINE_RULES, RULES_BY_ID, formatRules, RULES_VERSION } from "../app/lib/guideline-rules.ts";
import { LAB_REVIEW_PROMPT, labSectionOf, parseLabReview } from "../app/lib/lab-llm.ts";
import { LAB_NARRATIVE_PROMPT, buildNarrativeInput, parseLabNarrative } from "../app/lib/lab-narrative.ts";
import { validateReport } from "../app/lib/validate-report.ts";
import { formatBatchReview, reviewCase, summarizeBatch } from "../app/lib/batch-review.ts";
import { REPORT_REVIEW_PROMPT, buildReviewInput, formatReportReview, parseReportReview } from "../app/lib/report-review.ts";
import { assessPublishReadiness, formatReadiness } from "../app/lib/publish-readiness.ts";
import { inputFingerprint } from "../app/lib/fingerprint.ts";
import { callGemini } from "../app/lib/gemini-client.ts";

function parseArgs(argv) {
  const args = { patients: null, out: null, selector: null, only: null, live: false, model: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--patients") args.patients = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
    else if (argv[i] === "--selector") args.selector = argv[++i];
    else if (argv[i] === "--only") args.only = argv[++i].split(",");
    else if (argv[i] === "--live") args.live = true;
    else if (argv[i] === "--model") args.model = argv[++i];
  }
  return args;
}

/*
 * --live 直接呼叫 Gemini，金鑰只從環境變數讀。
 *
 * 這個能力原本只存在於一份沒進版控的暫存腳本裡，暫存區一清就整個消失——
 * 連帶四次呼叫的接線也要重寫。會用到的東西就該進版控。
 *
 * 四次呼叫逐一送出、不併發：一次打三、四個把速率上限打爆，整批會安靜地
 * 降級成沒有 LLM 的報告，而降級的報告跟成功的報告長得很像。
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callLive(systemPrompt, input, label, model) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("--live 需要環境變數 GEMINI_API_KEY，金鑰不從參數傳、也不寫進任何檔案。");
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      return await callGemini({
        apiKey,
        model,
        systemPrompt,
        input,
        signal: new AbortController().signal,
        direct: true,
        timeoutMs: 15 * 60 * 1000,
      });
    } catch (error) {
      const message = String(error?.message ?? error);
      if (!/429|配額|速率/.test(message) || attempt === 6) throw error;
      const wait = 20_000 * attempt;
      process.stdout.write(`\n    ${label} 遇到速率上限，${wait / 1000}s 後第 ${attempt + 1} 次嘗試…`);
      await sleep(wait);
    }
  }
}

const args = parseArgs(process.argv.slice(2));
if (!args.patients || !args.out) {
  console.error("用法：--patients <目錄> --out <評估包目錄> [--live] [--model <id>] [--selector <目錄>] [--only id1,id2]");
  console.error("--live 直接呼叫 Gemini（四次／位），金鑰只從環境變數 GEMINI_API_KEY 讀。");
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
  const model = args.model ?? "gemini-3.6-flash";
  const labInput = labSectionOf(llmText);
  /*
   * 網頁版把程式算出的目標與追蹤間隔餵給 ③；批次版原本沒傳，所以同一位病人
   * 會因為入口不同得到不同報告。兩邊現在給同一份材料。
   */
  const narrativeGoals = {
    targets: plan.targets.targets
      .filter((item) => item.value && !item.needsClinicianConfirmation)
      .map((item) => ({
        metric: item.metric,
        value: (item.ruleId ? RULES_BY_ID.get(item.ruleId)?.patientStatement : null) ?? item.value,
      })),
    followUp: plan.followUp.text,
  };
  const narrativeInput = buildNarrativeInput(llmText, facts, narrativeGoals);
  // 未定案的目標要傳進解析器，否則擋不掉「符合控制目標」——目標是否定案只有這裡知道。
  const undeterminedMetrics = plan.targets.targets
    .filter((item) => item.needsClinicianConfirmation || !item.value)
    .map((item) => item.metric);

  const rawOutputs = {};
  if (args.live) {
    process.stdout.write(`${id} 送出呼叫…`);
    for (const [key, prompt, input, label] of [
      ["audit", DATA_AUDIT_PROMPT, `${factsForSelectorPrompt(facts)}\n\n${decisionsForPrompt(plan)}`, "①資料稽核"],
      ["labReview", LAB_REVIEW_PROMPT, labInput, "②檢驗判讀"],
      ["narrative", LAB_NARRATIVE_PROMPT, narrativeInput, "③檢驗敘述"],
    ]) {
      try {
        rawOutputs[key] = (await callLive(prompt, input, label, model)).text;
      } catch (error) {
        console.error(`\n  ${label} 失敗：${String(error?.message ?? error)}`);
      }
      await sleep(4000);
    }
  }

  const attempt = (raw, parse) => {
    if (!raw) return null;
    try {
      return parse(raw);
    } catch {
      return null;
    }
  };

  if (args.live) selection = attempt(rawOutputs.audit, parseDataAudit) ?? selection;
  if (args.live) {
    labReview = attempt(rawOutputs.labReview, (raw) => parseLabReview(raw, facts));
  } else if (args.selector) {
    labReview = await readFile(path.join(args.selector, id, "lab.output.json"), "utf8")
      .then((raw) => parseLabReview(raw, facts))
      .catch(() => null);
  }

  // 病人版的檢驗敘述：由 LLM 直接寫，程式驗證數值與禁止事項。
  let labNarrative = null;
  if (args.live) {
    labNarrative = attempt(rawOutputs.narrative, (raw) => parseLabNarrative(raw, facts, undeterminedMetrics));
  } else if (args.selector) {
    labNarrative = await readFile(path.join(args.selector, id, "narrative.output.json"), "utf8")
      .then((text) => parseLabNarrative(text, facts, undeterminedMetrics))
      .catch(() => null);
  }

  // 指紋讓一份印出來的報告事後仍可追回是哪一份輸入。網頁版有，批次版原本沒有。
  const runOptions = { ...options, inputFingerprint: inputFingerprint(llmText) };
  const patientReport = assemblePatientReport(plan, { ...runOptions, labNarrative: labNarrative ?? undefined });
  const clinicianReport = assembleClinicianReport(plan, facts, { ...runOptions, labReview: labReview ?? undefined });

  /*
   * ④ 報告審查。必須在 ③ 之後——它審的就是 ③ 寫出來的三段；③ 失敗就沒東西可審。
   */
  let reportReview = null;
  if (args.live && labNarrative) {
    const sections = {
      narrative: labNarrative.narrative,
      shortTerm: labNarrative.shortTerm,
      midTerm: labNarrative.midTerm,
    };
    const reviewInput = buildReviewInput(sections, factsForSelectorPrompt(facts), facts, narrativeGoals);
    try {
      const raw = await callLive(REPORT_REVIEW_PROMPT, reviewInput, "④報告審查", model);
      rawOutputs.reportReview = raw.text;
      reportReview = attempt(raw.text, (text) => parseReportReview(text, sections));
    } catch (error) {
      console.error(`\n  ④報告審查 失敗：${String(error?.message ?? error)}`);
    }
  }

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
    llmRequested: args.live || Boolean(args.selector),
  });

  const readiness = assessPublishReadiness({
    facts,
    plan,
    validation,
    labNarrative,
    labReview,
    reportReview,
    caseReview: review,
    llmRequested: args.live || Boolean(args.selector),
  });
  await writeFile(
    path.join(dir, "12_可發布度與審查標記.txt"),
    [
      ...formatReadiness(readiness),
      "",
      ...(reportReview ? formatReportReview(reportReview) : ["④ 報告審查未執行或解析失敗。"]),
    ].join("\n"),
    "utf8",
  );
  for (const [key, file] of [
    ["audit", "07_原始回應_①資料稽核.txt"],
    ["labReview", "08_原始回應_②檢驗判讀.txt"],
    ["narrative", "09_原始回應_③檢驗敘述.txt"],
    ["reportReview", "10_原始回應_④報告審查.txt"],
  ]) {
    if (rawOutputs[key]) await writeFile(path.join(dir, file), rawOutputs[key], "utf8");
  }
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
