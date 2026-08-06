import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GUIDELINE_KNOWN_CHARS, GUIDELINE_KNOWN_TOKENS, estimateTokens, guidelineTokens } from "../app/lib/tokens.ts";
import { buildRunInput } from "../app/lib/build-input.ts";
import { hasHardBlocker, runBlockers } from "../app/lib/blockers.ts";
import { describeGeminiFailure } from "../app/lib/gemini-errors.ts";
import { formatPatientJson } from "../app/lib/format-patient.ts";
import { extractPatientFacts } from "../app/lib/patient-facts.ts";
import {
  assembleClinicianReport,
  assemblePatientReport,
  decideTopics,
  decisionsForPrompt,
  parseDataAudit,
  DATA_AUDIT_PROMPT,
  PR_HIGH,
  PR_LOW,
  PR_MODERATE,
  resolvePlan,
} from "../app/lib/module-plan.ts";
import {
  SELF_CARE_APPROVED,
  SELF_CARE_MODULES,
  SELF_CARE_VERSION,
  selectSelfCareModules,
} from "../app/lib/self-care-modules.ts";
import { resolveTargets } from "../app/lib/resolve-targets.ts";
import { inputFingerprint } from "../app/lib/fingerprint.ts";
import { formatBatchReview, reviewCase, summarizeBatch } from "../app/lib/batch-review.ts";
import { buildReviewInput, parseReportReview } from "../app/lib/report-review.ts";
import { assessPublishReadiness, formatReadiness } from "../app/lib/publish-readiness.ts";
import { GUIDELINE_RULES, GUIDELINE_SOURCES, RULES_APPROVED, RULES_BY_ID, RULES_VERSION, citationShort, citationText, rulesForType } from "../app/lib/guideline-rules.ts";
import { compareToTargets } from "../app/lib/target-comparison.ts";
import {
  BEHAVIOR_LABEL,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  TOPIC_LABEL,
  TRACE_KIND_CLASS,
  TRACE_KIND_LABEL,
  TRACE_SEVERITY_LABEL,
  TYPE_GATE_LABEL,
  VARIANT_WHEN_LABEL,
} from "../app/lib/content-labels.ts";
import {
  EDUCATION_MODULES,
  MODULE_CATALOG_APPROVED,
  MODULE_CATALOG_VERSION,
} from "../app/lib/education-modules.ts";
import { parseLabReview, formatLabReview, labSectionOf, LAB_REVIEW_PROMPT } from "../app/lib/lab-llm.ts";
import { findUnsupportedClaims } from "../app/lib/unsupported-claims.ts";
import { analyteForItemName, evaluateThresholds, extractLabFindings, kidneyLabEvidence, lowestMeasuredGlucose } from "../app/lib/lab-findings.ts";
import { parseLabNarrative, formatLabNarrative, LAB_NARRATIVE_PROMPT } from "../app/lib/lab-narrative.ts";
import { validateReport } from "../app/lib/validate-report.ts";
import { extractSymbol, extractSymbols } from "../app/lib/source-extract.ts";


const T2 = { medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01" }] } };

// ── token 估算 ────────────────────────────────────────────────

test("estimateTokens 對已知指引全文的誤差在 1% 以內", async (t) => {
  const guidelinePath = process.env.DM_GUIDELINE_TXT;
  if (!guidelinePath) {
    t.skip("未設定 DM_GUIDELINE_TXT，略過。指引全文不進 repo，請以環境變數指向本機檔案後再跑此測試。");
    return;
  }
  const text = await readFile(guidelinePath, "utf8");
  assert.equal([...text].length, GUIDELINE_KNOWN_CHARS, "指引字元數與已知值不符，請確認檔案版本");

  const estimated = estimateTokens(text);
  const error = Math.abs(estimated - GUIDELINE_KNOWN_TOKENS) / GUIDELINE_KNOWN_TOKENS;
  assert.ok(error < 0.01, `估算 ${estimated} vs 實測 ${GUIDELINE_KNOWN_TOKENS}，誤差 ${(error * 100).toFixed(2)}% 超過 1%`);
  assert.deepEqual(guidelineTokens(text), { tokens: GUIDELINE_KNOWN_TOKENS, method: "measured" });
});

test("字元數與已知全文不符時，token 數標示為估算而非硬套已知值", () => {
  const result = guidelineTokens("短短一段文字");
  assert.equal(result.method, "estimate");
  assert.notEqual(result.tokens, GUIDELINE_KNOWN_TOKENS);
});

// ── 輸入組裝 ──────────────────────────────────────────────────

test("三次呼叫的輸入不截斷任何內容", () => {
  const facts = "F".repeat(5_000);
  const lab = "L".repeat(50_000);
  const composed = buildRunInput({
    selectorPrompt: "S",
    factsText: facts,
    labReviewPrompt: "R",
    labText: lab,
    narrativePrompt: "N",
    narrativeText: lab,
  });
  // 組出的長度必須等於各段長度相加，代表沒有任何一段被切掉
  assert.equal(composed.totalChars, 1 + facts.length + 1 + lab.length + 1 + lab.length);
  assert.ok(composed.text.includes(lab), "檢驗紀錄必須逐字出現在輸入中");
});

test("runBlockers 覆蓋五種阻擋情境，且每一條都有解法", () => {
  const base = {
    rawInput: '{"a":1}',
    parsedJson: true,
    model: "gemini-3.6-flash",
    apiKey: "key",
    requiresClientKey: false,
    totalTokens: 1000,
    tokenLimit: 1_048_576,
  };
  const cases = [
    { name: "沒有病人資料", state: { rawInput: "", parsedJson: false }, code: "no-input" },
    { name: "不是 JSON", state: { rawInput: "純文字", parsedJson: false }, code: "not-json" },
    { name: "沒有模型", state: { model: "" }, code: "no-model" },
    { name: "GitHub Pages 沒有金鑰", state: { requiresClientKey: true, apiKey: "" }, code: "no-key" },
    { name: "超過 token 上限", state: { totalTokens: 2_000_000 }, code: "over-limit" },
  ];

  for (const item of cases) {
    const blockers = runBlockers({ ...base, ...item.state });
    const found = blockers.find((blocker) => blocker.code === item.code);
    assert.ok(found, `${item.name}：應該產生 ${item.code}`);
    assert.ok(found.message.length > 0, `${item.name}：必須說明發生什麼事`);
    assert.ok(found.howToFix.length > 0, `${item.name}：必須說明怎麼解決`);
    assert.equal(hasHardBlocker(blockers), true);
  }

  assert.deepEqual(runBlockers(base), [], "一切就緒時沒有任何阻擋");
});

// ── 錯誤轉譯 ──────────────────────────────────────────────────

test("describeGeminiFailure 把各種失敗轉成可讀訊息且保留原文", () => {
  const html = describeGeminiFailure({
    status: 524,
    statusText: "unknown",
    rawBody: "<!doctype html><html><body><h1>Error 524</h1></body></html>",
  });
  assert.match(html.title, /不是 Gemini 的 JSON|HTML/);
  assert.doesNotMatch(html.title, /Unexpected token/);
  assert.doesNotMatch(html.title, /unknown/, "無意義的 statusText 不應顯示給使用者");
  assert.match(html.raw, /Error 524/);

  const badKey = describeGeminiFailure({ status: 400, apiMessage: "API key not valid. Please pass a valid API key." });
  assert.match(badKey.title, /金鑰/);
  assert.match(badKey.raw, /API key not valid/);

  assert.match(describeGeminiFailure({ status: 429, apiMessage: "Resource has been exhausted" }).title, /配額|速率/);
  assert.match(describeGeminiFailure({ status: 504, apiMessage: "upstream timeout" }).title, /逾時/);

  const network = describeGeminiFailure({ cause: new TypeError("Failed to fetch") });
  assert.match(network.title, /網路/);
  assert.equal(network.raw, "Failed to fetch");

  const aborted = describeGeminiFailure({ cause: Object.assign(new Error("aborted"), { name: "AbortError" }) });
  assert.equal(aborted.aborted, true);

  const timedOut = describeGeminiFailure({
    cause: Object.assign(new Error("timeout"), { name: "AbortError" }),
    timedOut: true,
  });
  assert.equal(timedOut.timedOut, true);
  assert.notEqual(timedOut.title, aborted.title, "逾時與使用者中止必須是不同訊息");
});

// ── 病人資料整理與事實抽取 ────────────────────────────────────

test("formatPatientJson 保留來源筆數、重複次數與三條資料限制", () => {
  const output = formatPatientJson({
    downloadType: "DiabetesEducation",
    userInfo: { 資料代碼: "DEMO-001" },
    userInput: { REPORT_DATE: "2026-08-03", DCSI: 2, R1: 1, PR1: 2 },
    rawSources: {
      medication: {
        rObject: [
          { drug_date: "2026-01-20", icd_code: "E11.9", icd_cname: "第2型糖尿病", drug_ename: "METFORMIN" },
          { drug_date: "2026-01-20", icd_code: "E11.9", icd_cname: "第2型糖尿病", drug_ename: "METFORMIN" },
        ],
      },
      labData: { rObject: [{ fee_ym: "202601", assay_item_name: "HbA1c", assay_value: "8.2", unit_data: "%" }] },
    },
  });

  for (const heading of ["【檔案與基本資料】", "【來源模型欄位】", "【用藥紀錄】", "【檢驗與檢查紀錄】", "【資料使用限制】"]) {
    assert.ok(output.includes(heading), `缺少段落 ${heading}`);
  }
  assert.ok(output.includes("來源共2筆；完全相同紀錄合併後1筆"));
  assert.ok(output.includes("×2"), "重複次數必須以 ×N 保留");
  assert.ok(output.includes("歷史申報用藥不得直接描述為目前仍在使用"));
});

test("extractPatientFacts 在診斷碼衝突時拒絕判定糖尿病類型", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", R1: 2 },
    rawSources: {
      medication: {
        rObject: [
          { icd_code: "E109", drug_date: "2024-01-01" },
          { icd_code: "E119", drug_date: "2024-02-01" },
        ],
      },
    },
  });
  assert.equal(facts.diabetesType.verdict, "conflicting");
  assert.ok(facts.dataQualityFlags.some((flag) => flag.includes("同時出現")));
});

test("R／PR 缺欄位記成未提供，且只有真的異常才報資料問題", () => {
  // 欄位本身仍要如實記成 present=false／value=null——判定邏輯靠這個分辨
  // 「未提供」與「值為 0」。
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-03", R1: 2 }, rawSources: {} });
  const r2 = facts.existingComplications.find((item) => item.code === "R2");
  assert.equal(r2.present, false);
  assert.equal(r2.value, null);

  // 但缺欄位不是資料缺漏：R 缺＝該項 DCSI 為 0，PR 缺＝已有 R 值不需預測。
  // 先前每位病人都被推一條「不得視為 0」，那句話和程式自己的行為互相矛盾。
  assert.ok(!facts.dataQualityFlags.some((flag) => flag.includes("不得視為 0")));

  // 真正的異常是同一主題兩者同時缺席（R1 有值所以主題 1 正常，2–6 都異常）
  const flag = facts.dataQualityFlags.find((item) => item.includes("資料模型"));
  assert.ok(flag, "同一主題 R 與 PR 同時缺席時要報出來");
  assert.match(flag, /R2 與 PR2 同時缺席/);
  assert.doesNotMatch(flag, /R1 與 PR1/);

  // 正常的病人不該有這條旗標
  const normal = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", R1: 2, R2: 1, R3: 1, R4: 2, R5: 2, R6: 1 },
    rawSources: {},
  });
  assert.ok(!normal.dataQualityFlags.some((item) => item.includes("資料模型")));
});

test("extractPatientFacts 在只有費用年月時標記無法建立趨勢", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: { labData: { rObject: [{ fee_ym: "202512", assay_item_name: "飯前血糖", assay_value: "203" }] } },
  });
  assert.equal(facts.labHasDrawDates, false);
  assert.ok(facts.dataQualityFlags.some((flag) => flag.includes("無法建立時間順序或趨勢")));
});

// ── 主題判定（確定性）────────────────────────────────────────

test("PR 三級各自對應完整模組、簡短提醒與不納入", () => {
  const facts = extractPatientFacts({
    userInput: {
      REPORT_DATE: "2026-08-03",
      R4: 2,
      PR1: PR_LOW,
      PR2: PR_MODERATE,
      PR3: PR_LOW,
      PR5: PR_MODERATE,
      PR6: PR_LOW,
    },
    rawSources: T2,
  });
  const byTopic = Object.fromEntries(decideTopics(facts).map((item) => [item.topic, item.kind]));

  assert.equal(byTopic[4], "established", "R4=2 應判為已發生");
  assert.equal(byTopic[2], "prevention-moderate", "中等分級只給簡短提醒");
  assert.equal(byTopic[5], "prevention-moderate");
  assert.equal(byTopic[1], "excluded", "最低分級不應納入");
  assert.equal(byTopic[3], "excluded");
  assert.equal(byTopic[6], "excluded");
});

test("三個 PR 分級互不相同，極性常數自洽", () => {
  assert.equal(new Set([PR_HIGH, PR_MODERATE, PR_LOW]).size, 3);
  assert.deepEqual([PR_HIGH, PR_MODERATE, PR_LOW].sort(), [0, 1, 2]);
});

test("R 缺值而 PR 存在，依資料模型代表尚未發生", () => {
  // 來源對同一主題只輸出 R 或 PR 其中一個：已發生給 R，未發生給 PR。
  // 實測六位病人 42 個位置，兩者同時出現 0 次。
  const missing = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-03", PR1: PR_HIGH }, rawSources: {} });
  const a = decideTopics(missing).find((item) => item.topic === 1);
  assert.equal(a.kind, "prevention-active", "只有 PR 代表該併發症尚未發生");

  const zero = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-03", R1: 0, PR1: PR_HIGH }, rawSources: {} });
  assert.equal(decideTopics(zero).find((item) => item.topic === 1).kind, "prevention-active");
});

test("醫師版不得印出程式判定過程與警語", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", R2: 2, PR1: PR_HIGH, PR6: PR_MODERATE, SEX: 0 },
    rawSources: {},
  });
  const report = assembleClinicianReport(resolvePlan(null, facts), facts, {
    reportDate: "2026-08-03",
    dataCutoff: null,
  });
  // 醫師要看臨床結論，不是我的判定邏輯。
  for (const leak of ["完整模組", "簡短提醒", "不納入", "依據：", "需醫療團隊確認", "主題納入判定", "程式判定"]) {
    assert.ok(!report.includes(leak), `醫師版不應出現「${leak}」`);
  }
  assert.match(report, /已發生（嚴重度 2）/);
  assert.match(report, /未發生｜風險預測/);
});

test("來源 CKD 欄位為 1 時，腎臟主題以已發生處理", () => {
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-03", CKD: 1, PR3: PR_HIGH }, rawSources: {} });
  const kidney = decideTopics(facts).find((item) => item.topic === 3);
  assert.equal(kidney.kind, "established", "CKD=1 的病人不可被告知腎臟尚未受影響");
  assert.match(kidney.reason, /CKD 欄位為 1/);
});

test("最低分級仍然不納入", () => {
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-03", PR3: PR_LOW }, rawSources: {} });
  assert.equal(decideTopics(facts).find((item) => item.topic === 3).kind, "excluded");
});

test("R 與 PR 都沒有時不得補值，一律不納入", () => {
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-03" }, rawSources: {} });
  assert.ok(decideTopics(facts).every((item) => item.kind === "excluded"));
});

test("resolvePlan 固定加入 BASE-01，且 BASE-02 只加入一次", () => {
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-03", R4: 2, R6: 2 }, rawSources: T2 });
  const plan = resolvePlan(null, facts);
  assert.ok(plan.patientModuleIds.includes("BASE-01"));
  assert.equal(plan.patientModuleIds.filter((id) => id === "BASE-02").length, 1);
});

test("分型補充模組只在類型明確確認時附加", () => {
  const unclear = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-03", R1: 2 }, rawSources: {} });
  assert.equal(unclear.diabetesType.verdict, "absent");
  const planA = resolvePlan(null, unclear);
  assert.ok(planA.patientModuleIds.includes("EYE-CORE"));
  assert.ok(!planA.patientModuleIds.some((id) => /-T[12]$/.test(id)), "類型未確認不得出現分型補充模組");
  assert.ok(planA.patientModuleIds.includes("TYPE-UNCLEAR"));

  const confirmed = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-03", R1: 2 }, rawSources: T2 });
  const planB = resolvePlan(null, confirmed);
  assert.ok(planB.patientModuleIds.includes("EYE-T2"));
  assert.ok(!planB.patientModuleIds.includes("TYPE-UNCLEAR"));
});


test("parseDataAudit 容許模型多包一層 code fence，並保留稽核內容", () => {
  const raw = [
    "```json",
    JSON.stringify({
      echo: { age_years: 66, dcsi: 3 },
      clinician_notes: ["請確認最新腎功能"],
      data_concerns: ["CKD 欄位與 eGFR 矛盾"],
      disagreements: [{ topic: "R3", program_decision: "不納入", your_view: "eGFR 22.8" }],
    }),
    "```",
  ].join("\n");
  const audit = parseDataAudit(raw);
  assert.deepEqual(audit.echo, { ageYears: 66, dcsi: 3 });
  assert.deepEqual(audit.clinician_notes, ["請確認最新腎功能"]);
  assert.deepEqual(audit.data_concerns, ["CKD 欄位與 eGFR 矛盾"]);
  assert.equal(audit.disagreements[0].topic, "R3");
});

test("資料稽核的結果會進醫師版，不再被丟棄", () => {
  // 先前這一整段被程式丟棄——付了一次呼叫的錢，然後把它抓到的東西扔掉。
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-03", R5: 2 }, rawSources: {} });
  const audit = {
    echo: null,
    clinician_notes: ["請確認最新腎功能狀況與用藥安全"],
    data_concerns: ["基本資料標示慢性腎臟病：否，但 eGFR 最低曾達 22.8"],
    disagreements: [],
  };
  const report = assembleClinicianReport(resolvePlan(audit, facts), facts, {
    reportDate: "2026-08-03",
    dataCutoff: null,
  });
  assert.match(report, /資料稽核（由模型提出，未經程式驗證）/);
  assert.match(report, /\[請確認\] 請確認最新腎功能狀況與用藥安全/);
  assert.match(report, /\[資料疑慮\] 基本資料標示慢性腎臟病：否/);

  // 沒跑稽核時不得出現空章節
  const without = assembleClinicianReport(resolvePlan(null, facts), facts, {
    reportDate: "2026-08-03",
    dataCutoff: null,
  });
  assert.doesNotMatch(without, /資料稽核/);
});

// ── 自我照護模組 ──────────────────────────────────────────────

test("selectSelfCareModules 依申報用藥與負擔做出不同組合", () => {
  const plain = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-03", DCSI: 1 }, rawSources: {} });
  const established = (f) => resolvePlan(null, f).decisions.filter((d) => d.kind === "established").length;
  const a = selectSelfCareModules(plain, established(plain)).moduleIds;
  assert.ok(a.includes("SC-MONITOR") && a.includes("SC-MEDS"), "核心模組必須固定納入");
  assert.ok(!a.includes("SC-HYPO"), "沒有胰島素或促泌劑申報時不應納入低血糖模組");

  const insulin = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", DCSI: 1 },
    rawSources: { medication: { rObject: [{ drug_atc5_name: "胰島素及其類似物", drug_date: "2024-01-01" }] } },
  });
  assert.ok(selectSelfCareModules(insulin, established(insulin)).moduleIds.includes("SC-HYPO"));

  const burden = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", DCSI: 6, R2: 2, R4: 2, R5: 2 },
    rawSources: {},
  });
  const c = selectSelfCareModules(burden, established(burden)).moduleIds;
  assert.ok(c.includes("SC-COPING") && c.includes("SC-SICKDAY"));
});

// ── 報告組裝 ──────────────────────────────────────────────────

test("病人版逐字使用固定文字、標示 DRAFT，且不含代碼或風險標籤", () => {
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-03", R1: 2, PR2: PR_MODERATE }, rawSources: T2 });
  const report = assemblePatientReport(resolvePlan(null, facts), {
    reportDate: "2026-08-03",
    dataCutoff: "2026-08-03",
  });

  assert.match(report, /DRAFT/);
  assert.ok(report.includes("眼睛與視力"), "應逐字包含固定模組標題");
  assert.ok(report.includes("糖尿病可能影響眼底的小血管"), "應逐字包含固定模組內文");
  assert.ok(report.includes("關於這份報告"));
  assert.ok(!/\bR[1-7]\b|\bPR[1-7]\b|DCSI/.test(report), "病人版不得出現內部代碼");
  assert.ok(!/高風險|中風險|低風險/.test(report), "病人版不得出現風險標籤");
  assert.ok(/不是診斷|不代表您已經有這個疾病/.test(report), "預測性內容必須說明不是診斷");
});

test("醫師版含 DCSI 與七項併發症現況／風險預測（主管機關要求）", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", DCSI: 6, R2: 1, R4: 2, PR1: PR_HIGH, PR3: PR_MODERATE },
    rawSources: T2,
  });
  const report = assembleClinicianReport(resolvePlan(null, facts), facts, {
    reportDate: "2026-08-03",
    dataCutoff: "2026-08-03",
  });

  assert.match(report, /DCSI 總分：6/);
  // 七項都要出現，但用臨床名稱而不是 R1/PR1 這種內部代碼。
  for (const name of ["視網膜病變", "腦血管疾病", "腎臟病變", "神經病變", "心血管疾病", "周邊血管疾病", "代謝性急症"]) {
    assert.ok(report.includes(name), `醫師版缺少 ${name}`);
  }
  assert.match(report, /腦血管疾病\s+已發生（嚴重度 1）/);
  assert.match(report, /視網膜病變\s+未發生｜風險預測：積極照護/);
  assert.match(report, /腎臟病變\s+未發生｜風險預測：適度介入/);
  assert.match(report, /代謝性急症\s+來源未提供現況與風險預測/);
});

// ── 指引門檻表與目標推導 ──────────────────────────────────────

test("resolveTargets 依已發生併發症切換 LDL 目標，高齡則交回醫療團隊", () => {
  const cvd = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", BIRTHDAY: "1980-01-01", R5: 2 },
    rawSources: {},
  });
  const ldl = resolveTargets(cvd).targets.find((item) => item.metric === "低密度脂蛋白膽固醇");
  assert.match(ldl.value, /70/);
  assert.ok(ldl.citation.includes("PDF 第"), "目標必須帶出處");

  const plain = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", BIRTHDAY: "1980-01-01" },
    rawSources: {},
  });
  assert.match(resolveTargets(plain).targets.find((item) => item.metric === "低密度脂蛋白膽固醇").value, /100/);

  const elderly = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", BIRTHDAY: "1950-01-01", DCSI: 6 },
    rawSources: {},
  });
  const hba1c = resolveTargets(elderly).targets.find((item) => item.metric === "糖化血色素");
  assert.equal(hba1c.value, null, "高齡的健康狀態分級無法由申報資料判定，不應自行決定目標");
  assert.equal(hba1c.needsClinicianConfirmation, true);
});

test("每條指引規則都有可回查的出處", () => {
  assert.ok(GUIDELINE_RULES.length >= 20, "門檻表至少要有 20 條");
  for (const rule of GUIDELINE_RULES) {
    assert.ok(rule.statement.length > 0, `${rule.id} 缺少陳述`);
    assert.ok(rule.citation.pdfPage > 0, `${rule.id} 缺少頁碼`);
    assert.ok(rule.citation.table || rule.citation.section, `${rule.id} 缺少表或章節`);
  }
});

// ── 輸出驗證器 ────────────────────────────────────────────────

test("validateReport 抓得到 v14 的機械違規", () => {
  const bad = [
    "【Ai醫師人員報告】",
    "- 這一行用了符號條列",
    "**粗體**",
    "本次評估屬於高風險",
    "報告日期：2026年8月3日",
  ].join("\n");

  const result = validateReport({ report: bad, patientText: "", profile: "v14" });
  const failed = new Set(result.results.filter((item) => item.applicable && !item.passed).map((item) => item.id));

  assert.ok(failed.has("no-symbol-bullets"));
  assert.ok(failed.has("no-markdown-emphasis"));
  assert.ok(failed.has("no-risk-labels"));
  assert.ok(failed.has("required-headings"));
  assert.ok(failed.has("single-separator"));
  assert.ok(failed.has("iso-report-date"));
  assert.ok(result.score < 1);
});

test("validateReport 的 numbers-supported 只標記輸入中找不到的數字", () => {
  const result = validateReport({
    report: "您的飯前血糖為 203 mg/dL，建議控制在 130 以下。另有一筆 999 的數值。",
    patientText: "飯前血糖=203 mg/dl",
    profile: "workbench",
  });
  const check = result.results.find((item) => item.id === "numbers-supported");
  assert.equal(check.passed, false);
  assert.ok(check.violations.some((item) => item.includes("999")));
  assert.ok(!check.violations.some((item) => item.includes("203")));
  assert.ok(!check.violations.some((item) => item.includes("130")), "指引目標值不該被標記");
});

test("validateReport 不把正確的『不要自行停藥』誤判為違規", () => {
  for (const good of [
    "請勿自行停藥、換藥或調整劑量，任何調整都應由醫師決定。",
    "規律使用醫師開立的藥物，不自行停藥或更改劑量。",
    "所有藥物之增減與更換均須經醫師評估，切勿自行停藥、減藥或更換藥品。",
  ]) {
    const result = validateReport({ report: good, patientText: "", profile: "workbench" });
    assert.equal(
      result.results.find((item) => item.id === "no-self-medication-change").passed,
      true,
      `誤判為違規：${good}`,
    );
  }

  const bad = validateReport({
    report: "血糖偏低時可以自行減藥，等下次回診再說。",
    patientText: "",
    profile: "workbench",
  });
  assert.equal(bad.results.find((item) => item.id === "no-self-medication-change").passed, false);
});

test("組裝出來的病人版報告能通過 modules profile 的全部檢查", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", DCSI: 6, R2: 2, R4: 2, R5: 2, PR1: PR_HIGH, PR3: PR_MODERATE, PR6: PR_LOW },
    rawSources: T2,
  });
  const plan = resolvePlan(null, facts);
  const narrative = { narrative: "您的檢驗數值整體如下。", shortTerm: "先從每天量血壓開始。", midTerm: "三個月後回診複查。",
    foundAfterAll: [], unverifiedValues: [], uncitedNumbers: [], bannedPhrases: [] };
  const patientText = formatPatientJson({ userInput: { REPORT_DATE: "2026-08-03" }, rawSources: {} });
  const report = assemblePatientReport(plan, { reportDate: "2026-08-03", dataCutoff: "2026-08-03", labNarrative: narrative });
  const result = validateReport({ report, patientText, profile: "modules" });
  assert.equal(result.passedCount, result.applicableCount, JSON.stringify(result.results.filter((r) => !r.passed), null, 1));

  // ③ 失敗時短期建議整段消失，而它沒有程式版的替代文字。
  // 驗證必須說出這件事，不能照樣宣稱六段齊全（外部審查重現過 hasShortTerm=false 但 passed=true）。
  const degraded = assemblePatientReport(plan, { reportDate: "2026-08-03", dataCutoff: "2026-08-03" });
  assert.ok(!degraded.includes("【短期建議："));
  const degradedResult = validateReport({ report: degraded, patientText, profile: "modules" });
  const headings = degradedResult.results.find((r) => /段落|heading/i.test(r.id + r.label));
  assert.equal(headings?.passed, false, "缺少短期建議時，必要段落檢查必須失敗");
});

test("decisionsForPrompt 不得把已納入的模組標成未納入", () => {
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-03", PR1: PR_HIGH, R2: 2 }, rawSources: {} });
  const plan = resolvePlan(null, facts);
  const text = decisionsForPrompt(plan);

  // R1 缺值 + PR1=0 → 現況不明，但模組確實已組進病人版。
  assert.ok(plan.patientModuleIds.includes("EYE-CORE"));
  const eyeLine = text.split("\n").find((line) => line.startsWith("EYE-CORE"));
  assert.match(eyeLine, /已納入/, "現況不明的模組已組進報告，不可標示為未納入");

  for (const id of plan.patientModuleIds) {
    if (id.startsWith("BASE-") || id === "TYPE-UNCLEAR") continue;
    const line = text.split("\n").find((item) => item.startsWith(`${id}（`));
    if (line) assert.match(line, /已納入/, `${id} 已組進報告卻標示為未納入`);
  }
});


test("醫師版不列每份都一樣的通則性廢話", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", DCSI: 6, R2: 2, R5: 2 },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: "METFORMIN HCL" }] },
      labData: { rObject: [{ fee_ym: "202512", assay_item_name: "飯前血糖", assay_value: "203" }] },
    },
  });
  const report = assembleClinicianReport(resolvePlan(null, facts), facts, {
    reportDate: "2026-08-03",
    dataCutoff: "2026-08-03",
  });

  for (const noise of ["資料不足、無法判定的項目", "自我照護模組納入理由", "輔助判讀器", "九、資料限制", "只有費用年月"]) {
    assert.ok(!report.includes(noise), `醫師版不應出現：${noise}`);
  }
  // 保留的仍要在
  assert.match(report, /DCSI 總分：6/);
  assert.match(report, /、併發症現況與風險預測/);
  assert.match(report, /個別化目標/);
});

test("LLM 提出異議時仍會出現在安全提示中", () => {
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-03", R2: 2 }, rawSources: {} });
  const selection = parseDataAudit(
    JSON.stringify({
      priorities: [],
      disagreements: [{ topic: "R2", program_decision: "已發生", your_view: "建議核實" }],
    }),
  );
  const report = assembleClinicianReport(resolvePlan(selection, facts), facts, {
    reportDate: "2026-08-03",
    dataCutoff: null,
  });
  assert.match(report, /\[異議\] R2/);
  assert.match(report, /建議核實/);
});

test("病人版不再逐段要求病人提問", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", DCSI: 6, R2: 2, R4: 2, R5: 2, PR1: PR_HIGH, PR3: PR_HIGH },
    rawSources: {
      medication: {
        rObject: [
          { icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "胰島素及其類似物" },
        ],
      },
    },
  });
  const report = assemblePatientReport(resolvePlan(null, facts), {
    reportDate: "2026-08-03",
    dataCutoff: "2026-08-03",
  });

  assert.ok(!report.includes("下次回診可以確認"), "不應再出現提問清單");
  const questions = (report.match(/？/g) ?? []).length;
  assert.ok(questions <= 3, `病人版問句過多（${questions} 個），會讀起來像在派作業`);
  assert.ok(!report.includes("最後"), "移除提問清單後不應再補上安慰性結語");
});

test("所有模組文字都不含提問清單", async () => {
  const [edu, self] = await Promise.all([
    readFile(new URL("../app/lib/education-modules.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/self-care-modules.ts", import.meta.url), "utf8"),
  ]);
  for (const [name, source] of [["education-modules", edu], ["self-care-modules", self]]) {
    assert.ok(!source.includes("下次回診可以確認"), `${name} 仍含提問清單`);
  }
});

test("模組文字不得混入非中日文的異體字元", async () => {
  const [edu, self, plan] = await Promise.all([
    readFile(new URL("../app/lib/education-modules.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/self-care-modules.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/module-plan.ts", import.meta.url), "utf8"),
  ]);
  // 韓文音節區塊：手誤或輸入法切換很容易混進來，病人看到會很突兀。
  for (const [name, source] of [["education-modules", edu], ["self-care-modules", self], ["module-plan", plan]]) {
    const hangul = source.match(/[가-힯]/g);
    assert.equal(hangul, null, `${name} 混入韓文字元：${hangul?.join("")}`);
  }
});

test("跨模組的通用內容只出現一次", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", DCSI: 6, R1: 2, R2: 2, R4: 2, R5: 2, R6: 2, CKD: 1 },
    rawSources: T2,
  });
  const report = assemblePatientReport(resolvePlan(null, facts), {
    reportDate: "2026-08-03",
    dataCutoff: "2026-08-03",
  });

  // 六個主題全開時最容易暴露重複。
  const footBlocks = (report.match(/每天查看腳背、腳底、腳趾縫與腳跟/g) ?? []).length;
  assert.equal(footBlocks, 1, "足部照護只能出現一次");
  const smoking = (report.match(/戒菸是對血管保護效益最大的一件事/g) ?? []).length;
  assert.equal(smoking, 1, "戒菸內容只能出現一次");

  const lines = report.split("\n").map((l) => l.trim()).filter((l) => l.length > 12 && !/^[─━]+$/.test(l));
  const seen = new Map();
  for (const line of lines) seen.set(line, (seen.get(line) ?? 0) + 1);
  const duplicated = [...seen.entries()].filter(([, n]) => n > 1);
  assert.deepEqual(duplicated, [], "同一份報告不應有完全重複的句子");
});

test("追蹤時程不得同時出現互相矛盾的腎臟間隔", () => {
  const withAbnormal = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", R3: 2 },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: "METFORMIN HCL" }] },
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "eGFR", assay_value: "34.6", unit_data: "ml/min/1.73m2" },
        ],
      },
    },
  });
  const plan = resolvePlan(null, withAbnormal);
  const text = plan.followUp.text;
  // eGFR 34.6 落在表二的 30–44 分段：每 3 個月，比籠統的「每 3–6 個月」更嚴也更具體。
  assert.match(text, /每 3 個月檢查一次腎功能/, "有實際 eGFR 時應用分段的頻率");
  assert.ok(!/肌酸酐、eGFR、尿液常規與白蛋白尿建議每年檢查一次/.test(text), "不應同時保留每年的一般間隔");
  assert.ok(!/至少每半年/.test(text), "分段頻率已取代加密追蹤，兩者並列會出現兩個數字");

  const normal = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-03", R3: 2 }, rawSources: T2 });
  const plainText = resolvePlan(null, normal).followUp.text;
  assert.ok(!/至少每半年/.test(plainText), "沒有異常數值時不得虛報加密追蹤");
});

test("實際檢驗值會接進門檻判定並保留不等號", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", R3: 2 },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: "METFORMIN HCL" }] },
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "Albumin/Creatinine(Dipstick)", assay_value: "≧300 (2+)", unit_data: "mg/g" },
          { fee_ym: "202512", assay_item_name: "eGFR(MDRD)", assay_value: "34.6" },
          // 尿糖：單位為空且值含 + 號，不得被當成血糖
          { fee_ym: "202512", assay_item_name: "Glucose", assay_value: "3+" },
        ],
      },
    },
  });
  const plan = resolvePlan(null, facts);

  // 數值可能被嵌進器官段落，也可能留在文末摘要，兩處都要看。
  const allNotes = [...plan.labNotes, ...Object.values(plan.labByModule).flat()];
  assert.ok(allNotes.some((n) => n.includes("≧300")), "不等號必須保留，不可壓成數字區間");
  assert.ok(!allNotes.some((n) => n.includes("飯前血糖")), "尿糖不得被當成血糖");
  assert.ok(
    plan.labThresholds.some((h) => h.code === "kidney-intensive-followup"),
    "UACR≧300 應觸發加密追蹤門檻",
  );
  assert.ok(
    plan.labThresholds.some((h) => h.code === "metformin-reduce" && h.clinicianMessage.includes("34.6")),
    "醫師版的門檻提示必須帶出實際數值",
  );
  assert.ok(
    plan.labThresholds.every((h) => !/最近一次|趨勢/.test(h.clinicianMessage)),
    "沒有採檢日時不得聲稱時序",
  );
});

test("病人版不顯示筆數，也不把「無」當成單位", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", R3: 2 },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01" }] },
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "eGFR(MDRD)", assay_value: "42.7", unit_data: "無" },
          { fee_ym: "202512", assay_item_name: "eGFR(MDRD)", assay_value: "35.2", unit_data: "無" },
        ],
      },
    },
  });
  const plan = resolvePlan(null, facts);
  const note = plan.labNotes.find((n) => n.includes("eGFR"));

  assert.ok(!/無/.test(note), `「無」不是單位，不該印出來：${note}`);
  assert.ok(!/\d+\s*筆/.test(note), `病人版不該出現筆數：${note}`);
  // 醫師版仍保留筆數
  assert.ok(plan.labNotesForClinician.some((n) => /共 \d+ 筆/.test(n)), "醫師版應保留筆數");
});

test("arm C 的報告數字都可追溯", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", DCSI: 6, R2: 2, R4: 2, R5: 2, CKD: 1 },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: "METFORMIN HCL" }] },
      labData: { rObject: [{ fee_ym: "202512", assay_item_name: "eGFR", assay_value: "34.6", unit_data: "ml/min/1.73m2" }] },
    },
  });
  const report = assemblePatientReport(resolvePlan(null, facts), { reportDate: "2026-08-03", dataCutoff: null });
  const result = validateReport({
    report,
    patientText: formatPatientJson({
      userInput: { REPORT_DATE: "2026-08-03" },
      rawSources: { labData: { rObject: [{ fee_ym: "202512", assay_item_name: "eGFR", assay_value: "34.6" }] } },
    }),
    profile: "modules",
  });
  const check = result.results.find((item) => item.id === "numbers-supported");
  assert.equal(check.applicable, true, "arm C 也要檢查數字可追溯性");
  assert.equal(check.passed, true, check.violations.join(" | "));
});

test("同一條指引規則不得在安全提示中出現兩次", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", DCSI: 6, BIRTHDAY: "1950-01-01", R2: 2, R5: 2, CKD: 1 },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: "METFORMIN HCL" }] },
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "eGFR", assay_value: "34.6", unit_data: "ml/min/1.73m2" },
          { fee_ym: "202512", assay_item_name: "Albumin/Creatinine(Dipstick)", assay_value: "≧300 (2+)", unit_data: "mg/g" },
        ],
      },
    },
  });
  const report = assembleClinicianReport(resolvePlan(null, facts), facts, {
    reportDate: "2026-08-03",
    dataCutoff: "2026-08-03",
  });

  // 只看「需核實」這一節。追蹤間隔那一節也會列腎臟每半年，但那不是重複——
  // 一個是「這位病人的數值達到門檻」，一個是「排程該怎麼開」，少了後者排程表
  // 就沒有腎臟那一列。
  const section = report.slice(report.indexOf("需核實的檢驗結果"), report.indexOf("、檢驗結果"));
  const halfYear = (section.match(/至少每半年監測追蹤一次/g) ?? []).length;
  assert.equal(halfYear, 1, "腎臟加密追蹤規則只能出現一次");

  // 數值就在同一份報告裡時，不得再寫「需由檢驗結果確認」。
  assert.ok(!section.includes("實際數值需由檢驗結果確認"), "有實際數值時不該還說需要確認數值");
  assert.match(section, /34\.6/, "安全提示必須帶出實際數值");
});

function factsWithLabs(labs, userInput = {}) {
  return extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", ...userInput },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: "METFORMIN HCL" }] },
      labData: { rObject: labs.map((l) => ({ fee_ym: "202512", ...l })) },
    },
  });
}

test("每一個超出目標的指標都會被標記，覆蓋不能有缺口", () => {
  // 稽核發現的實際缺口：HbA1c 9.2 與 HDL-C 14 曾經完全沒有提示。
  const facts = factsWithLabs(
    [
      { assay_item_name: "HbA1c", assay_value: "9.6", unit_data: "%" },
      { assay_item_name: "HDL-cholesterol", assay_value: "14", unit_data: "mg/dL" },
      { assay_item_name: "LDL-cholesterol", assay_value: "180", unit_data: "mg/dL" },
      { assay_item_name: "Triglyceride", assay_value: "600", unit_data: "mg/dL" },
      { assay_item_name: "Glucose AC(手指)", assay_value: "248", unit_data: "mg/dl" },
    ],
    { BIRTHDAY: "1958-01-01" },
  );
  const plan = resolvePlan(null, facts);
  const flagged = new Set(plan.targetComparisons.filter((c) => c.outOfTarget).map((c) => c.analyte));

  for (const analyte of ["HbA1c", "HDL-C", "LDL-C", "triglyceride", "fasting-glucose"]) {
    assert.ok(flagged.has(analyte), `${analyte} 超出目標卻沒有被標記`);
  }
  // 每一個被標記的都要有給病人看的說法
  for (const item of plan.targetComparisons.filter((c) => c.outOfTarget)) {
    assert.ok(item.patientMessage, `${item.analyte} 沒有病人版提示`);
    assert.ok(item.clinicianMessage.includes(String(item.worst)), `${item.analyte} 的醫師版提示未帶實際數值`);
  }
});

test("在目標內的數值不會被誤標", () => {
  const facts = factsWithLabs(
    [
      { assay_item_name: "HbA1c", assay_value: "6.4", unit_data: "%" },
      { assay_item_name: "LDL-cholesterol", assay_value: "80", unit_data: "mg/dL" },
    ],
    { BIRTHDAY: "1980-01-01" },
  );
  const plan = resolvePlan(null, facts);
  assert.deepEqual(
    plan.targetComparisons.filter((c) => c.outOfTarget).map((c) => c.analyte),
    [],
    "目標內的數值不該被標記",
  );
});

test("高齡者的 HbA1c 只有超過最寬放寬值才算超標", () => {
  const elderly = (value) =>
    resolvePlan(null, factsWithLabs([{ assay_item_name: "HbA1c", assay_value: value, unit_data: "%" }], { BIRTHDAY: "1950-01-01" }))
      .targetComparisons.find((c) => c.analyte === "HbA1c");

  assert.equal(elderly("7.9").outOfTarget, false, "高齡 7.9% 仍在放寬門檻 8.0% 內，不該當成超標");
  assert.equal(elderly("9.0").outOfTarget, true, "高齡 9.0% 超過最寬的 8.5%，必須標記");
  assert.equal(elderly("9.0").targetNeedsConfirmation, true, "高齡目標本身仍需醫療團隊定案");
});

test("檢驗值會嵌進對應的器官段落", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", R3: 2 },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01" }] },
      labData: {
        rObject: [{ fee_ym: "202512", assay_item_name: "eGFR", assay_value: "34.6", unit_data: "ml/min/1.73m2" }],
      },
    },
  });
  const plan = resolvePlan(null, facts);
  assert.ok(plan.labByModule["KIDNEY-CORE"]?.some((n) => n.includes("34.6")), "eGFR 應嵌進腎臟段落");

  const report = assemblePatientReport(plan, { reportDate: "2026-08-03", dataCutoff: null });
  const kidneyStart = report.indexOf("腎臟");
  const kidneySection = report.slice(kidneyStart, kidneyStart + 900);
  assert.match(kidneySection, /34\.6/, "腎臟段落內就要看得到自己的數值");
});

test("用藥與檢驗的時間落差仍被算出，但不印在醫師版", () => {
  // 落差本身要保留在 plan 裡（低血糖模組就是因為它才改用實測值判定），
  // 但醫師版不印任何關於資料本身的提示。
  const facts = factsWithLabs([{ assay_item_name: "HbA1c", assay_value: "6.4", unit_data: "%" }]);
  const plan = resolvePlan(null, facts);
  assert.ok(plan.medicationLabGapDays > 365, "測試資料的用藥停在 2024，落差應大於一年");

  const report = assembleClinicianReport(plan, facts, { reportDate: "2026-08-03", dataCutoff: "2026-08-03" });
  assert.ok(!/用藥申報最後一筆距報告日/.test(report));
});

test("醫師版的安全提示不夾帶資料來源的通則說明", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", BIRTHDAY: "1950-01-01", CKD: 1, R5: 2 },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: "METFORMIN HCL" }] },
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "eGFR", assay_value: "34.6", unit_data: "ml/min/1.73m2" },
          { fee_ym: "202512", assay_item_name: "Na", assay_value: "122", unit_data: "mmol/L" },
          { fee_ym: "202512", assay_item_name: "K", assay_value: "3.1", unit_data: "mmol/L" },
          { fee_ym: "202512", assay_item_name: "HbA1c", assay_value: "6.4", unit_data: "%" },
          { fee_ym: "202512", assay_item_name: "HB", assay_value: "8.4", unit_data: "g/dL" },
          { fee_ym: "202512", assay_item_name: "Sugar", assay_value: "418", unit_data: "mg/dL" },
        ],
      },
    },
  });
  const report = assembleClinicianReport(resolvePlan(null, facts), facts, {
    reportDate: "2026-08-03",
    dataCutoff: null,
  });
  const section = report.slice(report.indexOf("需核實的檢驗結果"), report.indexOf("、檢驗結果"));
  // 申報資料的通則限制醫師本來就知道，每一則都重述會把臨床訊息淹掉。
  for (const noise of [
    "來源只有費用年月",
    "無法判定時間點",
    "無法判定何者較新",
    "申報用藥不代表",
    "請核對目前處方",
    "未標示空腹或餐後",
    "資料標記有",
  ]) {
    assert.ok(!section.includes(noise), `安全提示不應出現「${noise}」`);
  }
  // 同一件事不得由通則版與具體版各講一次
  assert.equal((section.match(/HbA1c/g) ?? []).length, 1);
  assert.match(section, /Na 曾出現異常值/);
});

test("就醫警訊全部集中，不散在自我照護段落中間", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", DCSI: 6, BIRTHDAY: "1950-01-01", R2: 2, R4: 2, R5: 2 },
    rawSources: {
      medication: {
        rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "胰島素及其類似物" }],
      },
    },
  });
  const plan = resolvePlan(null, facts);
  const report = assemblePatientReport(plan, { reportDate: "2026-08-03", dataCutoff: null });

  // 低血糖與生病日的警訊來自自我照護模組，也必須進集中清單
  assert.ok(plan.urgentSigns.some((s) => s.includes("低血糖")), "低血糖警訊應被收集");
  assert.ok(plan.urgentSigns.some((s) => s.includes("生病期間")), "生病日警訊應被收集");

  const sectionStart = report.indexOf("什麼情況要立刻就醫");
  assert.ok(sectionStart > 0, "應有集中的就醫警訊區塊");
  // 集中區塊之前不該再出現「需要儘速就醫的情況」這種小標題
  assert.ok(
    !report.slice(0, sectionStart).includes("需要儘速就醫的情況"),
    "警訊不該同時散在模組中間與集中區塊",
  );
});

test("已嵌進器官段落的數值不會在文末重複列一次", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", R3: 2 },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01" }] },
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "eGFR", assay_value: "34.6", unit_data: "ml/min/1.73m2" },
          { fee_ym: "202512", assay_item_name: "HbA1c", assay_value: "6.4", unit_data: "%" },
        ],
      },
    },
  });
  const plan = resolvePlan(null, facts);

  assert.ok(plan.labByModule["KIDNEY-CORE"]?.some((n) => n.includes("eGFR")), "eGFR 應嵌進腎臟段落");
  assert.ok(!plan.labNotes.some((n) => n.includes("腎絲球過濾率")), "已內嵌的數值不該在文末摘要重複");
  assert.ok(plan.labNotes.some((n) => n.includes("糖化血色素")), "沒有對應器官段落的數值仍應列在文末");
});

test("已發生併發症的計數只有一個來源", () => {
  // CKD 旗標會讓腎臟被判為已發生，但 R3 欄位缺值。
  // 任何自己重數 R>0 的地方都會少算一項，稽核就是這樣抓到 3 vs 4。
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", DCSI: 6, BIRTHDAY: "1950-01-01", R2: 2, R4: 2, R5: 2, CKD: 1 },
    rawSources: T2,
  });
  const plan = resolvePlan(null, facts);
  const established = plan.decisions.filter((d) => d.kind === "established").length;
  assert.equal(established, 4, "R2/R4/R5 加上 CKD 驅動的腎臟＝4 項");

  // 計數不論出現在哪一份報告，都必須與主題判定一致。
  const both =
    assembleClinicianReport(plan, facts, { reportDate: "2026-08-03", dataCutoff: null }) +
    assemblePatientReport(plan, { reportDate: "2026-08-03", dataCutoff: null });
  for (const value of [...both.matchAll(/已發生併發症 (\d+) 項/g)].map((m) => Number(m[1]))) {
    assert.equal(value, established, `報告寫 ${value} 項，但主題判定是 ${established} 項`);
  }
});

test("同一個檢驗項目只產生一則病人警語", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", BIRTHDAY: "1954-01-01" },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: "METFORMIN HCL" }] },
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "Glucose AC(手指)", assay_value: "248", unit_data: "mg/dl" },
          { fee_ym: "202512", assay_item_name: "Glucose AC(手指)", assay_value: "87", unit_data: "mg/dl" },
        ],
      },
    },
  });
  const plan = resolvePlan(null, facts);
  const report = assemblePatientReport(plan, { reportDate: "2026-08-03", dataCutoff: null });

  const warnings = (report.match(/曾出現偏高的飯前血糖/g) ?? []).length;
  assert.equal(warnings, 1, `飯前血糖的警語應只出現一次，實際 ${warnings} 次`);

  // 醫師版也不該對同一項目重複開安全提示
  const clinician = assembleClinicianReport(plan, facts, { reportDate: "2026-08-03", dataCutoff: null });
  const section = clinician.slice(clinician.indexOf("六、安全提示"));
  const glucoseFlags = (section.match(/飯前血糖/g) ?? []).length;
  assert.ok(glucoseFlags <= 1, `醫師版安全提示對飯前血糖出現 ${glucoseFlags} 次`);
});

test("危險的電解質數值會被標記為 urgent", () => {
  const withLabs = (labs) =>
    resolvePlan(
      null,
      extractPatientFacts({
        userInput: { REPORT_DATE: "2026-08-03" },
        rawSources: {
          medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01" }] },
          labData: { rObject: labs.map((l) => ({ fee_ym: "202512", ...l })) },
        },
      }),
    );

  const lowK = withLabs([{ assay_item_name: "K", assay_value: "2.4", unit_data: "mmol/L" }]);
  const kHit = lowK.labThresholds.find((h) => h.code === "potassium-abnormal");
  assert.ok(kHit, "血鉀 2.4 必須被標記");
  assert.equal(kHit.severity, "urgent");
  assert.match(kHit.clinicianMessage, /2\.4/);
  assert.ok(kHit.patientMessage, "病人也要被告知去回診確認");

  const lowNa = withLabs([{ assay_item_name: "Na", assay_value: "122", unit_data: "mmol/L" }]);
  assert.equal(lowNa.labThresholds.find((h) => h.code === "sodium-abnormal")?.severity, "urgent");

  // 正常範圍不得誤報
  const normal = withLabs([
    { assay_item_name: "K", assay_value: "4.1", unit_data: "mmol/L" },
    { assay_item_name: "Na", assay_value: "140", unit_data: "mmol/L" },
  ]);
  assert.deepEqual(
    normal.labThresholds.filter((h) => /potassium|sodium/.test(h.code)),
    [],
    "正常電解質不該被標記",
  );
});

test("eGFR 低於 30 時 metformin 判為禁用而非減量", () => {
  const plan = resolvePlan(
    null,
    extractPatientFacts({
      userInput: { REPORT_DATE: "2026-08-03" },
      rawSources: {
        medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: "METFORMIN HCL" }] },
        labData: { rObject: [{ fee_ym: "202512", assay_item_name: "eGFR", assay_value: "24.1", unit_data: "ml/min/1.73m2" }] },
      },
    }),
  );
  const hit = plan.labThresholds.find((h) => h.code === "metformin-contraindicated");
  assert.ok(hit, "eGFR 22.8 應觸發禁用而非減量");
  assert.equal(hit.severity, "urgent");
  assert.ok(!plan.labThresholds.some((h) => h.code === "metformin-reduce"), "禁用與減量不可同時出現");
});

test("醫師版要說清楚哪些由指引判定、哪些由判讀器判定", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01" }] },
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "HbA1c", assay_value: "6.4", unit_data: "%" },
          { fee_ym: "202512", order_code: "09002C", assay_item_name: "BUN", assay_value: "104", unit_data: "mg/dL", consult_value: "[7-25][7-25]" },
        ],
      },
    },
  });
  const plan = resolvePlan(null, facts);
  const check = parseLabReview(
    JSON.stringify({ abnormal: [{ item: "BUN", worst: "104", unit: "mg/dL", reference: "7-25", direction: "high", why: "" }] }),
    facts,
  );
  const report = assembleClinicianReport(plan, facts, {
    reportDate: "2026-08-03",
    dataCutoff: null,
    labReview: check,
  });

  // 合併成一節，但仍要分得出哪些是指引判的、哪些是判讀器判的
  assert.match(report, /檢驗結果/);
  assert.match(report, /依指引門檻表逐條判定的核心指標/);
  assert.match(report, /由輔助判讀器讀取 \d+ 筆原始紀錄判定/);
  assert.ok(
    report.indexOf("依指引門檻表逐條判定") < report.indexOf("由輔助判讀器讀取"),
    "指引判定的排在前面",
  );
});

test("血糖抓取不受項目名稱寫法影響，且排除尿糖", () => {
  const plan = resolvePlan(
    null,
    extractPatientFacts({
      userInput: { REPORT_DATE: "2026-08-03" },
      rawSources: {
        medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01" }] },
        labData: {
          rObject: [
            // 同一件事的各種寫法，全部都要抓到
            { fee_ym: "202512", order_code: "09005C", assay_item_name: "Sugar(One touch)", assay_value: "274", unit_data: "mg/dL" },
            { fee_ym: "202512", order_code: "09140C", assay_item_name: "Glucose(spot)", assay_value: "383", unit_data: "mg/dL" },
            { fee_ym: "202512", order_code: "09140C", assay_item_name: "Glucose (Random)", assay_value: "486", unit_data: "mg/dL" },
            { fee_ym: "202512", order_code: "09005C", assay_item_name: "血液及體液葡萄糖", assay_value: "262", unit_data: "mg/dl" },
            // 尿糖：醫令 06012C／06013C，不得混入血糖
            { fee_ym: "202512", order_code: "06012C", assay_item_name: "Glucose", assay_value: "200", unit_data: "mg/dl" },
            { fee_ym: "202512", order_code: "06013C", assay_item_name: "Glucose", assay_value: "＞1000", unit_data: "mg/dL" },
          ],
        },
      },
    }),
  );

  const glucose = plan.labThresholds.find((h) => h.code === "glucose-unspecified-high");
  assert.ok(glucose, "各種寫法的血糖都應被納入");
  assert.match(glucose.clinicianMessage, /486/, "最高值應為 486");
  assert.ok(!/1000/.test(glucose.clinicianMessage), "尿糖 ＞1000 不得被當成血糖");
  assert.equal(glucose.severity, "urgent");
});

test("低血糖會被標記", () => {
  const withGlucose = (value) =>
    resolvePlan(
      null,
      extractPatientFacts({
        userInput: { REPORT_DATE: "2026-08-03" },
        rawSources: {
          medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01" }] },
          labData: {
            rObject: [
              { fee_ym: "202512", order_code: "09005C", assay_item_name: "Glucose AC(手指)", assay_value: value, unit_data: "mg/dl" },
            ],
          },
        },
      }),
    ).labThresholds.find((h) => h.code === "hypoglycemia");

  assert.equal(withGlucose("62")?.severity, "attention", "62 mg/dL 低於 70、高於 54，屬第一級低血糖");
  assert.equal(withGlucose("48")?.severity, "urgent", "低於 54 屬嚴重低血糖");
  assert.equal(withGlucose("110"), undefined, "正常血糖不該被標記");
});

test("高齡 HbA1c 的比較門檻必須能在門檻表中找到", () => {
  const plan = resolvePlan(
    null,
    extractPatientFacts({
      userInput: { REPORT_DATE: "2026-08-03", BIRTHDAY: "1950-01-01" },
      rawSources: {
        medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01" }] },
        labData: { rObject: [{ fee_ym: "202512", assay_item_name: "HbA1c", assay_value: "9.6", unit_data: "%" }] },
      },
    }),
  );
  const hba1c = plan.targetComparisons.find((c) => c.analyte === "HbA1c");
  // 8.5% 曾經被寫死在這裡，但它不在抽取出來的門檻表中。
  assert.ok(!/8\.5/.test(hba1c.clinicianMessage), "不得使用門檻表中不存在的數字");
  assert.match(hba1c.clinicianMessage, /8\.0/, "應以門檻表中最寬的數值門檻 8.0% 比較");

  const rulesText = GUIDELINE_RULES.map((r) => r.statement).join("\n");
  for (const number of hba1c.clinicianMessage.match(/\d+\.\d+(?=%)/g) ?? []) {
    assert.ok(rulesText.includes(number) || number === "9.6", `${number}% 在門檻表中找不到出處`);
  }
});

test("檢驗資料的時間限制整份報告只說明一次", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", R3: 2, R5: 2 },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01" }] },
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "eGFR", assay_value: "45", unit_data: "ml/min/1.73m2" },
          { fee_ym: "202512", assay_item_name: "LDL-cholesterol", assay_value: "180", unit_data: "mg/dL" },
          { fee_ym: "202512", assay_item_name: "HbA1c", assay_value: "8.1", unit_data: "%" },
        ],
      },
    },
  });
  const report = assemblePatientReport(resolvePlan(null, facts), {
    reportDate: "2026-08-03",
    dataCutoff: "2026-08-03",
  });

  const caveats = (report.match(/沒有檢查日期/g) ?? []).length;
  assert.equal(caveats, 1, `時間限制說明應只出現一次，實際 ${caveats} 次`);

  const lines = report.split("\n").map((l) => l.trim()).filter((l) => l.length > 12 && !/^[─━]+$/.test(l));
  const seen = new Map();
  for (const line of lines) seen.set(line, (seen.get(line) ?? 0) + 1);
  assert.deepEqual([...seen.entries()].filter(([, n]) => n > 1), [], "不應有完全重複的句子");
});

test("數值呈現不得藏起最極端的一筆", () => {
  // eGFR 同時有 ＞60.0 與一個低於 30 的值時，舊邏輯只列前四個相異值，
  // 把觸發 metformin 禁用的那一筆藏起來，和安全提示自相矛盾。
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: "METFORMIN HCL" }] },
      labData: {
        rObject: ["42.7", "35.2", "37.0", "＞60.0", "24.1", "64.7"].map((v) => ({
          fee_ym: "202512",
          assay_item_name: "eGFR(MDRD)",
          assay_value: v,
        })),
      },
    },
  });
  const plan = resolvePlan(null, facts);
  const shown = [...plan.labNotes, ...plan.labNotesForClinician, ...Object.values(plan.labByModule).flat()]
    .filter((n) => n.includes("eGFR"))
    .join(" ");

  assert.match(shown, /24\.1/, "最低值必須看得到，安全提示就是用它判定的");
  assert.match(shown, /＞60\.0/, "帶不等號的值也不能被吃掉");

  // 安全提示引用的數字必須出現在數值呈現中
  const flag = plan.labThresholds.find((h) => h.code === "metformin-contraindicated");
  assert.ok(flag, "eGFR 低於 30 應觸發 metformin 禁用");
  for (const number of flag.clinicianMessage.match(/\d+\.\d+/g) ?? []) {
    assert.ok(shown.includes(number), `安全提示引用了 ${number}，但數值列表中看不到`);
  }
});

test("尿糖不論寫法都不得混入血糖", () => {
  const plan = resolvePlan(
    null,
    extractPatientFacts({
      userInput: { REPORT_DATE: "2026-08-03" },
      rawSources: {
        medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01" }] },
        labData: {
          rObject: [
            // 尿生化：醫令 06013C、檢體 Urine、參考值 ＜=50
            { fee_ym: "202512", order_code: "06013C", assay_item_name: "Glucose", assay_value: "＞1000", unit_data: "mg/dL", consult_value: "＜=50", inspect_mode: "Urine" },
            { fee_ym: "202512", order_code: "06013C", assay_item_name: "Glucose", assay_value: "1000", unit_data: "mg/dL", consult_value: "＜=50", inspect_mode: "Urine" },
            // 血液：醫令 09005C，中文命名也要納入
            { fee_ym: "202512", order_code: "09005C", assay_item_name: "血液及體液葡萄糖", assay_value: "262", unit_data: "mg/dl" },
          ],
        },
      },
    }),
  );
  const glucose = [...plan.labNotes, ...plan.labNotesForClinician].filter((n) => n.includes("血糖")).join(" ");
  assert.match(glucose, /262/, "中文命名的血液葡萄糖必須納入");
  assert.ok(!/1000/.test(glucose), "尿糖 1000 mg/dL 不得被當成血糖");
});

test("eAG 是換算值，不得計入實測血糖", () => {
  const plan = resolvePlan(
    null,
    extractPatientFacts({
      userInput: { REPORT_DATE: "2026-08-03" },
      rawSources: {
        medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01" }] },
        labData: {
          rObject: [
            { fee_ym: "202512", order_code: "09005C", assay_item_name: "Glucose(spot)", assay_value: "180", unit_data: "mg/dL" },
            // eAG 由 HbA1c 9.2% 換算而來，不是量出來的
            { fee_ym: "202512", order_code: "09006C", assay_item_name: "Estimated average glucose (eAG)", assay_value: "217", unit_data: "mg/dL" },
            { fee_ym: "202512", assay_item_name: "HbA1c", assay_value: "9.6", unit_data: "%" },
          ],
        },
      },
    }),
  );
  const glucose = [...plan.labNotes, ...plan.labNotesForClinician].filter((n) => n.includes("血糖")).join(" ");
  assert.match(glucose, /180/, "實測血糖應納入");
  assert.ok(!/217/.test(glucose), "eAG 換算值不得被列為實測血糖");
});






// ── 檢驗判讀由 LLM 負責，程式只做抄寫檢查 ──

function labFacts() {
  return extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", order_code: "09002C", assay_item_name: "BUN", assay_value: "104", unit_data: "mg/dL", consult_value: "[7-25][7-25]" },
          { fee_ym: "202512", order_code: "06012C", assay_item_name: "WBC", assay_value: "20", unit_data: "/HPF", consult_value: "[0][3]" },
        ],
      },
    },
  });
}

test("判讀器的判定不被程式覆寫", () => {
  const check = parseLabReview(
    JSON.stringify({
      abnormal: [{ item: "BUN", worst: "104", unit: "mg/dL", reference: "7-25", direction: "high", why: "高於參考上限" }],
      groups: [{ system: "腎功能", items: ["BUN"], pattern: "偏高" }],
      worth_a_look: ["BUN 明顯偏高"],
      data_quality_notes: [],
    }),
    labFacts(),
  );
  assert.equal(check.review.abnormal.length, 1, "程式不得刪除判讀器認定的異常");
  assert.deepEqual(check.unverifiedValues, []);
  assert.deepEqual(check.unknownItems, []);
});

test("引用來源沒有的數值會被標記出來，但不刪除", () => {
  const check = parseLabReview(
    JSON.stringify({
      abnormal: [
        { item: "BUN", worst: "104", unit: "mg/dL", reference: "7-25", direction: "high", why: "" },
        { item: "BUN", worst: "999", unit: "mg/dL", reference: "7-25", direction: "high", why: "" },
      ],
    }),
    labFacts(),
  );
  assert.equal(check.review.abnormal.length, 2, "判定保留，由醫師決定");
  assert.equal(check.unverifiedValues.length, 1);
  assert.equal(check.unverifiedValues[0].worst, "999");
});

test("引用來源沒有的項目名稱會被標記", () => {
  const check = parseLabReview(
    JSON.stringify({ abnormal: [{ item: "Troponin I", worst: "0.5", unit: "ng/mL", reference: "", direction: "high", why: "" }] }),
    labFacts(),
  );
  assert.deepEqual(check.unknownItems, ["Troponin I"]);
});

test("抄寫檢查的結果會出現在醫師版", () => {
  const facts = labFacts();
  const check = parseLabReview(
    JSON.stringify({
      abnormal: [{ item: "BUN", worst: "999", unit: "mg/dL", reference: "7-25", direction: "high", why: "" }],
      data_quality_notes: ["部分項目沒有參考值"],
    }),
    facts,
  );
  const report = assembleClinicianReport(resolvePlan(null, facts), facts, {
    reportDate: "2026-08-03",
    dataCutoff: null,
    labReview: check,
  });
  assert.match(report, /由輔助判讀器讀取/);
  assert.match(report, /此數值在來源中找不到/, "不可信的引用必須就地標示");
  assert.match(report, /部分項目沒有參考值/, "判讀器提到的資料品質問題要保留");
});

test("labSectionOf 只取出檢驗段落", () => {
  const text = formatPatientJson({
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      medication: { rObject: [{ drug_date: "2024-01-01", drug_ename: "METFORMIN" }] },
      labData: { rObject: [{ fee_ym: "202512", assay_item_name: "BUN", assay_value: "104" }] },
    },
  });
  const section = labSectionOf(text);
  assert.match(section, /【檢驗與檢查紀錄】/);
  assert.match(section, /BUN/);
  assert.ok(!section.includes("METFORMIN"), "不該把用藥段落也送進去");
});

test("定性結果不因為沒有數字就被判為不可信", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", order_code: "06012C", assay_item_name: "Protein(Dipstick)", assay_value: "300 (3+)", unit_data: "mg/dL", consult_value: "[(-)][(-)]" },
          { fee_ym: "202512", order_code: "06012C", assay_item_name: "O.B.", assay_value: "4+", consult_value: "[Occult blood (-)][]" },
        ],
      },
    },
  });
  const check = parseLabReview(
    JSON.stringify({
      abnormal: [
        { item: "Protein(Dipstick)", worst: "300 (3+)", unit: "mg/dL", reference: "(-)", direction: "high", why: "蛋白尿" },
        { item: "O.B.", worst: "4+", unit: "", reference: "(-)", direction: "high", why: "潛血陽性" },
      ],
    }),
    facts,
  );
  assert.equal(check.review.abnormal.length, 2);
  assert.deepEqual(check.unverifiedValues, [], "定性結果沒有數字可比，不該被標為不可信");
  assert.deepEqual(check.unknownItems, []);
});

test("兩個方向的極值分開放，兩邊都要驗證", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "BE", assay_value: "2.6", unit_data: "mmol/L", consult_value: "[-2.0][2.0]" },
          { fee_ym: "202512", assay_item_name: "BE", assay_value: "-2.8", unit_data: "mmol/L", consult_value: "[-2.0][2.0]" },
        ],
      },
    },
  });
  const ok = parseLabReview(
    JSON.stringify({ abnormal: [{ item: "BE", worst: "2.6", worst_other: "-2.8", unit: "mmol/L", reference: "-2.0-2.0", direction: "both", why: "" }] }),
    facts,
  );
  assert.deepEqual(ok.unverifiedValues, [], "兩端都在來源中，不該被標記");

  const bad = parseLabReview(
    JSON.stringify({ abnormal: [{ item: "BE", worst: "2.6", worst_other: "-99", unit: "mmol/L", reference: "-2.0-2.0", direction: "both", why: "" }] }),
    facts,
  );
  assert.equal(bad.unverifiedValues.length, 1, "另一端引用了來源沒有的數值也要抓出來");
});

// ── 成品檢查發現的 12 項缺陷，逐條鎖住 ────────────────────────

test("實測低血糖會納入低血糖處理模組，不依賴用藥申報", () => {
  // 實測案例：血糖 58 mg/dL，但用藥申報停在 超過一年前，舊邏輯整段漏掉。
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01" }] },
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "Sugar(One touch)", assay_value: "58", unit_data: "mg/dL" },
          { fee_ym: "202512", assay_item_name: "Sugar(One touch)", assay_value: "418", unit_data: "mg/dL" },
        ],
      },
    },
  });
  const plan = resolvePlan(null, facts);
  assert.ok(plan.selfCareModuleIds.includes("SC-HYPO"), "實測低血糖必須納入 SC-HYPO");
  const report = assemblePatientReport(plan, { reportDate: "2026-08-03", dataCutoff: null });
  assert.match(report, /15 公克.{0,2}醣類/, "報告要告訴病人低血糖時該怎麼做，不能只講症狀");
});

test("血鉀 3.0–3.3 這種整批偏低不會被漏掉", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      labData: {
        rObject: [3.2, 3.1, 3.4].map((v) => ({
          fee_ym: "202512",
          assay_item_name: "K",
          assay_value: String(v),
          unit_data: "mmol/L",
        })),
      },
    },
  });
  const hits = resolvePlan(null, facts).labThresholds.filter((h) => h.code === "potassium-abnormal");
  assert.equal(hits.length, 1, "低於 3.5 就是低血鉀");
  assert.match(hits[0].patientMessage, /偏低/);
});

test("腎功能不全時病人版必須說明糖化血色素可能不準", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", CKD: 1 },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "HbA1c", assay_value: "6.4", unit_data: "%" },
          { fee_ym: "202512", assay_item_name: "HB", assay_value: "8.4", unit_data: "g/dL" },
        ],
      },
    },
  });
  const report = assemblePatientReport(resolvePlan(null, facts), { reportDate: "2026-08-03", dataCutoff: null });
  assert.match(report, /這個數字對您可能不準/, "6.4% 不能被呈現成好消息");
  assert.match(report, /貧血/, "腎性貧血要出現在病人版");
});

test("PR=1 也展開完整模組，不再只給一句簡短提醒", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", PR2: PR_MODERATE, PR5: PR_MODERATE },
    rawSources: {},
  });
  const plan = resolvePlan(null, facts);
  assert.ok(plan.topicModuleIds.includes("STROKE-CORE"), "PR2=1 要帶腦血管模組");
  assert.ok(plan.topicModuleIds.includes("HEART-CORE"), "PR5=1 要帶心血管模組");

  const report = assemblePatientReport(plan, { reportDate: "2026-08-03", dataCutoff: null });
  // 只印病名等於製造焦慮又不給出路；現在給的是整個模組
  assert.ok(report.includes("腦血管"), "模組正文要真的印出來");
  assert.ok(report.includes("心臟"), "模組正文要真的印出來");
  assert.ok(!report.includes("持續留意"), "簡短提醒那一區已併入主題段落，不得殘留");
  // 併進來之後，風險預測與確診的區別只剩這一句在扛
  assert.match(report, /來自風險評估而非診斷/);
});

test("需要撥打 119 的情況排在儘速就醫之前", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", R2: 2, R4: 2, R5: 2 },
    rawSources: {},
  });
  const report = assemblePatientReport(resolvePlan(null, facts), { reportDate: "2026-08-03", dataCutoff: null });
  const block = report.slice(report.indexOf("什麼情況要立刻就醫"));
  const items = block.split("\n").filter((l) => /^\d+\. /.test(l.trim()));
  const flags = items.map((l) => /119/.test(l));
  const lastTrue = flags.lastIndexOf(true);
  const firstFalse = flags.indexOf(false);
  if (lastTrue !== -1 && firstFalse !== -1) {
    assert.ok(firstFalse > lastTrue, `119 的項目必須排在前面，實際順序：${flags.join(",")}`);
  }
});

test("數值的說明就貼在該數值下面", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "Na", assay_value: "122", unit_data: "mmol/L" },
          { fee_ym: "202512", assay_item_name: "HbA1c", assay_value: "8.1", unit_data: "%" },
        ],
      },
    },
  });
  const report = assemblePatientReport(resolvePlan(null, facts), { reportDate: "2026-08-03", dataCutoff: null });
  // 只看數值區塊；開頭的「先看這幾件事」也會出現「血鈉異常」這個短標題。
  const lines = report.slice(report.indexOf("您的其他檢驗數值")).split("\n");
  const index = lines.findIndex((l) => /^・血鈉：/.test(l.trim()));
  assert.ok(index !== -1, "應列出血鈉");
  assert.match(lines[index + 1], /血鈉/, "說明必須緊接在數值下一行");
});

test("模組教了要看哪些檢查，資料裡沒有的要講出來", () => {
  // 實測案例：判為腎臟已發生，卻只列出一個正常的肌酸酐，讀起來自相矛盾。
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", R3: 1 },
    rawSources: {
      labData: {
        rObject: [{ fee_ym: "202512", assay_item_name: "Creatinine", assay_value: "0.9", unit_data: "mg/dL" }],
      },
    },
  });
  const report = assemblePatientReport(resolvePlan(null, facts), { reportDate: "2026-08-03", dataCutoff: null });
  assert.match(report, /沒有尿液白蛋白／肌酸酐比值（UACR）、腎絲球過濾率（eGFR）的紀錄/);
});

test("已知有腎臟或心臟問題時，飲食建議不再用假設句", () => {
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-03", R3: 2, R5: 2 }, rawSources: {} });
  const report = assemblePatientReport(resolvePlan(null, facts), { reportDate: "2026-08-03", dataCutoff: null });
  assert.ok(!report.includes("若同時有腎臟或心臟問題"), "程式已經知道了，不該還寫「若」");
  assert.match(report, /您的資料顯示已有腎臟或心臟方面的狀況/);
});

test("病人版不加摘要區塊，輕重之分由數值排序表達", () => {
  // 摘要區塊只能列出「血鈉異常」這種病人看不懂又無從行動的臨床名詞，
  // 而且緊接著的資料限制說明會立刻否定它。
  const facts = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23", CKD: 1 },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "Mg", assay_value: "1.29", unit_data: "mmol/L" },
          { fee_ym: "202512", assay_item_name: "Na", assay_value: "122", unit_data: "mmol/L" },
          { fee_ym: "202512", assay_item_name: "HbA1c", assay_value: "6.4", unit_data: "%" },
          { fee_ym: "202512", assay_item_name: "HB", assay_value: "8.4", unit_data: "g/dL" },
        ],
      },
    },
  });
  const plan = resolvePlan(null, facts);
  const report = assemblePatientReport(plan, { reportDate: "2026-08-04", dataCutoff: "2026-07-23" });

  assert.ok(!report.includes("先看這幾件事"));
  assert.ok(!report.includes("詳細說明就在下面"), "導航句是廢話");

  // 帶說明的排在沒說明的前面
  const entries = plan.labNoteEntries;
  const firstWithout = entries.findIndex((e) => !e.messages.length);
  const lastWith = entries.map((e) => e.messages.length > 0).lastIndexOf(true);
  if (firstWithout !== -1 && lastWith !== -1) {
    assert.ok(lastWith < firstWithout, "有說明的數值必須排在前面");
  }

  const seen = new Map();
  for (const line of report.split("\n").map((l) => l.trim()).filter((l) => l.length > 12 && !/^[─━]+$/.test(l))) {
    seen.set(line, (seen.get(line) ?? 0) + 1);
  }
  assert.deepEqual([...seen.entries()].filter(([, n]) => n > 1), []);
});

test("醫師版每一條門檻判定都能追到出處，沒有出處的要標示出來", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", BIRTHDAY: "1950-01-01", CKD: 1, R5: 2 },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: "METFORMIN HCL" }] },
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "eGFR", assay_value: "34.6", unit_data: "ml/min/1.73m2" },
          { fee_ym: "202512", assay_item_name: "K", assay_value: "3.1", unit_data: "mmol/L" },
          { fee_ym: "202512", assay_item_name: "Sugar", assay_value: "58", unit_data: "mg/dL" },
          { fee_ym: "202512", assay_item_name: "LDL-cholesterol", assay_value: "180", unit_data: "mg/dL" },
          { fee_ym: "202512", assay_item_name: "HbA1c", assay_value: "6.4", unit_data: "%" },
          { fee_ym: "202512", assay_item_name: "HB", assay_value: "8.4", unit_data: "g/dL" },
        ],
      },
    },
  });
  const report = assembleClinicianReport(resolvePlan(null, facts), facts, {
    reportDate: "2026-08-03",
    dataCutoff: null,
  });

  assert.match(report, /來源：中華民國糖尿病學會《2022第2型糖尿病臨床照護指引》/);
  // 目標值逐條附章表與頁次
  assert.match(report, /LDL-C：.+〔.+p\.\d+〕/);
  // 低血糖門檻取自指引表一，必須帶得出頁次
  assert.match(report, /Glucose 曾出現.*屬低血糖範圍。.*〔表一 低血糖分級，p\.141〕/);
  // 指引沒有的門檻要明講，不能讓人以為每條都有依據
  assert.match(report, /K 曾出現偏低數值.+一般臨床門檻，非本指引條列/);

  // 安全提示每一行不是有出處就是有「非本指引條列」標示
  const section = report.slice(report.indexOf("需核實的檢驗結果"), report.indexOf("、檢驗結果"));
  for (const line of section.split("\n").filter((l) => /^\s+\[/.test(l))) {
    assert.ok(
      /〔.+p\.\d+〕/.test(line) || line.includes("非本指引條列"),
      `這一行既無出處也無標示：${line.trim()}`,
    );
  }
});

test("所有引用的 ruleId 都要能在規則表中解出", () => {
  // 打錯的 ruleId 不會報錯，只會讓出處靜默消失——實測就發生過
  // （hba1c 判定寫成 ckd-hba1c-unreliable，整條出處不見了也沒人發現）。
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", BIRTHDAY: "1950-01-01", CKD: 1, R2: 2, R5: 2 },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: "METFORMIN HCL" }] },
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "eGFR", assay_value: "24.1", unit_data: "ml/min/1.73m2" },
          { fee_ym: "202512", assay_item_name: "Albumin/Creatinine(Dipstick)", assay_value: "≧300 (2+)", unit_data: "mg/g" },
          { fee_ym: "202512", assay_item_name: "HbA1c", assay_value: "6.4", unit_data: "%" },
          { fee_ym: "202512", assay_item_name: "HB", assay_value: "8.4", unit_data: "g/dL" },
          { fee_ym: "202512", assay_item_name: "K", assay_value: "3.1", unit_data: "mmol/L" },
          { fee_ym: "202512", assay_item_name: "Na", assay_value: "122", unit_data: "mmol/L" },
          { fee_ym: "202512", assay_item_name: "Sugar", assay_value: "58", unit_data: "mg/dL" },
          { fee_ym: "202512", assay_item_name: "Sugar", assay_value: "418", unit_data: "mg/dL" },
          { fee_ym: "202512", assay_item_name: "LDL-cholesterol", assay_value: "180", unit_data: "mg/dL" },
        ],
      },
    },
  });
  const plan = resolvePlan(null, facts);
  const referenced = [
    ...plan.labThresholds.map((hit) => hit.ruleId),
    ...plan.targets.targets.map((item) => item.ruleId),
    ...plan.targets.safetyFlags.map((item) => item.ruleId),
  ].filter(Boolean);
  assert.ok(referenced.length >= 8, `引用的規則太少（${referenced.length}），測試資料可能沒觸發到`);
  for (const id of referenced) {
    assert.ok(RULES_BY_ID.has(id), `規則表中沒有 ${id}`);
  }
});

test("檢驗判讀器的輸入含性別與年齡，但不含用藥與生日", () => {
  // 這批資料的參考值是分層的（[≧18y]M 4-5.52 F 3.78-4.99）。
  // 不給年齡性別就選不出該用哪一段，而 prompt 又要求它選。
  // 「≧18y」要的正是年齡，不是生日——所以送年齡就夠，生日不外送。
  const text = formatPatientJson({
    userInfo: { gender: "M", birthday: "1949-03-08" },
    userInput: { REPORT_DATE: "2026-08-03", R2: 2 },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_ename: "METFORMIN HCL 500MG" }] },
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "HB", assay_value: "12.5", unit_data: "g/dL", consult_value: "[[≧18y]M 13.2-17.2 F 10.8-14.9][]" },
        ],
      },
    },
  });
  const section = labSectionOf(text);
  assert.match(section, /gender：M/, "判讀器必須知道性別，否則選不出參考值分段");
  assert.match(section, /年齡：77 歲/, "分層參考值要的是年齡");
  assert.ok(!section.includes("1949"), "生日不外送");
  assert.match(section, /【檢驗與檢查紀錄】/);
  // 用藥不進去：藥物安全連動已由規則表確定性處理，且申報用藥可能停在兩年前
  assert.ok(!section.includes("【用藥紀錄】"), "用藥段不得進入檢驗判讀器");
  assert.ok(!section.includes("METFORMIN"), "不得夾帶任何藥品名稱");
});

test("判讀器 prompt 要求依本人性別年齡選參考值分段", () => {
  assert.match(LAB_REVIEW_PROMPT, /依開頭基本資料的 gender 與 birthday/);
  assert.match(LAB_REVIEW_PROMPT, /不要兩段都列/);
  assert.match(LAB_REVIEW_PROMPT, /輸入不含用藥資料/);
});

test("判讀器 prompt 排除只反映急性事件當下狀態的項目", () => {
  // 沒有採檢日期就分不出一筆 WBC 12.73 是本月測的還是兩年前住院時測的。
  // 列出來等於把急性事件寫成目前狀態。
  assert.match(LAB_REVIEW_PROMPT, /代表\*\*持續的狀態\*\*/);
  assert.match(LAB_REVIEW_PROMPT, /白血球與白血球分類/);
  assert.match(LAB_REVIEW_PROMPT, /血液氣體與酸鹼/);
  assert.match(LAB_REVIEW_PROMPT, /誤以為是目前狀態/);
});

test("性別由 userInfo.gender 解讀，不從 SEX 代碼猜", () => {
  const male = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-08-03", SEX: 1 },
    rawSources: {},
  });
  // SEX=1 在五筆樣本裡對應 F，但那是歸納不是規格；gender 說 M 就是 M。
  assert.equal(male.sex.value, "男性");

  const unknownSex = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", SEX: 0 },
    rawSources: {},
  });
  // 沒有 gender 就是未知，不得由 SEX 推——猜錯會讓血球參考值選錯那一段。
  assert.equal(unknownSex.sex.known, false);

  const report = assembleClinicianReport(resolvePlan(null, male), male, {
    reportDate: "2026-08-03",
    dataCutoff: null,
  });
  assert.match(report, /性別：男性/);
  assert.ok(!report.includes("性別代碼"), "醫師版不該印未解讀的原始代碼");
});

test("LLM 好讀文字不含純計費欄位，但保留 order_code", () => {
  const text = formatPatientJson({
    userInfo: { gender: "M", birthday: "1949-03-08" },
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      medication: {
        rObject: [{
          icd_code: "E119", drug_date: "2024-01-01",
          drug_atc5_name: "抗糖尿病藥物", drug_ing_name: "METFORMIN HCL",
          drug_ename: "GLUCOPHAGE F.C. TABLETS 500MG", drug_code: "AC12345678",
          drug_ing_code: "9200098510", func_seq_no: "0487", fee_ym: "202401",
          drug_multi_mark: "N", drug_std_qty: "0", drug_fre: "BID", qty: 56, day: 28,
        }],
      },
      labData: {
        rObject: [{
          fee_ym: "202512", order_code: "06013C", assay_item_name: "Glucose",
          assay_value: "250 (2+)", unit_data: "mg/dL", assay_method: "NIL",
          inspect_mode: "Urine", consult_value: "[(-)][]",
        }],
      },
    },
  });

  for (const billing of ["AC12345678", "9200098510", "func_seq_no", "drug_multi_mark", "drug_std_qty", "assay_method"]) {
    assert.ok(!text.includes(billing), `純計費欄位不該進 LLM 輸入：${billing}`);
  }
  // 商品名與成分名語意重複，只留成分名
  assert.ok(!text.includes("GLUCOPHAGE"), "商品名不該保留");
  assert.match(text, /METFORMIN HCL/);
  assert.match(text, /抗糖尿病藥物/);
  assert.match(text, /drug_fre:BID/);
  // order_code 是尿液與血液唯一可靠的判別依據，砍掉會讓尿糖混進血糖
  assert.match(text, /06013C/, "order_code 必須保留");
  assert.match(text, /Urine/);
});

test("分級標籤不得暗示即時性，因為沒有一筆數值有採檢日", () => {
  const facts = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23" },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "Na", assay_value: "122", unit_data: "mmol/L" },
          { fee_ym: "202512", assay_item_name: "Sugar", assay_value: "418", unit_data: "mg/dL" },
        ],
      },
    },
  });
  const report = assembleClinicianReport(resolvePlan(null, facts), facts, {
    reportDate: "2026-08-04",
    dataCutoff: "2026-07-23",
  });
  // Na 124 可能是兩年前住院時測的，早就處理完了
  assert.ok(!report.includes("[urgent]"), "不得用 urgent 標示歷史申報數值");
  assert.ok(!report.includes("[attention]"));
  assert.match(report, /\[優先核實\]/);
  assert.match(report, /需核實的檢驗結果/);
});

test("報告產生日期與資料截至日期是兩個不同的日期", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-07-23", R2: 2 },
    rawSources: {},
  });
  const plan = resolvePlan(null, facts);
  for (const report of [
    assembleClinicianReport(plan, facts, { reportDate: "2026-08-04", dataCutoff: "2026-07-23" }),
    assemblePatientReport(plan, { reportDate: "2026-08-04", dataCutoff: "2026-07-23" }),
  ]) {
    // 兩個一樣的話，病人版「請先查看資料截至日期」那句就完全沒有資訊
    assert.match(report, /報告產生日期：2026-08-04/);
    assert.match(report, /資料截至日期：2026-07-23/);
  }
});

test("病人版的分區與排版讓一般民眾讀得下去", () => {
  const facts = extractPatientFacts({
    userInfo: { gender: "M", birthday: "1949-03-08" },
    userInput: { REPORT_DATE: "2026-07-23", DCSI: 6, R2: 2, R4: 2, R5: 2, CKD: 1, PR1: PR_HIGH },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: "METFORMIN HCL" }] },
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "eGFR", assay_value: "34.6", unit_data: "ml/min/1.73m2" },
          { fee_ym: "202512", assay_item_name: "Na", assay_value: "122", unit_data: "mmol/L" },
        ],
      },
    },
  });
  const report = assemblePatientReport(resolvePlan(null, facts), {
    reportDate: "2026-08-04",
    dataCutoff: "2026-07-23",
  });

  // 器官名是中性的，標題本身要說出這是已經有的還是要預防的
  // 已發生與預防不分區：R 來自我們看不到推導方式的來源倉儲，
  // 分區等於要病人自己想「我到底有沒有」，而那個問題我們答不了。
  assert.match(report, /【併發症風險：與您有關的健康重點】/);
  assert.ok(!report.includes("您已經有的狀況"));
  assert.ok(!report.includes("您的紀錄中已有的項目"));
  assert.ok(!report.includes("── 預防重點 ──"));
  assert.ok(!/腦血管（/.test(report), "模組標題不標示狀態");
  assert.match(report, /不確定自己是否有相關診斷/);
  // 三個層級要一眼分得出來
  assert.match(report, /^────+$/m);
  assert.match(report, /^【.+】$/m);
  assert.match(report, /^◆ 腦血管$/m);

  // 分型補充不另起「第二型糖尿病…補充」這種像章節編號的標題
  assert.ok(!/第二型糖尿病.*補充/.test(report), "分型補充要併進母模組內文，不另起標題");

  // 段落內的數值標題要帶器官名，才不會和文末的「您的其他檢驗數值」撞名
  assert.match(report, /您的腎臟相關數值：/);

  // 數值是資訊不是待辦，不能和行動項目用同一種編號
  assert.ok(!/^\d+\. 血鈉：/m.test(report), "數值清單不用數字編號");
  assert.match(report, /^・血鈉：/m);

  // 兩個「要做的事」區塊合成一個
  assert.match(report, /【預防叮嚀：日常照護】/);
  assert.ok(!report.includes("【照護重點】"));
  assert.ok(!report.includes("【每天可以做的事】"));
  // 就醫時機分兩組，不用逐條讀完才知道哪幾條該打 119
  assert.match(report, /◆ 立即撥打 119/);
  assert.match(report, /◆ 儘速就醫/);

  // 排序由資料負責人定：個人化的內容在前，模組型的通用衛教在後，就醫警訊收尾。
  // 先前相反（就醫警訊在最前），理由是它是唯一延誤會造成傷害的內容——
  // 取捨記在 assemblePatientReport 的註解裡。
  const order = ["【觀察摘要：", "【中期目標：", "【併發症風險：", "【預防叮嚀：", "什麼情況要立刻就醫"];
  const positions = order.map((label) => report.indexOf(label));
  assert.ok(
    positions.every((value, index) => value >= 0 && (index === 0 || value > positions[index - 1])),
    `六大段落順序不對：${JSON.stringify(order.map((l, i) => [l, positions[i]]))}`,
  );

  // 追蹤時程不夾帶檢查技術名稱
  assert.ok(!report.includes("單股纖維壓覺"));
  assert.ok(!report.includes("踝臂動脈"));
});

test("同一個檢驗項目不會在醫師版出現兩次", () => {
  const facts = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23" },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "Na", assay_value: "122", unit_data: "mmol/L" },
          { fee_ym: "202512", assay_item_name: "Mg", assay_value: "1.29", unit_data: "mmol/L" },
        ],
      },
    },
  });
  // 判讀器同時回報了 Na（程式已判過）與 Mg（程式沒有這個項目）
  const check = parseLabReview(
    JSON.stringify({
      abnormal: [
        { item: "Na", worst: "122", unit: "mmol/L", reference: "136-145", direction: "low", why: "" },
        { item: "Mg", worst: "1.29", unit: "mmol/L", reference: "0.78-1.11", direction: "high", why: "" },
      ],
    }),
    facts,
  );
  const report = assembleClinicianReport(resolvePlan(null, facts), facts, {
    reportDate: "2026-08-04",
    dataCutoff: null,
    labReview: check,
  });

  const section = report.slice(report.indexOf("、檢驗結果"));
  // Na 由程式依指引判定，判讀器那一段不再重複列出
  assert.equal((section.match(/^  Na：/gm) ?? []).length, 1);
  // 程式沒有的項目才由判讀器補
  assert.match(section, /^  Mg：/m);
});

test("醫師版檢驗項目一律英文縮寫在前，病人版一律中文在前", () => {
  const facts = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23", R3: 2 },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "K", assay_value: "3.1", unit_data: "mmol/L" },
          { fee_ym: "202512", assay_item_name: "eGFR", assay_value: "34.6", unit_data: "ml/min/1.73m2" },
          { fee_ym: "202512", assay_item_name: "HbA1c", assay_value: "8.1", unit_data: "%" },
        ],
      },
    },
  });
  const plan = resolvePlan(null, facts);
  const check = parseLabReview(
    JSON.stringify({
      abnormal: [{ item: "Mg", worst: "1.29", unit: "mmol/L", reference: "0.78-1.11", direction: "high", why: "" }],
    }),
    facts,
  );
  const clinician = assembleClinicianReport(plan, facts, {
    reportDate: "2026-08-04",
    dataCutoff: null,
    labReview: check,
  });
  const section = clinician.slice(clinician.indexOf("、檢驗結果"));
  // 同一節裡不得一半中文優先、一半英文優先
  const headings = ["依指引門檻表逐條判定的核心指標", "以下由輔助判讀器讀取"];
  for (const line of section.split("\n").filter((l) => /：/.test(l) && /^\s{2}\S/.test(l))) {
    if (headings.some((h) => line.includes(h)) || line.includes("⚠")) continue;
    const head = line.trim().split("：")[0];
    assert.ok(/^[A-Za-z(]/.test(head), `醫師版項目名稱應以英文起始：${head}`);
  }
  assert.match(section, /^  K：/m);
  assert.match(section, /^  Mg：/m);
  assert.ok(!section.includes("腎絲球過濾率"), "醫師版用 eGFR，不用中文全名");

  // 病人版相反：中文在前
  const patient = assemblePatientReport(plan, { reportDate: "2026-08-04", dataCutoff: null });
  assert.match(patient, /血鉀：/);
  assert.match(patient, /腎絲球過濾率（eGFR）/);
  assert.ok(!/^・K（/m.test(patient), "病人版不以英文縮寫起始");
});

test("醫師版的敘述句也用英文縮寫，不與清單相反", () => {
  const facts = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23", CKD: 1 },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: "METFORMIN HCL" }] },
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "K", assay_value: "3.1", unit_data: "mmol/L" },
          { fee_ym: "202512", assay_item_name: "Na", assay_value: "122", unit_data: "mmol/L" },
          { fee_ym: "202512", assay_item_name: "HB", assay_value: "8.4", unit_data: "g/dL" },
          { fee_ym: "202512", assay_item_name: "HbA1c", assay_value: "6.4", unit_data: "%" },
          { fee_ym: "202512", assay_item_name: "Sugar", assay_value: "418", unit_data: "mg/dL" },
        ],
      },
    },
  });
  const report = assembleClinicianReport(resolvePlan(null, facts), facts, {
    reportDate: "2026-08-04",
    dataCutoff: null,
  });
  const section = report.slice(report.indexOf("需核實的檢驗結果"), report.indexOf("、檢驗結果"));
  // 敘述句用中文、清單用英文，同一份報告兩種寫法
  for (const chinese of ["血鉀曾", "血鈉曾", "血色素曾", "糖化血色素 ", "血糖曾"]) {
    assert.ok(!section.includes(chinese), `敘述句不該用中文起頭：${chinese}`);
  }
  assert.match(section, /K 曾出現/);
  assert.match(section, /Na 曾出現/);
  assert.match(section, /Hb 曾出現/);
  assert.match(section, /HbA1c/);
  assert.match(section, /Glucose 曾出現/);
});

test("目標清單不重述指標名稱", () => {
  const facts = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23", R5: 2 },
    rawSources: {},
  });
  const report = assembleClinicianReport(resolvePlan(null, facts), facts, {
    reportDate: "2026-08-04",
    dataCutoff: null,
  });
  const section = report.slice(report.indexOf("依指引推導的個別化目標"), report.indexOf("需核實的檢驗結果"));
  // 「TG（三酸甘油酯）：三酸甘油酯目標為低於 150」——同一個名字出現三次
  for (const line of section.split("\n").filter((l) => /^\s{2}\S+：/.test(l))) {
    const [head, body] = line.trim().split("：");
    const zh = head.match(/（(.+)）/)?.[1] ?? head;
    assert.ok(!body.includes(zh), `目標值不該重述指標名稱：${line.trim()}`);
  }
  assert.match(section, /TG：低於 150 mg\/dL/);
  assert.match(section, /LDL-C：低於 70 mg\/dL/);

  // 指引原文本身不得被改寫——它是要給醫師核對的事實陳述
  const tg = GUIDELINE_RULES.find((r) => r.id === "tg-target");
  assert.equal(tg.statement, "三酸甘油酯目標為低於 150 mg/dL；達到或超過 500 mg/dL 時需藥物處理。");
});

test("醫師版有依指引的追蹤間隔，且用事實陳述與出處", () => {
  const facts = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23", R1: 2, R4: 2, CKD: 1 },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: "METFORMIN HCL" }] },
      labData: {
        rObject: [{ fee_ym: "202512", assay_item_name: "eGFR", assay_value: "34.6", unit_data: "ml/min/1.73m2" }],
      },
    },
  });
  const plan = resolvePlan(null, facts);
  const clinician = assembleClinicianReport(plan, facts, { reportDate: "2026-08-04", dataCutoff: null });
  const section = clinician.slice(clinician.indexOf("依指引的追蹤間隔"), clinician.indexOf("需核實的檢驗結果"));

  assert.ok(plan.followUp.rules.length > 0);
  // R4 神經病變 → IWGDF 第 1 類，足檢改成 6–12 個月，取代每年一次的神經評估。
  // 兩條問的是同一件事（足部感覺），並列會出現兩個互相矛盾的頻率。
  assert.match(section, /足部檢查頻率為每 6 至 12 個月一次/);
  assert.ok(!/單股纖維壓覺/.test(section), "較嚴的足檢頻率已涵蓋每年一次的神經評估，不應並列");
  // 每一條都要能追到出處
  for (const line of section.split("\n").filter((l) => /^\s{2}\S/.test(l) && !/^\s*[一二三四五六七]、/.test(l))) {
    assert.match(line, /〔.+p\.\d+〕/, `追蹤間隔缺出處：${line.trim()}`);
  }
  // eGFR 34.6 → 表二 30–44 分段。statement 自帶主詞（「每 3 個月測一次 eGFR」），不重述。
  assert.match(section, /每 3 個月測一次 eGFR/);
  assert.match(section, /表二 CKD 糖尿病人之處置，p\.199/);
  assert.ok(!/腎功能與尿液白蛋白：肌酸酐/.test(section));

  // 病人版仍是白話說法
  const patient = assemblePatientReport(plan, { reportDate: "2026-08-04", dataCutoff: null });
  assert.ok(!patient.includes("單股纖維壓覺"));
  assert.match(patient, /建議每 6 到 12 個月檢查一次腳/);
});

test("eGFR 低於 30 給的是指引的轉介建議，不是含糊的「依腎臟科評估」", () => {
  const withLabs = (rows) =>
    resolvePlan(
      null,
      extractPatientFacts({
        userInfo: { gender: "M" },
        userInput: { REPORT_DATE: "2026-07-23" },
        rawSources: { labData: { rObject: rows.map((r) => ({ fee_ym: "202512", ...r })) } },
      }),
    ).labThresholds;

  const stage4 = withLabs([{ assay_item_name: "eGFR", assay_value: "24.1", unit_data: "ml/min/1.73m2" }]);
  const referral = stage4.find((h) => h.code === "referral-nephrology");
  assert.ok(referral, "eGFR 低於 30 應給轉介建議");
  assert.match(referral.clinicianMessage, /建議轉介腎臟專科醫師/);
  assert.match(referral.citation, /p\. ?199|第 199 頁/);
  // 加密追蹤仍要出現，否則排程表沒有腎臟那一列
  assert.ok(stage4.some((h) => h.code === "kidney-intensive-followup"));

  // eGFR 45 在註 3 範圍內，不該給轉介
  const stage3 = withLabs([{ assay_item_name: "eGFR", assay_value: "45", unit_data: "ml/min/1.73m2" }]);
  assert.ok(!stage3.some((h) => h.code === "referral-nephrology"));
});

test("沒有腎臟問題時，單一電解質異常不得觸發腎臟科轉介", () => {
  // 指引那段的前提是「糖尿病人因腎臟疾病之病因不能確診時」；貧血與電解質
  // 是 DKD 情境下的附加條件，不是獨立觸發。
  const facts = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23" },
    rawSources: {
      labData: { rObject: [{ fee_ym: "202512", assay_item_name: "Na", assay_value: "128", unit_data: "mmol/L" }] },
    },
  });
  const hits = resolvePlan(null, facts).labThresholds;
  assert.ok(!hits.some((h) => h.code === "referral-nephrology"));

  // 但同時有腎臟疾病證據時就要觸發
  const withCkd = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23", CKD: 1 },
    rawSources: {
      labData: { rObject: [{ fee_ym: "202512", assay_item_name: "Na", assay_value: "128", unit_data: "mmol/L" }] },
    },
  });
  assert.ok(resolvePlan(null, withCkd).labThresholds.some((h) => h.code === "referral-nephrology"));
});

test("血糖以醫令代碼判定，名稱寫法不影響", () => {
  // 實測漏抓：一位病人有 63 筆 Glu-AC（醫令 09005C），含 20 mg/dL，
  // 但名稱正則只認 Glucose AC／空腹／飯前，整批漏掉。報告因此寫
  // 「最低 68」，而真正的最低是 20——第二級低血糖。
  const facts = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23" },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", order_code: "09005C", assay_item_name: "Glu-AC", assay_value: "20", unit_data: "mg/dL" },
          { fee_ym: "202512", order_code: "09005C", assay_item_name: "GLU_AC", assay_value: "184", unit_data: "mg/dL" },
          { fee_ym: "202512", order_code: "09140C", assay_item_name: "Glu-PC", assay_value: "208", unit_data: "mg/dL" },
          // 尿糖：醫令 06012C，不得混入
          { fee_ym: "202512", order_code: "06012C", assay_item_name: "Urine Sugar(qualitative)", assay_value: "250", unit_data: "mg/dL" },
        ],
      },
    },
  });
  const findings = extractLabFindings(facts);
  const byAnalyte = Object.fromEntries(findings.map((f) => [f.analyte, f]));

  assert.ok(byAnalyte["fasting-glucose"], "Glu-AC 應被判為飯前血糖");
  assert.equal(byAnalyte["fasting-glucose"].min, 20);
  assert.ok(byAnalyte["postprandial-glucose"], "Glu-PC 應被判為餐後血糖");
  assert.equal(byAnalyte["postprandial-glucose"].max, 208);
  assert.equal(lowestMeasuredGlucose(findings), 20);

  const plan = resolvePlan(null, facts);
  const hypo = plan.labThresholds.find((h) => h.code === "hypoglycemia");
  assert.equal(hypo.severity, "urgent", "低於 54 屬第二級低血糖");
  assert.match(hypo.clinicianMessage, /20 mg\/dL/);

  // 餐後 208 超過指引目標 160，先前沒有對應 analyte 所以從來不會被比對
  const ppg = plan.targetComparisons.find((c) => c.analyte === "postprandial-glucose");
  assert.ok(ppg?.outOfTarget);
  assert.match(ppg.clinicianMessage, /超過目標上限 160/);

  // 尿糖 250 不得被當成血糖
  for (const f of findings) {
    assert.ok(!/urine|尿/i.test(f.label), `尿液項目不該被納入：${f.label}`);
  }
  assert.ok(!findings.some((f) => f.values.some((v) => v.value === 250)));
});

test("需核實依嚴重度排序，區間敘述只列符合的數值，單位亂碼要清掉", () => {
  const facts = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23" },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: "METFORMIN HCL" }] },
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "eGFR", assay_value: "43.3", unit_data: "mL/min/1.73m︿2" },
          { fee_ym: "202512", assay_item_name: "eGFR", assay_value: "115.7", unit_data: "mL/min/1.73m︿2" },
          { fee_ym: "202512", order_code: "09005C", assay_item_name: "Glu-AC", assay_value: "20", unit_data: "mg/dL" },
        ],
      },
    },
  });
  const report = assembleClinicianReport(resolvePlan(null, facts), facts, {
    reportDate: "2026-08-04",
    dataCutoff: null,
  });
  const section = report.slice(report.indexOf("需核實的檢驗結果"), report.indexOf("、檢驗結果"));

  // 「介於 30–45（43.3–115.7）」裡的 115.7 不在區間內，讀起來自相矛盾
  assert.match(section, /介於 30–45 的數值（43\.3）/);
  assert.match(section, /低於 60 的數值（43\.3）/);

  // 嚴重度由重到輕
  const order = [...section.matchAll(/\[(優先核實|留意|參考)\]/g)].map((m) => m[1]);
  const rank = { 優先核實: 0, 留意: 1, 參考: 2 };
  assert.deepEqual(order.map((x) => rank[x]), [...order.map((x) => rank[x])].sort((a, b) => a - b));

  // 來源單位的上標亂碼要清掉
  assert.ok(!report.includes("m︿2"));
  assert.match(report, /1\.73m²/);
});

test("完全沒有 HbA1c 紀錄時，指出缺檢而不是談它可不可信", () => {
  const facts = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23", CKD: 1 },
    rawSources: {
      labData: { rObject: [{ fee_ym: "202512", assay_item_name: "Cr", assay_value: "1.8", unit_data: "mg/dL" }] },
    },
  });
  const plan = resolvePlan(null, facts);
  assert.ok(plan.labThresholds.some((h) => h.code === "hba1c-missing"));

  const report = assembleClinicianReport(plan, facts, { reportDate: "2026-08-04", dataCutoff: null });
  assert.match(report, /資料中沒有糖化血色素紀錄/);
  // 沒有 HbA1c 卻說它「可能無法代表平均血糖」沒有意義
  assert.ok(!report.includes("糖化血色素可能無法代表平均血糖"));

  const patient = assemblePatientReport(plan, { reportDate: "2026-08-04", dataCutoff: null });
  assert.match(patient, /沒有糖化血色素（HbA1c）的紀錄/);
});

test("同名但檢體不同的項目要標出尿液，血液那筆不得誤標", () => {
  // RBC 同時存在於血液與尿液。判讀器只拿到項目名稱，分不出來；
  // 程式從醫令代碼分得出來，但只比名稱會把血液那筆也標成尿液。
  const facts = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23" },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", order_code: "08011C", assay_item_name: "RBC", assay_value: "2.95", unit_data: "x10^6/ul" },
          { fee_ym: "202512", order_code: "06012C", assay_item_name: "RBC", assay_value: "＞1000", unit_data: "/uL" },
          { fee_ym: "202512", order_code: "06012C", assay_item_name: "Protein", assay_value: "2+", unit_data: "NIL" },
        ],
      },
    },
  });
  const check = parseLabReview(
    JSON.stringify({
      abnormal: [
        { item: "RBC", worst: "2.95", unit: "x10^6/ul", reference: "4.5-5.7", direction: "low", why: "" },
        { item: "RBC", worst: "＞1000", unit: "/uL", reference: "＜17", direction: "high", why: "" },
        { item: "Protein", worst: "2+", unit: "", reference: "Negative", direction: "high", why: "" },
      ],
    }),
    facts,
  );
  const names = check.review.abnormal.map((a) => a.item);
  assert.deepEqual(names, ["RBC", "RBC（尿液）", "Protein（尿液）"]);
});

test("選模組輸出要抄回年齡與 DCSI，供核對是不是同一位病人", () => {
  // 輸出檔沒有病人識別碼是刻意的，代價是放錯資料夾不會有任何症狀——
  // 實測就發生過兩位病人的輸出對調，是靠肉眼讀出「病程 1.6 年」對不上才發現。
  assert.match(DATA_AUDIT_PROMPT, /"echo".*age_years.*dcsi/s);

  const parsed = parseDataAudit(
    JSON.stringify({ echo: { age_years: 75, dcsi: 6 }, priorities: [], clinician_notes: [], data_concerns: [], disagreements: [] }),
  );
  assert.deepEqual(parsed.echo, { ageYears: 75, dcsi: 6 });

  // 舊格式沒有 echo，要能解析但標為無法核對
  const legacy = parseDataAudit(JSON.stringify({ priorities: [] }));
  assert.equal(legacy.echo, null);
});

test("目標比對的說明也要貼在對應數值下面，不得掉成孤兒", () => {
  // 說明有兩個來源：門檻判定與目標比對。先前只配對前者，
  // 「飯前血糖 20–315」底下沒有說明，說明卻掉到區塊最後。
  const facts = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23" },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", order_code: "09005C", assay_item_name: "Glu-AC", assay_value: "315", unit_data: "mg/dL" },
          { fee_ym: "202512", order_code: "09140C", assay_item_name: "Glu-PC", assay_value: "208", unit_data: "mg/dL" },
        ],
      },
    },
  });
  const plan = resolvePlan(null, facts);
  for (const analyte of ["fasting-glucose", "postprandial-glucose"]) {
    const entry = plan.labNoteEntries.find((e) => e.text.includes(analyte === "fasting-glucose" ? "飯前血糖" : "餐後血糖"));
    assert.ok(entry, `${analyte} 應出現在數值清單`);
    assert.ok(entry.messages.length > 0, `${analyte} 的說明必須貼在它下面`);
  }

  const report = assemblePatientReport(plan, { reportDate: "2026-08-04", dataCutoff: null });
  const lines = report.slice(report.indexOf("您的其他檢驗數值")).split("\n");
  const index = lines.findIndex((l) => /^・飯前血糖：/.test(l.trim()));
  assert.match(lines[index + 1], /飯前血糖/, "說明必須緊接在數值下一行");
});

test("病人版檢驗敘述：數值逐一比對來源，禁止事項會被標記", () => {
  const facts = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23" },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", order_code: "09005C", assay_item_name: "Glu-AC", assay_value: "315", unit_data: "mg/dL" },
          { fee_ym: "202512", assay_item_name: "HB", assay_value: "8.4", unit_data: "g/dL" },
        ],
      },
    },
  });

  const clean = parseLabNarrative(
    JSON.stringify({
      narrative: "您的飯前血糖出現過 315 mg/dL，高於一般目標 80–130 mg/dL。血色素 8.4 g/dL 低於一般範圍。",
      cited_values: [
        { item: "Glu-AC", value: "315" },
        { item: "HB", value: "8.4" },
      ],
    }),
    facts,
  );
  assert.deepEqual(clean.unverifiedValues, []);
  // 80 與 130 是指引門檻表裡的目標值，不是病人數值，但也不是模型自己編的
  assert.deepEqual(clean.uncitedNumbers, []);
  assert.deepEqual(clean.bannedPhrases, []);

  const dirty = parseLabNarrative(
    JSON.stringify({
      narrative:
        "您最近一次的血糖是 999 mg/dL，比上次惡化。建議您調整藥物劑量。另外血鉀 4.2 mmol/L。",
      cited_values: [{ item: "Glu-AC", value: "999" }],
    }),
    facts,
  );
  assert.equal(dirty.unverifiedValues.length, 1, "999 不在來源中");
  assert.deepEqual(dirty.uncitedNumbers, ["4.2"], "文中出現但沒列進引用清單");
  assert.ok(dirty.bannedPhrases.includes("聲稱時序或趨勢"));
  assert.ok(dirty.bannedPhrases.includes("處置建議"));

  const rendered = formatLabNarrative(dirty).join("\n");
  assert.match(rendered, /⚠ 這一段未通過自動檢查/);
  // 檢查不改寫文字——判定是它的職責
  assert.ok(rendered.includes("您最近一次的血糖是 999 mg/dL"));
});

test("有檢驗敘述時，草稿橫幅要標示它未經逐句核准", () => {
  const facts = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23", R2: 2 },
    rawSources: {},
  });
  const plan = resolvePlan(null, facts);
  const narrative = parseLabNarrative(JSON.stringify({ narrative: "測試段落。", cited_values: [] }), facts);

  const withNarrative = assemblePatientReport(plan, {
    reportDate: "2026-08-04",
    dataCutoff: null,
    labNarrative: narrative,
  });
  assert.match(withNarrative, /由模型直接撰寫，未經醫療團隊逐句核准/);
  assert.match(withNarrative, /【觀察摘要：您的檢驗數值】/);

  // 沒有敘述時退回程式組出的固定句型
  const without = assemblePatientReport(plan, { reportDate: "2026-08-04", dataCutoff: null });
  assert.ok(!without.includes("由模型直接撰寫"));
});

test("有 LLM 敘述時，檢驗相關內容全部集中在敘述段", () => {
  // 同一個 eGFR 在腎臟段落與檢驗敘述各講一次，是兩種語氣講同一件事。
  // 缺檢也一樣——程式把候選清單餵給敘述器，由它核對後寫進同一段，
  // 器官段落不再另外印一行。
  const facts = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23", R3: 2 },
    rawSources: {
      labData: {
        rObject: [{ fee_ym: "202512", assay_item_name: "eGFR", assay_value: "43.3", unit_data: "ml/min/1.73m2" }],
      },
    },
  });
  const plan = resolvePlan(null, facts);
  const opts = { reportDate: "2026-08-04", dataCutoff: null };

  const without = assemblePatientReport(plan, opts);
  assert.match(without, /您的腎臟相關數值：/, "沒有敘述時仍要嵌入數值");

  const withNarrative = assemblePatientReport(plan, {
    ...opts,
    labNarrative: parseLabNarrative(
      JSON.stringify({ narrative: "腎臟方面，腎絲球過濾率出現過 43.3。", cited_values: [{ item: "eGFR", value: "43.3" }] }),
      facts,
    ),
  });
  assert.ok(!withNarrative.includes("您的腎臟相關數值："), "有敘述時不再嵌入，避免同一個數值講兩次");
  assert.ok(!withNarrative.includes("回診時可以確認是否需要安排。"), "缺檢也交給敘述器，不在器官段落另外印");
  assert.equal((withNarrative.match(/43\.3/g) ?? []).length, 1, "同一個數值只該出現一次");
});

test("敘述器要被要求指出完全沒有紀錄的核心指標", () => {
  // 清單是待核對的假設不是事實——程式的名稱比對曾整批漏抓
  assert.match(LAB_NARRATIVE_PROMPT, /待你核對的假設，不是事實/);
  assert.match(LAB_NARRATIVE_PROMPT, /found_after_all/);
});

test("敘述器回報「程式說沒有但其實有」時要被標記為程式的漏", () => {
  const facts = extractPatientFacts({
    userInfo: { gender: "M" },
    userInput: { REPORT_DATE: "2026-07-23" },
    rawSources: {
      labData: { rObject: [{ fee_ym: "202512", assay_item_name: "HbA1c 醣化血色素", assay_value: "8.1", unit_data: "%" }] },
    },
  });
  const check = parseLabNarrative(
    JSON.stringify({
      narrative: "糖化血色素 8.1%。",
      cited_values: [{ item: "HbA1c 醣化血色素", value: "8.1" }],
      found_after_all: [{ item: "糖化血色素（HbA1c）", as: "HbA1c 醣化血色素" }],
    }),
    facts,
  );
  assert.equal(check.foundAfterAll.length, 1);
  const rendered = formatLabNarrative(check).join("\n");
  assert.match(rendered, /程式判定為缺檢但實際存在/);
  assert.match(rendered, /項目名稱比對有漏，需修正/);
});

test("PR 極性依來源方確認：0 日常維持、1 適度介入、2 積極照護", () => {
  assert.equal(PR_LOW, 0);
  assert.equal(PR_MODERATE, 1);
  assert.equal(PR_HIGH, 2);

  const withPr = (value) =>
    decideTopics(
      extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-03", [`PR1`]: value }, rawSources: {} }),
    ).find((item) => item.topic === 1).kind;
  assert.equal(withPr(2), "prevention-active", "PR=2 積極照護，給完整模組");
  assert.equal(withPr(1), "prevention-moderate", "PR=1 適度介入，只給簡短提醒");
  assert.equal(withPr(0), "excluded", "PR=0 日常維持，不納入");
});

test("生病日衛教依藥物類別觸發，並轉成「事先確認」而非叫病人停藥", () => {
  const withDrug = (ing) =>
    extractPatientFacts({
      userInfo: { gender: "M" },
      userInput: { REPORT_DATE: "2026-07-23" },
      rawSources: {
        medication: {
          rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: ing }],
        },
      },
    });

  // 50 歲、無併發症的 SGLT2i 使用者：先前完全拿不到生病日衛教
  const sglt2 = resolvePlan(null, withDrug("DAPAGLIFLOZIN"));
  assert.ok(sglt2.selfCareModuleIds.includes("SC-SICKDAY"));
  const report = assemblePatientReport(sglt2, { reportDate: "2026-08-04", dataCutoff: null });
  assert.match(report, /哪幾種要停、什麼情況停、什麼時候恢復/, "轉成事先確認，不叫病人自行停藥");
  assert.ok(!/請停用|建議停用/.test(report), "不得叫病人停藥");
  assert.match(report, /即使血糖不高也可能發生酮酸中毒/, "SGLT2i 最重要的安全訊息");
  assert.match(report, /泌尿道或生殖器感染/);

  // 變體插入條目後編號要重排，不能出現 1, 2, 2, 3
  const numbers = [...report.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]));
  const sickday = report.slice(report.indexOf("生病或使用類固醇期間"));
  const seq = [...sickday.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1])).slice(0, 6);
  assert.deepEqual(seq, [1, 2, 3, 4, 5, 6]);
  assert.ok(numbers.length > 0);

  // 只用 metformin 的人要拿到暫停提醒，但不該拿到 SGLT2i 專屬內容
  const metformin = assemblePatientReport(resolvePlan(null, withDrug("METFORMIN HCL")), {
    reportDate: "2026-08-04",
    dataCutoff: null,
  });
  assert.match(metformin, /哪幾種要停/);
  assert.ok(!metformin.includes("酮酸中毒"), "非 SGLT2i 使用者不該看到那一段");
});

test("輸入估算要涵蓋三次呼叫，不能只算資料稽核那一次", () => {
  const input = buildRunInput({
    selectorPrompt: "S".repeat(100),
    factsText: "F".repeat(200),
    labReviewPrompt: "R".repeat(300),
    labText: "L".repeat(400),
    narrativePrompt: "N".repeat(500),
    narrativeText: "T".repeat(600),
  });
  assert.equal(input.parts.length, 6, "三次呼叫各兩段");
  assert.equal(input.totalChars, 100 + 200 + 300 + 400 + 500 + 600);
  // 每一段都要標出是哪一次呼叫，否則看不出成本花在哪
  assert.ok(input.parts.every((p) => /^[①②③]/.test(p.label)));
});

test("內容庫的中文標籤要蓋住所有實際出現的代碼，不得漏成生英文", () => {
  for (const item of EDUCATION_MODULES) {
    assert.ok(TOPIC_LABEL[item.topic], `主題代碼 ${item.topic} 沒有中文標籤`);
    assert.ok(TYPE_GATE_LABEL[item.typeGate], `型別條件 ${item.typeGate} 沒有中文標籤`);
  }
  for (const item of SELF_CARE_MODULES) {
    assert.ok(BEHAVIOR_LABEL[item.behavior], `自我照護行為 ${item.behavior} 沒有中文標籤`);
    for (const variant of item.definiteVariants ?? []) {
      assert.ok(VARIANT_WHEN_LABEL[variant.when], `替換條件 ${variant.when} 沒有中文標籤`);
    }
  }
  for (const rule of GUIDELINE_RULES) {
    assert.ok(CATEGORY_LABEL[rule.category], `規則類別 ${rule.category} 沒有中文標籤`);
  }
});

test("內容庫的顯示順序不得漏掉任何一組規則", () => {
  // CATEGORY_ORDER 只管順序。漏列一個類別就是整組規則從畫面上消失，
  // 而審閱的人看不出少了什麼——所以順序表必須蓋滿實際用到的類別。
  const used = new Set(GUIDELINE_RULES.map((rule) => rule.category));
  const missing = [...used].filter((category) => !CATEGORY_ORDER.includes(category));
  assert.deepEqual(missing, [], `這些類別沒排進顯示順序：${missing.join("、")}`);

  const covered = GUIDELINE_RULES.filter((rule) => CATEGORY_ORDER.includes(rule.category));
  assert.equal(covered.length, GUIDELINE_RULES.length, "有規則不會被顯示");
});

test("三份固定內容都標了版本，且未核准前不得標成已核准", () => {
  for (const version of [MODULE_CATALOG_VERSION, SELF_CARE_VERSION, RULES_VERSION]) {
    assert.match(version, /\S/, "版本字串不得為空");
  }
  // 目前三份都還沒送審通過。哪天真的核准了，這裡要一起改，才不會悄悄變成「已核准」。
  assert.equal(MODULE_CATALOG_APPROVED, false);
  assert.equal(SELF_CARE_APPROVED, false);
  assert.equal(RULES_APPROVED, false);
});

test("判定路徑：每一種判定結果都要有標籤，不得空白", () => {
  // 主題那一列的結果欄若沒有標籤就是一片空白，看起來像程式沒判到，
  // 而實際上是判了但顯示不出來——這比顯示錯的更難察覺。
  const facts = extractPatientFacts({
    userInput: {
      REPORT_DATE: "2026-08-03",
      R3: 2,
      R5: 1,
      PR1: PR_HIGH,
      PR4: PR_MODERATE,
      PR6: PR_LOW,
    },
    rawSources: {},
  });
  const decisions = decideTopics(facts);

  // 這份 fixture 要涵蓋全部四種結果，否則測不到漏標籤
  assert.deepEqual(
    [...new Set(decisions.map((item) => item.kind))].sort(),
    ["established", "excluded", "prevention-active", "prevention-moderate"],
  );
  for (const decision of decisions) {
    assert.ok(TRACE_KIND_LABEL[decision.kind], `判定結果 ${decision.kind} 沒有標籤`);
    assert.ok(TRACE_KIND_CLASS[decision.kind], `判定結果 ${decision.kind} 沒有樣式`);
  }

  // 門檻判定的嚴重度同理。增加種類時這裡要一起改。
  assert.deepEqual(Object.keys(TRACE_SEVERITY_LABEL).sort(), ["attention", "info", "urgent"]);
  for (const hit of resolvePlan(null, facts).labThresholds) {
    assert.ok(TRACE_SEVERITY_LABEL[hit.severity], `嚴重度 ${hit.severity} 沒有標籤`);
  }
});

test("申報診斷碼出現慢性腎臟病時，即使 CKD 欄位為 0、R3 缺值也要帶腎臟模組", () => {
  // DCSI 只認診斷碼，而診斷碼只出現在有開藥的就診——R3 漏掉腎病變是常態，
  // 所以診斷碼要能獨立把腎臟主題救回來。
  const withKidneyIcd = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", CKD: 0, PR3: PR_LOW },
    rawSources: {
      medication: {
        rObject: [{ drug_date: "2026-01-10", icd_code: "E1121", icd_cname: "糖尿病腎病變", drug_ing_name: "METFORMIN HCL" }],
      },
    },
  });
  assert.deepEqual(withKidneyIcd.ckdIcdCodes, ["E1121"]);
  const kidney = resolvePlan(null, withKidneyIcd).decisions.find((item) => item.topic === 3);
  assert.equal(kidney.kind, "established");
  assert.match(kidney.reason, /申報診斷碼出現慢性腎臟病/);

  // 沒有腎臟診斷碼就不得無中生有：PR3=0 仍然不納入
  const withoutKidneyIcd = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", CKD: 0, PR3: PR_LOW },
    rawSources: {
      medication: { rObject: [{ drug_date: "2026-01-10", icd_code: "E119", icd_cname: "第2型糖尿病", drug_ing_name: "METFORMIN HCL" }] },
    },
  });
  assert.deepEqual(withoutKidneyIcd.ckdIcdCodes, []);
  assert.equal(resolvePlan(null, withoutKidneyIcd).decisions.find((item) => item.topic === 3).kind, "excluded");
});

test("急性腎損傷不算慢性腎臟病", () => {
  // N17 是急性事件。拿它當 CKD 會對一次住院急性腎損傷的人說他有慢性腎臟病。
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", CKD: 0, PR3: PR_LOW },
    rawSources: {
      medication: { rObject: [{ drug_date: "2026-01-10", icd_code: "N179", icd_cname: "急性腎衰竭", drug_ing_name: "METFORMIN HCL" }] },
    },
  });
  assert.deepEqual(facts.ckdIcdCodes, []);
  assert.equal(resolvePlan(null, facts).decisions.find((item) => item.topic === 3).kind, "excluded");
});

test("納入與不納入的分界只剩 PR=0 與兩者皆缺", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", R2: 1, R5: 2, PR1: PR_HIGH, PR4: PR_MODERATE, PR6: PR_LOW },
    rawSources: {},
  });
  const byTopic = new Map(resolvePlan(null, facts).decisions.map((item) => [item.topic, item.kind]));
  assert.equal(byTopic.get(2), "established");        // R=1
  assert.equal(byTopic.get(5), "established");        // R=2
  assert.equal(byTopic.get(1), "prevention-active");  // PR=2
  assert.equal(byTopic.get(4), "prevention-moderate");// PR=1
  assert.equal(byTopic.get(6), "excluded");           // PR=0
  assert.equal(byTopic.get(3), "excluded");           // R 與 PR 皆缺

  // 前四項都要真的帶到模組
  const plan = resolvePlan(null, facts);
  for (const id of ["STROKE-CORE", "HEART-CORE", "EYE-CORE", "NERVE-CORE"]) {
    assert.ok(plan.topicModuleIds.includes(id), `${id} 應納入`);
  }
  assert.ok(!plan.topicModuleIds.includes("LEG-CIRCULATION-CORE"), "PR6=0 不得納入");
  assert.ok(!plan.topicModuleIds.includes("KIDNEY-CORE"), "R3／PR3 皆缺不得納入");
});

test("間歇性的 400 會重試，金鑰錯的 400 不會", () => {
  // Gemini 對同一份輸入會間歇性回這個 400，重送就會過。
  const transient = describeGeminiFailure({
    status: 400,
    apiMessage: "Request contains an invalid argument.",
  });
  assert.equal(transient.retryable, true);
  assert.match(transient.raw, /invalid argument/i);

  // 金鑰錯同樣是 400，但重送幾次都一樣，重試只是拖時間
  const badKey = describeGeminiFailure({ status: 400, apiMessage: "API key not valid. Please pass a valid API key." });
  assert.equal(badKey.retryable, false);

  assert.equal(describeGeminiFailure({ status: 429, apiMessage: "quota" }).retryable, true);
  assert.equal(describeGeminiFailure({ status: 503, apiMessage: "overloaded" }).retryable, true);
  assert.equal(describeGeminiFailure({ status: 404, apiMessage: "model not found" }).retryable, false);
  // 使用者主動中止不是失敗，更不該重試
  assert.equal(describeGeminiFailure({ cause: Object.assign(new Error("x"), { name: "AbortError" }) }).retryable, false);
});

test("原始碼切片切得出完整函式，切不到時明說", async () => {
  const source = await readFile(new URL("../app/lib/lab-narrative.ts", import.meta.url), "utf8");

  const parsed = extractSymbol(source, "parseLabNarrative");
  assert.ok(parsed, "應該切得到 parseLabNarrative");
  assert.match(parsed, /export function parseLabNarrative/);
  // 大括號要收平，否則畫面上會看到半截函式
  assert.equal((parsed.match(/\{/g) ?? []).length, (parsed.match(/\}/g) ?? []).length);
  // 宣告上方的說明要一起帶出來——「為什麼這樣寫」通常寫在那裡
  assert.ok(parsed.trimStart().startsWith("/") || /^\s*(export )?function/.test(parsed));

  assert.equal(extractSymbol(source, "根本不存在的函式"), null);
  // 切不到要留下痕跡，不能靜默略過
  assert.match(extractSymbols(source, ["根本不存在的函式"], "lab-narrative.ts"), /找不到/);
});

test("肌酸酐以醫令代碼判定，六種名稱寫法都算，同醫令下的 eGFR 與抗藥菌篩檢不算", () => {
  const lab = (order, name, value, unit = "mg/dL") => ({
    fee_ym: "202601",
    order_code: order,
    order_name: order === "09015C" ? "肌酸酐、血" : "其他",
    assay_item_name: name,
    assay_value: value,
    unit_data: unit,
  });
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      labData: {
        rObject: [
          // 實測出現過的六種寫法，全部都是血清肌酸酐
          lab("09015C", "CRE", "1.10"),
          lab("09015C", "CRE(肌酸酐)", "1.20"),
          lab("09015C", "CREA", "1.30"),
          lab("09015C", "Creatinine", "1.40"),
          lab("09015C", "Creatinine(B)", "1.50"),
          lab("09015C", "Creatinine 肌酸酐", "1.60"),
          // 同一個醫令底下的 eGFR 是另一個指標，不得混進肌酸酐
          lab("09015C", "eGFR(CKD-EPI)", "55", "無"),
          // 尿液試紙不是血清肌酸酐
          lab("06012C", "Creatinine(Dipstick)", "50"),
          // 抗藥菌培養，跟腎功能無關——名稱放寬後正好會咬到它
          lab("13007C", "CRE screening", "1"),
        ],
      },
    },
  });

  const findings = extractLabFindings(facts);
  const creatinine = findings.find((item) => item.analyte === "creatinine");
  assert.ok(creatinine, "六種寫法都要被認出來");
  assert.equal(creatinine.values.length, 6, "六筆全收，一筆都不能漏");
  assert.equal(creatinine.min, 1.1);
  assert.equal(creatinine.max, 1.6);

  // eGFR 要落在自己的分類，不能被肌酸酐吃掉
  assert.ok(findings.find((item) => item.analyte === "eGFR"), "eGFR 要獨立成項");

  // 缺檢判定：有紀錄就不該再說「沒有肌酸酐紀錄」
  assert.equal(analyteForItemName("CRE", "mg/dL"), "creatinine");
  assert.equal(analyteForItemName("Creatinine(B)", "mg/dL"), "creatinine");
  assert.equal(analyteForItemName("CRE screening"), null, "抗藥菌篩檢不是肌酸酐");
  assert.notEqual(analyteForItemName("eGFR(MDRD)"), "creatinine");
});

test("病人版涵蓋健保署要求的五大核心面向", () => {
  // 115 年度智能衛教生成模組案要求五個面向都要有。章節標題直接對齊規格用語，
  // 評審逐條對照時不必猜哪一段算哪一項。
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", R1: 2, R3: 1, PR5: PR_MODERATE, SEX: 1, DCSI: 3 },
    rawSources: T2,
  });
  const report = assemblePatientReport(resolvePlan(null, facts), {
    reportDate: "2026-08-03",
    dataCutoff: "2026-08-03",
  });

  assert.match(report, /【觀察摘要：/, "(1) 觀察摘要");
  assert.match(report, /【中期目標：/, "(3) 中期目標");
  assert.match(report, /【併發症風險：/, "(4) 併發症風險");
  assert.match(report, /【預防叮嚀：/, "(5) 預防叮嚀");

  // 中期目標要真的有數字，不能只有標題
  const goals = report.slice(report.indexOf("【中期目標："));
  assert.match(goals, /◆ .+：.+\d/, "中期目標必須列出實際的目標值");
  assert.match(goals, /中華民國糖尿病學會指引/, "要標明目標的來源");
  // 頁碼不進病人版：那會變成追溯不到的裸數字，而且要回查的是醫師
  assert.doesNotMatch(goals.split("【")[1] ?? "", /p\.\d+/);
});

test("目標的病人版用語不得改動數字", () => {
  // patientStatement 只換措辭。數字改掉就是改臨床內容，而那要走送審。
  for (const rule of GUIDELINE_RULES) {
    if (!rule.patientStatement) continue;
    const numbersIn = (text) => (text.match(/\d+(?:\.\d+)?/g) ?? []).join(",");
    const inStatement = new Set((rule.statement.match(/\d+(?:\.\d+)?/g) ?? []));
    for (const n of (rule.patientStatement.match(/\d+(?:\.\d+)?/g) ?? [])) {
      assert.ok(inStatement.has(n), `${rule.id} 的病人版出現 statement 沒有的數字 ${n}（${numbersIn(rule.patientStatement)}）`);
    }
  }
});

test("替換句的原句必須真的存在於模組正文中", () => {
  // definiteVariants 用字串比對做替換。正文改了而 from 沒跟著改，替換就靜默失效——
  // 病人會讀到「若同時有腎臟或心臟問題」，而程式明明已經知道他有。
  for (const item of SELF_CARE_MODULES) {
    for (const variant of item.definiteVariants ?? []) {
      assert.ok(
        item.patientText.includes(variant.from),
        `${item.id} 的替換原句已不在正文中，替換會靜默失效：${variant.from}`,
      );
    }
  }
});

test("檢驗證據本身就能把腎臟主題救回來", () => {
  // DCSI 的腎臟分項純靠診斷碼算，而診斷碼只出現在有開藥的就診。實測有病人
  // eGFR 最低 22.8（CKD 第 4 期）卻 R3 缺值、CKD=0、也沒有腎臟診斷碼。
  const lowEgfr = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", CKD: 0, PR3: PR_LOW },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", order_code: "09015C", assay_item_name: "eGFR", assay_value: "22.8", unit_data: "mL/min/1.73m2" },
        ],
      },
    },
  });
  const kidney = resolvePlan(null, lowEgfr).decisions.find((item) => item.topic === 3);
  assert.equal(kidney.kind, "established");
  assert.match(kidney.reason, /eGFR 曾低於 60/);

  // 巨量白蛋白尿同樣要觸發
  const macroAlbuminuria = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", CKD: 0, PR3: PR_LOW },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", order_code: "12021C", assay_item_name: "UACR", assay_value: "1501", unit_data: "mg/g" },
        ],
      },
    },
  });
  assert.match(
    resolvePlan(null, macroAlbuminuria).decisions.find((item) => item.topic === 3).reason,
    /UACR 曾達到或超過 300/,
  );

  // 腎功能正常就不得無中生有
  const normal = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03", CKD: 0, PR3: PR_LOW },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", order_code: "09015C", assay_item_name: "eGFR", assay_value: "95", unit_data: "mL/min/1.73m2" },
        ],
      },
    },
  });
  assert.equal(resolvePlan(null, normal).decisions.find((item) => item.topic === 3).kind, "excluded");
});

test("eGFR 單位裡的 1.73 不算未核實數字", () => {
  // mL/min/1.73m² 是單位，不是病人的數值。誤報會讓每一份有 eGFR 的報告都掛警語，
  // 警語多了就沒人看，真正的問題被稀釋掉。
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", order_code: "09015C", assay_item_name: "eGFR", assay_value: "45", unit_data: "mL/min/1.73m2" },
        ],
      },
    },
  });
  const check = parseLabNarrative(
    JSON.stringify({
      narrative: "腎絲球過濾率（eGFR）紀錄中曾出現 45 mL/min/1.73m²。",
      cited_values: [{ item: "eGFR", value: "45" }],
    }),
    facts,
  );
  assert.deepEqual(check.uncitedNumbers, []);
});

test("modules profile 不再跳過四項對新格式一樣有效的機械檢查", () => {
  // 這四項先前被鎖在 v14 profile——那是同事舊格式。實測 LLM 寫的中期目標
  // 曾經用 "- " 開頭的清單，而當時這項檢查是關的，等於沒人看。
  const bad = [
    "糖尿病衛教報告",
    "報告產生日期：2026/08/05",
    "【觀察摘要：您的檢驗數值】",
    "- 這一行用了破折號項目符號",
    "**這一行用了 Markdown 粗體**",
    "本次評估屬於高風險",
    "【中期目標：下一階段】",
    "【併發症風險：與您有關的健康重點】",
    "【預防叮嚀：日常照護】",
    "【什麼情況要立刻就醫】",
  ].join("\n");
  const result = validateReport({ report: bad, patientText: "", profile: "modules" });
  const failed = result.results.filter((item) => item.applicable && !item.passed).map((item) => item.id);
  for (const id of ["no-symbol-bullets", "no-markdown-emphasis", "no-risk-labels", "iso-report-date"]) {
    assert.ok(failed.includes(id), `${id} 應該要抓到`);
  }
});

test("modules profile 的必要段落檢查用的是新的六段", () => {
  const missingOne = [
    "【觀察摘要：您的檢驗數值】",
    "【中期目標：下一階段】",
    "【預防叮嚀：日常照護】",
    "【什麼情況要立刻就醫】",
  ].join("\n");
  const result = validateReport({ report: missingOne, patientText: "", profile: "modules" });
  const headings = result.results.find((item) => item.id === "required-headings");
  assert.equal(headings.applicable, true, "modules profile 必須檢查段落");
  assert.equal(headings.passed, false);
  assert.match(headings.violations.join("｜"), /併發症風險/);

  // 順序錯了也要抓到
  const wrongOrder = [
    "【併發症風險：與您有關的健康重點】",
    "【觀察摘要：您的檢驗數值】",
    "【中期目標：下一階段】",
    "【預防叮嚀：日常照護】",
    "【什麼情況要立刻就醫】",
  ].join("\n");
  const reordered = validateReport({ report: wrongOrder, patientText: "", profile: "modules" });
  assert.equal(reordered.results.find((item) => item.id === "required-headings").passed, false);
});

test("模型已把單位寫進數值時不再接第二次", () => {
  // 實測五位病人共出現 8 次「104 mg/dL mg/dL」這種重複。
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      labData: { rObject: [{ fee_ym: "202512", assay_item_name: "BUN", assay_value: "104", unit_data: "mg/dL" }] },
    },
  });
  const withUnitInside = parseLabReview(
    JSON.stringify({ abnormal: [{ item: "BUN", worst: "104 mg/dL", unit: "mg/dL", why: "偏高" }] }),
    facts,
  );
  const section = labSectionOf("");
  void section;
  const rendered = JSON.stringify(withUnitInside.review.abnormal[0]);
  assert.match(rendered, /104 mg\/dL/);

  const facts2 = facts;
  const plan = resolvePlan(null, facts2);
  const report = assembleClinicianReport(plan, facts2, {
    reportDate: "2026-08-03",
    dataCutoff: null,
    labReview: withUnitInside,
  });
  assert.doesNotMatch(report, /mg\/dL\s+mg\/dL/, "單位不得重複");
  assert.match(report, /104 mg\/dL/);
});

test("名稱與醫令碼衝突時以名稱為準：09005C 但寫「飯後血糖」算餐後", () => {
  /*
   * 真實遇過的資料：醫令開 09005C（健保的空腹血糖），但結果列的名稱與數值是
   * 「飯後血糖 102」。名稱才是這一筆實際量的東西。
   *
   * 這跟「忠實搬運」型的轉檔工具（相信申報碼、不重新詮釋）結論相反，因為
   * 用途不同：我們要拿這個值去比對「空腹血糖 80–130」的目標，貼錯標籤就是
   * 對病人講錯話。轉檔工具只負責搬，詮釋留給下游。
   *
   * 正確行為靠兩個隱含前提，兩個都容易被「順手優化」破壞，所以在這裡釘住：
   *   1. MATCHERS 陣列中，靠名稱判定的空腹／餐後排在靠醫令判定的未標示之前
   *   2. 空腹那條**不得**加上 includeOrderCodes: 09005C
   */
  const one = (name, code) =>
    extractLabFindings(
      extractPatientFacts({
        userInput: { REPORT_DATE: "2026-08-03" },
        rawSources: {
          labData: {
            rObject: [{ fee_ym: "202512", order_code: code, assay_item_name: name, assay_value: "102", unit_data: "mg/dL" }],
          },
        },
      }),
    )[0]?.analyte ?? null;

  assert.equal(one("飯後血糖", "09005C"), "postprandial-glucose", "名稱寫飯後就是飯後，不管醫令開什麼");
  assert.equal(one("Sugar PC", "09005C"), "postprandial-glucose");
  assert.equal(one("Glu-AC", "09005C"), "fasting-glucose", "兩者一致時照常判空腹");
  // 名稱看不出時機時保守處理：不因為醫令是 09005C 就硬套空腹目標
  assert.equal(one("Sugar", "09005C"), "glucose-unspecified");
  assert.equal(one("血糖", "09140C"), "glucose-unspecified");
});

test("檢體品質旗標與培養註解不算病人的檢驗值", () => {
  // 實測五位病人共 79 筆：溶血／脂血／Sample Hemolysis 與微生物培養的 COMMENT。
  // 溶血會假性升高血鉀，但資料沒有欄位把旗標連到特定結果列，也無法確認那次
  // 有沒有驗鉀——無從辨別的事就不該變成每份報告都掛的警語，直接濾掉。
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", order_code: "09021C", assay_item_name: "溶血", assay_value: "0", unit_data: "無單位" },
          { fee_ym: "202512", order_code: "09021C", assay_item_name: "脂血", assay_value: "0", unit_data: "無單位" },
          { fee_ym: "202512", order_code: "09071C", assay_item_name: "Sample Hemolysis", assay_value: "2+", unit_data: "無" },
          { fee_ym: "202512", order_code: "13007C", assay_item_name: "COMMENT", assay_value: "因分離出VRE抗藥性菌株", unit_data: "無" },
          { fee_ym: "202512", order_code: "09011C", assay_item_name: "K", assay_value: "3.4", unit_data: "mmol/L" },
        ],
      },
    },
  });
  const names = facts.labItems.map((item) => item.itemName);
  assert.deepEqual(names, ["K"], `不該留下非測量值的列：${names.join("、")}`);
  assert.equal(facts.labRecordCount, 5, "原始筆數照實回報，濾掉的是進入判定的項目");

  // 名稱裡剛好含這些字的真檢驗不得誤刪
  const kept = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", assay_item_name: "溶血性貧血篩檢", assay_value: "1.2", unit_data: "mg/dL" },
        ],
      },
    },
  });
  assert.deepEqual(kept.labItems.map((item) => item.itemName), ["溶血性貧血篩檢"]);
});

test("送進 LLM 的檢驗紀錄濾掉與糖尿病無關的類別，但核心指標一個都不能少", () => {
  const raw = {
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      labData: {
        rObject: [
          // 整碼刪：微生物與輸血
          { fee_ym: "202512", order_code: "13007C", order_name: "細菌培養", assay_item_name: "Organism 1", assay_value: "E. coli" },
          { fee_ym: "202512", order_code: "11002C", order_name: "交叉配合", assay_item_name: "Crossmatching test", assay_value: "陰性" },
          // 依名稱刪：血液氣體、白血球分類、發炎、凝血
          { fee_ym: "202512", order_code: "09041B", order_name: "血液氣體分析", assay_item_name: "PCO2", assay_value: "40", unit_data: "mmHg" },
          { fee_ym: "202512", order_code: "08013C", order_name: "白血球分類", assay_item_name: "Lymphocyte", assay_value: "30", unit_data: "%" },
          { fee_ym: "202512", order_code: "09000C", order_name: "發炎", assay_item_name: "CRP", assay_value: "8", unit_data: "mg/L" },
          // 同一個血液氣體套組裡的核心指標——整碼刪會連這些一起丟，所以必須留
          { fee_ym: "202512", order_code: "09041B", order_name: "血液氣體分析", assay_item_name: "K", assay_value: "5.6", unit_data: "mmol/L" },
          { fee_ym: "202512", order_code: "09041B", order_name: "血液氣體分析", assay_item_name: "Glucose", assay_value: "310", unit_data: "mg/dL" },
          { fee_ym: "202512", order_code: "09015C", order_name: "肌酸酐、血", assay_item_name: "Creatinine", assay_value: "2.1", unit_data: "mg/dL" },
        ],
      },
    },
  };
  const text = formatPatientJson(raw);

  for (const gone of ["Organism 1", "Crossmatching test", "PCO2", "Lymphocyte", "CRP"]) {
    assert.ok(!text.includes(gone), `${gone} 不該送進 LLM`);
  }
  for (const kept of ["K=5.6", "Glucose=310", "Creatinine=2.1"]) {
    assert.ok(text.includes(kept), `${kept} 是核心指標，必須留下`);
  }
  // 濾掉多少要講出來，不能靜默少一半資料
  assert.match(text, /5筆與糖尿病長期照護無關/);

  // 程式的門檻判定走另一條路，不受這裡影響
  const facts = extractPatientFacts(raw);
  const findings = extractLabFindings(facts);
  assert.ok(findings.some((item) => item.analyte === "potassium"));
  assert.ok(findings.some((item) => item.analyte === "creatinine"));
  assert.equal(facts.labRecordCount, 8, "程式端仍看得到全部原始筆數");
});

test("未過濾版本可以取得，供頁面對照濾前濾後", () => {
  // 只給「濾後」而不給「濾前」，沒有人能判斷濾掉的是不是不該濾的。
  const raw = {
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "202512", order_code: "13007C", order_name: "細菌培養", assay_item_name: "Organism 1", assay_value: "E. coli" },
          { fee_ym: "202512", order_code: "09015C", order_name: "肌酸酐、血", assay_item_name: "Creatinine", assay_value: "2.1", unit_data: "mg/dL" },
        ],
      },
    },
  };
  const filtered = formatPatientJson(raw);
  const full = formatPatientJson(raw, { skipIrrelevantLabs: false });

  assert.ok(!filtered.includes("Organism 1"), "預設要濾掉");
  assert.ok(full.includes("Organism 1"), "未過濾版要看得到濾掉了什麼");
  for (const text of [filtered, full]) assert.ok(text.includes("Creatinine=2.1"), "核心指標兩份都要有");
  assert.ok(full.length > filtered.length);
});

// ── 外部審查回報的三個錯誤：逐筆核對、UACR 單位、metformin 歸屬 ──────────

test("數值核對是逐項配對，不是整份比對", () => {
  // 審查重現的案例：來源有 HbA1c 8.4 與 Glu-AC 315，模型把 315 掛到 HbA1c 上。
  // 舊版只檢查「315 有沒有出現在來源某處」，於是整份放行。
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: {
      labData: {
        rObject: [
          { order_code: "09006C", assay_item_name: "HbA1c", assay_value: "8.4", fee_ym: "11406" },
          { order_code: "09005C", assay_item_name: "Glu-AC", assay_value: "315", fee_ym: "11406" },
        ],
      },
    },
  });
  const parse = (narrative, cited) => parseLabNarrative(JSON.stringify({ narrative, cited_values: cited }), facts);

  const bad = parse("您的糖化血色素為 315 %，偏高。", [{ item: "HbA1c", value: "315" }]);
  assert.deepEqual(bad.unverifiedValues.map((item) => `${item.item}=${item.value}`), ["HbA1c=315"]);

  const good = parse("您的糖化血色素 8.4 %，飯前血糖 315 mg/dL。", [
    { item: "HbA1c", value: "8.4" },
    { item: "Glu-AC", value: "315" },
  ]);
  assert.deepEqual(good.unverifiedValues, []);
});

test("UACR 必須是比值（mg/g），濃度（mg/L）不得當成 UACR", () => {
  // 尿液微量白蛋白濃度與 UACR 差一個肌酸酐分母，數字接近但意義不同。
  // 把 350 mg/L 讀成 UACR 350 會直接把病人推進「巨量蛋白尿」。
  const of = (name, value, unit) => extractLabFindings(extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-03" },
    rawSources: { labData: { rObject: [{ order_code: "12021C", assay_item_name: name, assay_value: value, unit_data: unit, fee_ym: "11406" }] } },
  })).find((item) => item.analyte === "UACR");

  assert.equal(of("尿液微量白蛋白", "350", "mg/L"), undefined);
  assert.equal(of("Albumin/Creatinine Ratio", "350", "mg/g")?.max, 350);
});

test("metformin 的腎功能提示只在真的用 metformin 時觸發", () => {
  // 舊版比對的是「抗糖尿病藥物」這個 ATC 分類，於是只打胰島素的病人
  // 也會收到 metformin 的劑量提醒。
  const hits = (ing) => {
    const facts = extractPatientFacts({
      userInput: { REPORT_DATE: "2026-08-03" },
      rawSources: {
        medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_atc5_name: "抗糖尿病藥物", drug_ing_name: ing }] },
        labData: { rObject: [{ order_code: "12015C", assay_item_name: "eGFR", assay_value: "25", fee_ym: "11406" }] },
      },
    });
    return evaluateThresholds(extractLabFindings(facts), facts).some((hit) => /metformin/i.test(hit.clinicianMessage));
  };

  assert.equal(hits("INSULIN GLARGINE"), false);
  assert.equal(hits("DAPAGLIFLOZIN"), false);
  assert.equal(hits("METFORMIN HCL"), true);
});

test("只由檢驗值救回的腎臟主題列為需確認，不是已發生", () => {
  // 指引要求先排除非糖尿病引起的腎臟病（p.197 六項情形），申報資料判定不了。
  // 衛教內容照納入，但醫師版不能用一筆無日期的 eGFR 下確診。
  const of = (raw) => {
    const facts = extractPatientFacts(raw);
    const plan = resolvePlan(null, facts);
    const decision = plan.decisions.find((item) => item.topic === 3);
    const report = assembleClinicianReport(plan, facts, { reportDate: "2026-08-06", dataCutoff: null });
    return { decision, line: report.split("\n").find((line) => line.includes("腎臟病變")) ?? "" };
  };

  const lab = of({
    userInput: { REPORT_DATE: "2026-08-06" },
    rawSources: { labData: { rObject: [{ order_code: "12015C", assay_item_name: "eGFR", assay_value: "42", fee_ym: "11406" }] } },
  });
  assert.equal(lab.decision.kind, "established", "衛教內容仍要納入");
  assert.equal(lab.decision.provisional, true);
  assert.match(lab.line, /需確認/);
  assert.doesNotMatch(lab.line, /已發生/);

  // 有申報診斷碼就是既有診斷宣告，不需要我們自己從數值推持續性。
  const icd = of({
    userInput: { REPORT_DATE: "2026-08-06" },
    rawSources: { medication: { rObject: [{ icd_code: "N183", drug_date: "2024-01-01" }] } },
  });
  assert.equal(icd.decision.provisional, false);
  assert.match(icd.line, /已發生（申報診斷碼/);
});

// ── 分型：第 1 型與第 2 型的門檻不一樣 ────────────────────────────

const typedFacts = (icd, lab = []) =>
  extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-06", BIRTHDAY: "1990-01-01" },
    rawSources: {
      medication: { rObject: [{ icd_code: icd, drug_date: "2024-01-01" }] },
      labData: { rObject: lab },
    },
  });

test("餐後血糖的超標門檻依糖尿病型別而不同", () => {
  // 第 2 型指引 80–160 mg/dL，第 1 型成人低於 180。一位餐後 170 的第 1 型病人
  // 若套第 2 型的門檻會被判成超標，而且引用的還是第 2 型指引。
  const pc = [{ order_code: "09004C", assay_item_name: "飯後血糖", assay_value: "170", unit_data: "mg/dL", fee_ym: "11406" }];
  const at = (icd) => {
    const facts = typedFacts(icd, pc);
    return compareToTargets(extractLabFindings(facts), facts).find((item) => item.analyte === "postprandial-glucose");
  };

  const t1 = at("E101");
  assert.equal(t1.outOfTarget, false);
  assert.match(t1.citation, /第1型糖尿病臨床照護指引/);

  const t2 = at("E119");
  assert.equal(t2.outOfTarget, true);
  assert.match(t2.citation, /第2型糖尿病臨床照護指引/);
});

test("第 1 型病人的目標與出處都來自第 1 型指引", () => {
  const targets = resolveTargets(typedFacts("E101"), 0);
  const ppg = targets.targets.find((item) => item.metric === "餐後血糖");
  assert.match(ppg.value, /低於 180 mg\/dL/);
  assert.match(ppg.citation, /第1型/);
  // 起始時機取決於發病年份，申報資料判不出來——不能靜默套用
  assert.ok(targets.undetermined.some((line) => line.includes("發病年份")));
});

test("型別判不出來時明說套了哪一套指引", () => {
  // 靜默套第 2 型是目前的行為，但報告必須寫出這個假設，否則第 1 型病人
  // 會拿到第 2 型的數字而沒有任何線索。
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-06" }, rawSources: {} });
  const targets = resolveTargets(facts, 0);
  assert.ok(targets.undetermined.some((line) => line.includes("一律套用第 2 型指引的數值")));
});

test("追蹤間隔換成第 1 型後不得重複或漏段", () => {
  const textOf = (icd) => {
    const facts = extractPatientFacts({
      userInput: { REPORT_DATE: "2026-08-06", R1: 1, R3: 1, R4: 1 },
      rawSources: { medication: { rObject: [{ icd_code: icd, drug_date: "2024-01-01" }] } },
    });
    return resolvePlan(null, facts).followUp;
  };

  for (const icd of ["E101", "E119"]) {
    const followUp = textOf(icd);
    const subjects = followUp.rules.map((rule) => rule.id);
    assert.equal(new Set(subjects).size, subjects.length, `${icd} 出現重複條目：${subjects}`);
    // 眼底的「初次檢查時機」與「後續追蹤頻率」不得並列
    const eyes = followUp.text.split("\n").filter((line) => line.includes("眼底"));
    assert.equal(eyes.length, 1, `${icd} 的眼底條目重複：${eyes.join(" ／ ")}`);
    assert.ok(followUp.rules.length >= 5, `${icd} 追蹤項目過少，可能被 typeGate 濾掉了`);
  }

  assert.match(textOf("E101").text, /一年至少檢查 2 次/);
  assert.match(textOf("E119").text, /每 3 個月監測一次/);
});

test("兩份指引的出處都要能認出是哪一本", () => {
  for (const rule of GUIDELINE_RULES) {
    const expected = GUIDELINE_SOURCES[rule.citation.source ?? "t2-2022"];
    assert.ok(citationText(rule).startsWith(expected), `${rule.id} 的出處指向錯誤的指引`);
  }
  // 第 1 型專用的規則不得出現在第 2 型病人的規則集裡，反之亦然
  const forT1 = new Set(rulesForType("type1-confirmed").map((rule) => rule.id));
  const forT2 = new Set(rulesForType("type2-confirmed").map((rule) => rule.id));
  assert.ok(forT1.has("t1-ppg-adult") && !forT2.has("t1-ppg-adult"));
  assert.ok(forT2.has("ppg-general") && !forT1.has("ppg-general"));
  // 型別未知走第 2 型那一套
  assert.deepEqual([...forT2].sort(), rulesForType("absent").map((rule) => rule.id).sort());
});

test("出處頁次是逐頁核過的，改動必須是刻意的", () => {
  /*
   * 2026-08-06 對著學會網站的兩個 PDF 逐頁核過：
   *   t2-2022  /DB/book/88/11103指引_v6-2_all(內文).pdf  418 頁
   *   t1-2022  /DB/book/89/20220923-final-保全.pdf        362 頁
   * 核之前有九組頁次是錯的（表九實際在 p.18 不是 19、血脂表一在 153 不是 154、
   * 高齡目標是表七 p.13 不是表二 p.72……），醫師跳過去會落在隔壁章。
   * 指引全文不進 repo，所以這裡用快照擋住回歸——數字要改，得先重新核頁。
   */
  const expected = {
    "hba1c-general": "表六 非懷孕成年人糖尿病的治療目標，p.12",
    "fpg-general": "第九章 第 2 型糖尿病的血糖治療目標，p.71",
    "ppg-general": "第九章 第 2 型糖尿病的血糖治療目標，p.71",
    "hba1c-elderly-intermediate": "表七 老年糖尿病人（≥65 歲）的治療目標，p.13",
    "hypoglycemia-levels": "表一 低血糖分級，p.141",
    "interval-hba1c": "表九 臨床監測項目與建議頻率，p.18",
    "albuminuria-diagnosis": "表九 註 2，p.18",
    "ldl-general": "表一 血脂的目標建議，p.153",
    "bp-target-general": "第十四章 心血管併發症與其危險因子的處理，p.146",
    "metformin-egfr-30": "第十一章 口服抗糖尿病藥物（臨床建議表），p.97",
    "screening-adult": "第五章 糖尿病人的篩檢，p.49",
    "t1-hba1c-general": "第1型指引，第五章 血糖治療目標（臨床建議表），p.67",
    "t1-ppg-adult": "第1型指引，第五章 血糖治療目標，p.70",
    "t1-interval-kidney": "第1型指引，第十章 糖尿病腎臟疾病，p.198",
    "t1-interval-eye": "第1型指引，第十章 視網膜病變，p.186",
  };
  for (const [id, want] of Object.entries(expected)) {
    const rule = RULES_BY_ID.get(id);
    assert.ok(rule, `規則不存在：${id}`);
    assert.equal(citationShort(rule), want, `${id} 的出處與核過的頁次不符`);
  }
});

test("有蛋白尿的病人也要套加嚴的血壓目標", () => {
  // 指引表六寫「高心血管疾病風險及蛋白尿患者 <130/80」。原本只看已發生的
  // 心血管／腦血管疾病，於是只有蛋白尿的病人拿到 140/90——而加嚴血壓
  // 正是延緩腎病變惡化的手段。
  const bpOf = (raw) => resolveTargets(extractPatientFacts(raw), 0).targets.find((item) => item.metric === "血壓");

  const proteinuria = bpOf({
    userInput: { REPORT_DATE: "2026-08-06" },
    rawSources: {
      labData: {
        rObject: [{ order_code: "12021C", assay_item_name: "Albumin/Creatinine Ratio", assay_value: "450", unit_data: "mg/g", fee_ym: "11406" }],
      },
    },
  });
  assert.match(proteinuria.value, /130\/80/);
  assert.match(proteinuria.reason, /蛋白尿/);

  const neither = bpOf({ userInput: { REPORT_DATE: "2026-08-06" }, rawSources: {} });
  assert.match(neither.value, /140\/90/);
});

test("足檢頻率依 IWGDF 分級，且不與每年一次的神經評估並列", () => {
  // 第十五章 2024 更新把「每年一次」改成依風險分級、一年一次是下限。
  // R4 神經病變對應保護感覺喪失、R6 周邊血管疾病對應周邊動脈疾病。
  const footLines = (userInput) =>
    resolvePlan(null, extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-06", ...userInput }, rawSources: {} }))
      .followUp.text.split("\n")
      .filter((line) => /足|神經/.test(line));

  const one = footLines({ R4: 1 });
  assert.equal(one.length, 1, `足部條目應只有一條：${one.join(" ／ ")}`);
  assert.match(one[0], /6 到 12 個月/);

  assert.match(footLines({ R6: 1 })[0], /6 到 12 個月/);

  const both = footLines({ R4: 1, R6: 1 });
  assert.equal(both.length, 1);
  assert.match(both[0], /3 到 6 個月/);

  // 兩者都沒有時回到表九的通則：所有糖尿病人每年一次，而不是不提。
  // 這一條列一次就好，不能因為改成通用而變成兩條。
  const baseline = footLines({ R1: 1 });
  assert.equal(baseline.length, 1, `足部條目應只有一條：${baseline.join(" ／ ")}`);
  assert.match(baseline[0], /每年檢查一次腳的血液循環/);

  // 出處要指向抽換檔，不是 418 頁全文（頁次體系不同）
  const rule = RULES_BY_ID.get("foot-exam-iwgdf-2");
  assert.equal(rule.citation.source, "t2-ch15-2024");
  assert.match(citationText(rule), /第十五章 4\.糖尿病足（2024 年 6 月更新）/);
});

// ── 送出前的去識別、輸入指紋、空檔阻擋 ────────────────────────────

test("送給模型的文字不帶 userId，生日換算成年齡", () => {
  // userId 對判定毫無用處，卻是最直接的識別欄位。生日只在算年齡時有用，
  // 而指引的高齡放寬看的是年齡——保留完整生日等於白送一個準識別欄位給第三方。
  const text = formatPatientJson({
    downloadType: "DiabetesEducation",
    userInfo: { userId: "AB1234567", gender: "F", birthday: "1960/01/01" },
    userInput: { REPORT_DATE: "2026-08-06", BIRTHDAY: "1960/01/01", DCSI: 3 },
    rawSources: {},
  });

  assert.ok(!text.includes("AB1234567"), "userId 不得外送");
  assert.ok(!/1960/.test(text), "生日不得外送（userInfo 與 userInput 兩處都要換）");
  assert.match(text, /年齡：66 歲/);
  assert.match(text, /AGE（年齡，由 BIRTHDAY 換算）：66 歲/);
  // 性別要留著——HDL 目標分男女
  assert.match(text, /gender：F/);
});

test("生日或報告日期缺漏時說無法換算，不是靜默省略", () => {
  const text = formatPatientJson({
    downloadType: "DiabetesEducation",
    userInfo: { userId: "X", birthday: "" },
    userInput: { REPORT_DATE: "2026-08-06" },
    rawSources: {},
  });
  assert.match(text, /年齡：無法換算/);
});

test("輸入指紋能分辨不同輸入，也印進報告抬頭", () => {
  // 換病人後某次呼叫失敗、畫面留著上一位的報告，是這條流程最容易發生
  // 也最難察覺的錯誤——兩份報告長得幾乎一樣。
  assert.notEqual(inputFingerprint("病人A"), inputFingerprint("病人B"));
  assert.equal(inputFingerprint("病人A"), inputFingerprint("病人A"));
  assert.equal(inputFingerprint("").length, 12, "空輸入也要有指紋，否則「沒有輸入」與「指紋相同」分不出來");

  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-06", R3: 1 }, rawSources: {} });
  const plan = resolvePlan(null, facts);
  const fp = inputFingerprint("某份輸入");
  const patient = assemblePatientReport(plan, { reportDate: "2026-08-06", dataCutoff: null, inputFingerprint: fp });
  const clinician = assembleClinicianReport(plan, facts, { reportDate: "2026-08-06", dataCutoff: null, inputFingerprint: fp });
  assert.ok(patient.includes(`輸入指紋 ${fp}`), "病人版抬頭要有指紋");
  assert.ok(clinician.includes(`輸入指紋 ${fp}`), "醫師版抬頭要有指紋");

  // 沒給就不印，不要留一行空的「輸入指紋」
  assert.ok(!assemblePatientReport(plan, { reportDate: "2026-08-06", dataCutoff: null }).includes("輸入指紋"));
});

test("沒有任何臨床訊號的 JSON 要擋下來", () => {
  // 空物件 {} 是合法 JSON，而它會組出一份 1,900 字、看起來完全正常的報告。
  const base = {
    rawInput: "{}",
    parsedJson: true,
    model: "gemini-3.6-flash",
    apiKey: "x",
    requiresClientKey: false,
    totalTokens: 10,
    tokenLimit: 1000,
  };
  const codesOf = (signals) => runBlockers({ ...base, signals }).map((item) => item.code);

  assert.ok(hasHardBlocker(runBlockers({ ...base, signals: { diagnosisCodes: 0, riskFields: 0, labRecords: 0 } })));

  // 門檻在「三種訊號全空」，不是「一定要有診斷碼」——真實匯出可能缺 ICD
  // 卻有檢驗值，把那種病人擋掉比放行空檔更糟。
  for (const signals of [
    { diagnosisCodes: 0, riskFields: 0, labRecords: 40 },
    { diagnosisCodes: 0, riskFields: 3, labRecords: 0 },
  ]) {
    assert.ok(!hasHardBlocker(runBlockers({ ...base, signals })), `不該擋：${JSON.stringify(signals)}`);
    assert.ok(codesOf(signals).includes("no-diagnosis-code"), "缺診斷碼仍要提醒");
  }

  assert.deepEqual(codesOf({ diagnosisCodes: 5, riskFields: 3, labRecords: 40 }), []);
  // 還沒解析出事實時不做這項判定
  assert.deepEqual(runBlockers(base).map((item) => item.code), []);
});

// ── 批次例外清單 ────────────────────────────────────────────────

const reviewOf = (id, userInput, rawSources = {}, extra = {}) => {
  const raw = { userInput: { REPORT_DATE: "2026-08-06", ...userInput }, rawSources };
  const facts = extractPatientFacts(raw);
  const plan = resolvePlan(extra.audit ?? null, facts);
  const llmText = formatPatientJson(raw);
  const report = assemblePatientReport(plan, {
    reportDate: "2026-08-06",
    dataCutoff: null,
    labNarrative: extra.labNarrative ?? undefined,
  });
  return reviewCase({
    id,
    facts,
    plan,
    validation: validateReport({ report, patientText: llmText, profile: "modules" }),
    audit: extra.audit ?? null,
    labReview: extra.labReview ?? null,
    labNarrative: extra.labNarrative ?? null,
    llmRequested: extra.llmRequested ?? false,
  });
};

const codesOf = (review) => review.flags.map((item) => item.code);

test("沒跑 LLM 時缺少短期建議不算例外，否則整批都會標成不可使用", () => {
  // 短期建議只由 ③ 產生、沒有程式版替代文字。無 LLM 的批次裡它必然缺席——
  // 不排除的話三千份會三千份全標紅，清單就等於沒有清單。
  const withoutLlm = reviewOf("P1", { R2: 2 }, {
    medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01" }] },
    labData: { rObject: [{ fee_ym: "11406", assay_item_name: "HbA1c", assay_value: "8.1", unit_data: "%" }] },
  });
  assert.ok(!codesOf(withoutLlm).includes("validation-failed"));
  assert.equal(withoutLlm.needsReview, false, "一份沒有問題的案件不該出現在清單上");

  // 但有跑 LLM 卻缺段就是真的出事，那時候要留著
  const withLlm = reviewOf("P2", { R2: 2 }, {
    medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01" }] },
    labData: { rObject: [{ fee_ym: "11406", assay_item_name: "HbA1c", assay_value: "8.1", unit_data: "%" }] },
  }, { llmRequested: true });
  assert.ok(codesOf(withLlm).includes("validation-failed"));
  assert.ok(codesOf(withLlm).includes("narrative-call-failed"));
});

test("型別判不出來會進清單，判得出來就不會", () => {
  // 一次跑三千份時沒有人會逐份打開醫師版，型別判不出來必須有人被告知。
  const absent = reviewOf("P-無診斷碼", { R3: 1 });
  assert.ok(codesOf(absent).includes("diabetes-type-undetermined"));

  const conflicting = reviewOf("P-兩型", { R1: 1 }, {
    medication: {
      rObject: [
        { icd_code: "E101", drug_date: "2024-01-01" },
        { icd_code: "E119", drug_date: "2024-01-01" },
      ],
    },
  });
  const flag = conflicting.flags.find((item) => item.code === "diabetes-type-undetermined");
  assert.match(flag.message, /E101/);
  assert.match(flag.message, /E119/);

  const clear = reviewOf("P-第2型", { R2: 2 }, {
    medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01" }] },
    labData: { rObject: [{ fee_ym: "11406", assay_item_name: "HbA1c", assay_value: "8.1", unit_data: "%" }] },
  });
  assert.ok(!codesOf(clear).includes("diabetes-type-undetermined"));
});

test("判讀器抄回來的數字對不上輸入時，視為兩位病人的輸出對調", () => {
  // 中介檔刻意不寫識別碼，所以放錯資料夾不會有任何症狀。echo 存在的
  // 唯一理由就是抓這件事，之前是靠肉眼讀出病程對不上才發現的。
  const audit = parseDataAudit(
    JSON.stringify({ echo: { age_years: 41, dcsi: 9 }, clinician_notes: [], data_concerns: [], disagreements: [] }),
  );
  const mismatch = reviewOf("P-對調", { BIRTHDAY: "1960-01-01", DCSI: 3, R2: 2 }, {}, { audit, llmRequested: true });
  const flag = mismatch.flags.find((item) => item.code === "echo-mismatch");
  assert.ok(flag, "年齡與 DCSI 都對不上時必須擋下");
  assert.equal(flag.severity, "blocking");
  assert.match(flag.message, /年齡 輸入 66／回抄 41/);
  assert.match(flag.message, /DCSI 輸入 3／回抄 9/);

  const matching = parseDataAudit(
    JSON.stringify({ echo: { age_years: 66, dcsi: 3 }, clinician_notes: [], data_concerns: [], disagreements: [] }),
  );
  const ok = reviewOf("P-對得上", { BIRTHDAY: "1960-01-01", DCSI: 3, R2: 2 }, {}, { audit: matching, llmRequested: true });
  assert.ok(!codesOf(ok).includes("echo-mismatch"));
});

test("稽核異議會進清單——那是它唯一被看到的機會", () => {
  const audit = parseDataAudit(
    JSON.stringify({
      echo: null,
      clinician_notes: [],
      data_concerns: [],
      disagreements: [{ topic: "R2", program_decision: "已發生", your_view: "建議核實" }],
    }),
  );
  const review = reviewOf("P-異議", { R2: 2 }, {}, { audit, llmRequested: true });
  const flag = review.flags.find((item) => item.code === "audit-disagreement");
  assert.ok(flag);
  assert.match(flag.message, /R2/);
  assert.match(flag.message, /建議核實/);
});

test("彙總只列需要行動的案件，note 不會讓案件進清單", () => {
  const clean = reviewOf("P-乾淨", { R2: 2 }, {
    medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01" }] },
    labData: { rObject: [{ fee_ym: "11406", assay_item_name: "HbA1c", assay_value: "8.1", unit_data: "%" }] },
  });
  // 這份有 undetermined-targets（note），但不該因此需要人看
  assert.ok(codesOf(clean).includes("undetermined-targets"));
  assert.equal(clean.needsReview, false);

  const flagged = reviewOf("P-要看", { R3: 1 });
  const batch = summarizeBatch([clean, flagged]);
  assert.equal(batch.total, 2);
  assert.equal(batch.needsReview, 1);

  const text = formatBatchReview([clean, flagged]);
  assert.ok(text.includes("P-要看"));
  assert.ok(!text.includes("P-乾淨"), "沒問題的案件不該佔用清單版面");
});

test("三層輸入各自正確，且完整版永遠不會被送出", () => {
  // 只給送出版而不給對照，沒有人能確認被拿掉的到底是什麼。
  // 但完整版含 userId 與生日，只能在瀏覽器內顯示。
  const raw = {
    downloadType: "DiabetesEducation",
    userInfo: { userId: "AB1234567", gender: "F", birthday: "1960/01/01" },
    userInput: { REPORT_DATE: "2026-08-06", BIRTHDAY: "1960/01/01" },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "11406", assay_item_name: "HbA1c", assay_value: "8.1", unit_data: "%" },
          // 兩種刪法各測一種：培養是整碼刪（13007C），CRP 是依名稱刪
          { fee_ym: "11406", order_code: "13007C", assay_item_name: "細菌培養", assay_value: "No growth" },
          { fee_ym: "11406", assay_item_name: "CRP", assay_value: "3.2", unit_data: "mg/L" },
        ],
      },
    },
  };

  const verbatim = formatPatientJson(raw, { skipIrrelevantLabs: false, deidentify: false });
  const sent = formatPatientJson(raw);

  assert.ok(verbatim.includes("AB1234567"), "完整版要照抄 userId，否則看不出被拿掉什麼");
  assert.ok(verbatim.includes("1960"), "完整版要照抄生日");
  assert.ok(verbatim.includes("細菌培養"), "完整版不濾檢驗（整碼刪的那類）");
  assert.ok(verbatim.includes("CRP"), "完整版不濾檢驗（依名稱刪的那類）");

  assert.ok(!sent.includes("AB1234567"), "送出版不得含 userId");
  assert.ok(!sent.includes("1960"), "送出版不得含生日");
  assert.ok(!sent.includes("細菌培養"), "送出版濾掉整碼刪的類別");
  assert.ok(!sent.includes("CRP"), "送出版濾掉依名稱刪的項目");
  assert.ok(sent.includes("HbA1c"), "核心指標不得被濾掉");

  // 預設值就是送出版。呼叫端忘了傳選項時，拿到的必須是安全的那一份。
  assert.equal(formatPatientJson(raw, {}), sent);
});

test("送出去的一律是去識別版，不是頁面上顯示的完整版", () => {
  // 這條擋的是「頁面新增對照分頁時不小心把完整版接到送出路徑上」。
  const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const verbatimUses = source.match(/llmTextVerbatim/g) ?? [];
  assert.ok(verbatimUses.length > 0, "對照用的完整版必須存在");
  // 送出路徑讀的變數名是 llmText；完整版不得出現在組裝送出內容的地方
  assert.ok(
    !/composeInput[\s\S]{0,400}llmTextVerbatim/.test(source),
    "完整版含 userId 與生日，不得進入送出內容",
  );
});

test("腎功能追蹤頻率依實際 eGFR 分段，且只列一條", () => {
  // 指引表二對 eGFR 45–60 與 30–44 的建議差三倍頻率，原本兩位病人
  // 拿到的是同一句「每 3–6 個月」。三條並列會出現三個數字，病人不知道聽哪個。
  const kidneyLines = (egfr, uacr) => {
    const rows = [];
    if (egfr) rows.push({ order_code: "12015C", assay_item_name: "eGFR", assay_value: egfr, unit_data: "ml/min/1.73m2", fee_ym: "11406" });
    if (uacr) rows.push({ order_code: "12021C", assay_item_name: "Albumin/Creatinine Ratio", assay_value: uacr, unit_data: "mg/g", fee_ym: "11406" });
    const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-06", R3: 1 }, rawSources: { labData: { rObject: rows } } });
    return resolvePlan(null, facts).followUp.text.split("\n").filter((line) => /腎/.test(line));
  };

  for (const [egfr, uacr, expected] of [
    ["55", null, /每 6 個月/],
    ["32", null, /每 3 個月/],
    ["75", "450", /至少每半年/],
    ["75", null, /每年檢查一次/],
  ]) {
    const lines = kidneyLines(egfr, uacr);
    assert.equal(lines.length, 1, `eGFR ${egfr} 的腎臟條目應只有一條：${lines.join(" ／ ")}`);
    assert.match(lines[0], expected);
  }
});

test("targetValue 與 statement 不得講不一樣的門檻", () => {
  // 醫師版的目標清單讀 targetValue，其他地方讀 statement。改了一邊沒改另一邊，
  // 同一條規則會在兩份報告裡顯示不同的數字——實測發生過一次（bp-target-intensive）。
  const numbersIn = (text) => (text.match(/\d+(?:\.\d+)?/g) ?? []).join(",");
  for (const rule of GUIDELINE_RULES) {
    if (!rule.targetValue) continue;
    const inStatement = new Set(rule.statement.match(/\d+(?:\.\d+)?/g) ?? []);
    for (const n of rule.targetValue.match(/\d+(?:\.\d+)?/g) ?? []) {
      assert.ok(
        inStatement.has(n),
        `${rule.id} 的 targetValue 出現 statement 沒有的數字 ${n}（targetValue：${numbersIn(rule.targetValue)}／statement：${numbersIn(rule.statement)}）`,
      );
    }
  }
});

test("輸入指紋不得含數字——它會被當成報告裡的檢驗值", () => {
  // 報告有一項機械檢查是「每個數字都要能在輸入資料中找到」。指紋原本是
  // 十六進位，裡面的數字被讀成報告數值——實測五份病人全部誤判成驗證失敗。
  for (const sample of ["病人A", "", "x".repeat(500), JSON.stringify({ a: 1 })]) {
    assert.ok(!/[0-9]/.test(inputFingerprint(sample)), `指紋含數字：${inputFingerprint(sample)}`);
    assert.equal(inputFingerprint(sample).length, 12);
  }

  // 印進報告之後，numbers-supported 不得因為指紋而失敗
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-06", R3: 1 }, rawSources: {} });
  const plan = resolvePlan(null, facts);
  const patientText = formatPatientJson({ userInput: { REPORT_DATE: "2026-08-06" }, rawSources: {} });
  const report = assemblePatientReport(plan, {
    reportDate: "2026-08-06",
    dataCutoff: null,
    inputFingerprint: inputFingerprint("任何輸入"),
  });
  const numbers = validateReport({ report, patientText, profile: "modules" }).results.find(
    (item) => item.id === "numbers-supported",
  );
  assert.equal(numbers.passed, true, `指紋讓數字檢查失敗：${JSON.stringify(numbers.violations)}`);
});

test("模型引用醫令名稱時仍算核實過", () => {
  // 送給模型的好讀文字依醫令分組呈現（醣化血紅素），項目名卻是 HbA1c。
  // 只認項目名的話，一個完全正確的引用會被判成找不到來源——實測發生過。
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-06" },
    rawSources: {
      labData: {
        rObject: [
          { fee_ym: "11406", order_name: "醣化血紅素", assay_item_name: "HbA1c", assay_value: "6.1", unit_data: "%" },
        ],
      },
    },
  });
  const parse = (item, value) =>
    parseLabNarrative(
      JSON.stringify({ narrative: `您的${item}為 ${value}。`, cited_values: [{ item, value }] }),
      facts,
    ).unverifiedValues;

  assert.deepEqual(parse("醣化血紅素", "6.1 %"), [], "引用醫令名稱應算核實");
  assert.deepEqual(parse("HbA1c", "6.1"), [], "引用項目名稱應算核實");
  // 但值錯了還是要擋——放寬的是名稱，不是數值
  assert.equal(parse("醣化血紅素", "9.9").length, 1, "名稱對但數值不在來源，仍不算核實");
});

test("解釋指標是什麼不算聲稱趨勢，真的主張時序才算", () => {
  // 「糖化血色素能反映長期血糖趨勢」是在說這個指標是什麼，沒有對這位病人
  // 主張任何時序。誤報會讓這個標記失去意義——它的用途是說「這幾句不可信」。
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-06" }, rawSources: {} });
  const banned = (narrative) =>
    parseLabNarrative(JSON.stringify({ narrative, cited_values: [] }), facts).bannedPhrases;

  assert.deepEqual(banned("糖化血色素能反映長期血糖趨勢，建議回診時確認是否需要安排檢測。"), []);
  assert.ok(banned("您的血糖呈上升趨勢。").includes("聲稱時序或趨勢"));
  assert.ok(banned("趨勢顯示腎功能惡化。").includes("聲稱時序或趨勢"));
  assert.ok(banned("最近一次的糖化血色素是 8.1。").includes("聲稱時序或趨勢"));
});

test("模型寫的清單符號會被去掉，因為病人版禁止符號項目符號", () => {
  // 純呈現問題，內容沒錯，但整份報告會因此判成不可使用。只去行首符號，不動字。
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-06" }, rawSources: {} });
  const parsed = parseLabNarrative(
    JSON.stringify({
      narrative: "您的血脂目標如下：",
      short_term: "- 每天量血壓\n- 記錄飲食",
      mid_term: "* 三個月後複查\n+ 回診討論",
      cited_values: [],
    }),
    facts,
  );
  assert.equal(parsed.shortTerm, "每天量血壓\n記錄飲食");
  assert.equal(parsed.midTerm, "三個月後複查\n回診討論");
  // 句中的減號不能被誤刪（80-130 這種）
  const kept = parseLabNarrative(
    JSON.stringify({ narrative: "目標是 80-130 mg/dL。", cited_values: [] }),
    facts,
  );
  assert.match(kept.narrative, /80-130/);
});

test("用「波動」「穩定」描述數值算違規，講行為不算", () => {
  // 實測五份報告全部出現「血糖波動較大」「控制相對穩定」。這些字在講值隨
  // 時間怎麼變，而申報資料沒有採檢日期——同一個範圍可能是同一天測三次，
  // 也可能橫跨兩年。可以說範圍，不能說波動。
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-06" }, rawSources: {} });
  const banned = (text) =>
    parseLabNarrative(JSON.stringify({ narrative: text, cited_values: [] }), facts).bannedPhrases;
  const LABEL = "以變化或穩定度描述數值（資料沒有採檢日期，判定不了先後）";

  for (const text of [
    "日常飯前血糖數值波動較大",
    "腎臟相關指標顯示指數有所波動",
    "顯示整體血糖控制相對穩定",
    "餐後與隨機血糖波動更為劇烈",
  ]) {
    assert.ok(banned(text).includes(LABEL), `應擋下：${text}`);
  }

  // 講行為或講範圍都不算——擋下這些會讓標記變成雜訊
  for (const text of [
    "紀錄中的飯前血糖範圍是 65 至 500 mg/dL",
    "吃得穩定，不必吃得痛苦",
    "糖尿病的飲食不是不能吃，而是讓份量與時間穩定下來",
  ]) {
    assert.deepEqual(banned(text), [], `不該擋：${text}`);
  }
});

test("模型不得自訂血糖監測頻率", () => {
  // 每天量幾次、什麼時候量是臨床決定，指引對它有建議。實測模型寫出
  // 「請於每日早餐前及三餐後固定時間量測血糖」——那是它自己開的處方。
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-06" }, rawSources: {} });
  const banned = (text) =>
    parseLabNarrative(JSON.stringify({ narrative: text, cited_values: [] }), facts).bannedPhrases;

  assert.ok(banned("請於每日早餐前及三餐後固定時間量測血糖並記錄").includes("自訂血糖監測頻率"));
  assert.ok(banned("建議每日固定記錄空腹與餐後血糖").includes("自訂血糖監測頻率"));
  // 把頻率交回醫療團隊就不算
  assert.deepEqual(banned("請與醫療團隊確認適合您的血糖監測頻率"), []);
});

test("檢驗過濾要認得實際資料用的縮寫，且不得誤濾核心指標", () => {
  /*
   * 樣式原本照全名寫（lymphocyte、neutrophil），而實際資料用縮寫——
   * 實測 29 種項目該濾卻送出去了，光白血球分類就有 9 種、每份重複二十幾筆。
   *
   * 兩個方向都要測：漏濾浪費 token 並讓模型讀到無關的異常；誤濾會弄丟核心指標。
   */
  const sentText = (names) =>
    formatPatientJson({
      userInput: { REPORT_DATE: "2026-08-06" },
      rawSources: {
        labData: {
          rObject: names.map(([name, code]) => ({
            fee_ym: "11406",
            order_code: code ?? "",
            assay_item_name: name,
            assay_value: "1",
          })),
        },
      },
    });

  const MUST_SKIP = [
    // 白血球分類的縮寫寫法，含來源端的拼字錯誤
    "Lym.", "Seg", "Eos.", "Baso.", "Mono.", "Myelo.", "Aty.Lym.", "Neutrohpils", "Normoblast",
    "Lymphocyte", "Absolute Neutrophil Count",
    // 血液氣體與氧合
    "PaO2/FIO2", "CTCO2", "O2 sat", "O2 Saturation", "sO2氧飽和度", "PH酸鹼值", "BEecf鹼超量", "HCO3重碳酸",
    // 尿液酸鹼值
    "PH(U)", "pH(Dipstick)", "Urine PH", "酸鹼度", "pH",
    // 凝血
    "PT", "PT INR", "MNPT", "MNAPTT", "APTT", "INR 國際標準",
    // 發炎
    "CRP", "Procalcitonin(PCT)",
  ];
  const text = sentText(MUST_SKIP.map((name) => [name]));
  for (const name of MUST_SKIP) {
    assert.ok(!text.includes(`${name}=`), `應該被濾掉卻仍送出：${name}`);
  }

  /*
   * 這幾個看起來像但絕對不能濾：
   *   SGPT／ALT 是肝酵素（PT 結尾）、PTH 副甲狀腺是 CKD 追蹤要用的、
   *   Phosphorus 與 Phosphatase 含 ph。
   */
  const MUST_KEEP = [
    "HbA1c", "Glucose AC", "Glucose(spot)", "Creatinine(B)", "eGFR", "Albumin",
    "K", "Na", "Cl", "LDL-C", "HDL-C", "Triglyceride", "BUN", "Uric Acid",
    "SGPT", "SGPT(ALT)", "ALT/SGPT 肝酵素", "SGOT", "Alkaline Phosphatase",
    "Phosphorus", "PTH", "副甲狀腺賀爾蒙", "Calcium", "Hb", "HGB",
  ];
  const kept = sentText(MUST_KEEP.map((name) => [name]));
  for (const name of MUST_KEEP) {
    assert.ok(kept.includes(`${name}=`), `核心指標被誤濾：${name}`);
  }

  // 整碼刪的四碼仍然有效
  for (const code of ["13007C", "13023C", "13006C", "11002C"]) {
    assert.ok(!sentText([["某培養項目", code]]).includes("某培養項目="), `醫令碼 ${code} 未被濾掉`);
  }
});

// ── ④ 報告審查與可發布度 ────────────────────────────────────────

const SECTIONS = {
  narrative: "您的糖化血色素為 8.6 %，高於一般目標 7.0%。",
  shortTerm: "1. 請與醫療團隊確認適合您的血糖監測頻率。",
  midTerm: "三個月後回診時複查糖化血色素。",
};

test("審查器引用報告裡沒有的句子時，那一則不採信且整份標記不可信", () => {
  // 審查器也會編。編出來的句子代表它在對不存在的內容發表意見——不能只是
  // 丟掉那一則，因為我們不知道它有沒有同時漏掉真的問題。
  const parsed = parseReportReview(
    JSON.stringify({
      findings: [
        { quote: "您的糖化血色素為 8.6 %", category: "value-mismatch", reason: "數值正確，這則是對照用", severity: "attention" },
        { quote: "您的腎功能已經惡化到需要洗腎", category: "diagnosis-inference", reason: "報告裡根本沒這句", severity: "blocking" },
      ],
      open_ended: "無",
    }),
    SECTIONS,
  );

  assert.equal(parsed.findings.length, 1, "編造的那一則不得進入 findings");
  assert.deepEqual(parsed.hallucinatedQuotes, ["您的腎功能已經惡化到需要洗腎"]);
  assert.equal(parsed.openEndedUsed, true);
});

test("審查器的引用比對容忍標點與空白差異", () => {
  // 模型常把全形括號抄成半形、或吃掉空白。因為這種差異就判成編造，
  // 會讓真正的發現被丟掉。
  const parsed = parseReportReview(
    JSON.stringify({
      findings: [{ quote: "您的糖化血色素為8.6%，高於一般目標7.0%。", category: "other", reason: "測試", severity: "attention" }],
      open_ended: "無",
    }),
    SECTIONS,
  );
  assert.deepEqual(parsed.hallucinatedQuotes, []);
  assert.equal(parsed.findings.length, 1);
});

test("不認得的類別歸到 other，不得整則丟掉", () => {
  // 丟掉等於因為分類寫錯就放過一個真的問題。
  const parsed = parseReportReview(
    JSON.stringify({
      findings: [{ quote: "三個月後回診時複查糖化血色素。", category: "made-up-category", reason: "測試", severity: "blocking" }],
      open_ended: "",
    }),
    SECTIONS,
  );
  assert.equal(parsed.findings[0].category, "other");
  assert.equal(parsed.findings[0].severity, "blocking");
  assert.equal(parsed.openEndedUsed, false, "開放式那一題沒回答要記錄下來");
});

test("可發布度：硬性問題直接歸零，程度問題才扣分", () => {
  const raw = {
    userInput: { REPORT_DATE: "2026-08-06", R2: 2 },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2024-01-01", drug_ing_name: "METFORMIN HCL" }] },
      labData: { rObject: [{ fee_ym: "11406", assay_item_name: "HbA1c", assay_value: "8.6", unit_data: "%" }] },
    },
  };
  const facts = extractPatientFacts(raw);
  const plan = resolvePlan(null, facts);
  const narrative = { ...SECTIONS, foundAfterAll: [], unverifiedValues: [], uncitedNumbers: [], bannedPhrases: [] };
  // 用同一份來源產生比對文字，否則 8.6 追溯不到、numbers-supported 會失敗
  const patientText = formatPatientJson(raw);
  const report = assemblePatientReport(plan, { reportDate: "2026-08-06", dataCutoff: null, labNarrative: narrative });
  const validation = validateReport({ report, patientText, profile: "modules" });

  const assess = (labNarrative, reportReview) => {
    const caseReview = reviewCase({ id: "T", facts, plan, validation, audit: null, labReview: null, labNarrative, llmRequested: false });
    return assessPublishReadiness({ facts, plan, validation, labNarrative, reportReview, caseReview, llmRequested: false });
  };

  // 審查器標了 blocking：直接歸零，不管其他項目多好
  const blocked = assess(narrative, {
    findings: [{ quote: SECTIONS.midTerm, category: "treatment-advice", reason: "測試", severity: "blocking" }],
    hallucinatedQuotes: [],
    openEndedUsed: true,
  });
  assert.equal(blocked.score, 0);
  assert.equal(blocked.band, "blocked");

  // 編造引用同樣歸零——那是「這次審查不可信」，不是「報告沒問題」
  const untrusted = assess(narrative, { findings: [], hallucinatedQuotes: ["不存在的句子"], openEndedUsed: true });
  assert.equal(untrusted.score, 0);
  assert.equal(untrusted.band, "blocked");

  // attention 是程度問題，扣分不歸零
  const soft = assess(narrative, {
    findings: [{ quote: SECTIONS.shortTerm, category: "vague", reason: "測試", severity: "attention" }],
    hallucinatedQuotes: [],
    openEndedUsed: true,
  });
  assert.ok(soft.score > 0 && soft.score < 100, `attention 應該扣分而非歸零：${soft.score}`);
  assert.equal(soft.band, "review");
});

test("可發布度的每一項扣分都要說得出原因與下一步", () => {
  // 只給一個數字等於換一種寫法的 pass/fail——人還是得整份重讀才知道要看哪裡。
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-06" }, rawSources: {} });
  const plan = resolvePlan(null, facts);
  const patientText = formatPatientJson({ userInput: { REPORT_DATE: "2026-08-06" }, rawSources: {} });
  const report = assemblePatientReport(plan, { reportDate: "2026-08-06", dataCutoff: null });
  const validation = validateReport({ report, patientText, profile: "modules" });
  const caseReview = reviewCase({ id: "T", facts, plan, validation, audit: null, labReview: null, labNarrative: null, llmRequested: false });
  const readiness = assessPublishReadiness({
    facts, plan, validation, labNarrative: null, reportReview: null, caseReview, llmRequested: false,
  });

  assert.ok(readiness.deductions.length > 0, "這份資料很空，應該要有扣分");
  for (const item of readiness.deductions) {
    assert.ok(item.reason.length > 0, `${item.code} 缺少原因`);
    assert.ok(item.action.length > 0, `${item.code} 缺少下一步`);
  }
  // DRAFT 一定要出現在明細裡，否則滿分會被讀成可以直接給病人
  assert.ok(readiness.deductions.some((item) => item.code === "content-draft"));
  // 呈現時要講清楚分數的意義
  assert.ok(formatReadiness(readiness).some((line) => line.includes("不代表報告內容一定正確")));
});

// ── 外部稽核 2026-08-06：回顧性語意與邊界 ──────────────────────

test("metformin 提示是條件式的，不得寫成現在禁用", () => {
  /*
   * 這份報告整理最多三年的回顧資料。程式只知道「歷史曾開過 metformin」與
   * 「歷史曾出現低 eGFR」，證明不了兩者同期，也不知道現在是否仍在用。
   * 同一份報告一邊說申報用藥不代表目前用藥、一邊寫「屬禁用」，是自相矛盾。
   */
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-06" },
    rawSources: {
      medication: { rObject: [{ icd_code: "E119", drug_date: "2023-01-01", drug_ing_name: "METFORMIN HCL" }] },
      labData: {
        rObject: [
          { order_code: "12015C", assay_item_name: "eGFR", assay_value: "25", unit_data: "ml/min/1.73m2", fee_ym: "11201" },
          { order_code: "12015C", assay_item_name: "eGFR", assay_value: "72", unit_data: "ml/min/1.73m2", fee_ym: "11406" },
        ],
      },
    },
  });
  const hit = evaluateThresholds(extractLabFindings(facts), facts).find((item) => /metformin/i.test(item.code));

  assert.ok(hit, "應該要有 metformin 的核對提示");
  assert.match(hit.clinicianMessage, /需核對/, "開頭要講「核對」而不是直接下處置");
  assert.match(hit.clinicianMessage, /無法確認兩者是否同期/);
  assert.match(hit.clinicianMessage, /是否仍在使用/);
  // 資料期間要寫出來，讀的人才知道「曾出現」是多久以內的事
  assert.match(hit.clinicianMessage, /11201–11406/);
});

test("UACR 剛好 300 要算進巨量，不得兩邊都掉出去", () => {
  // 原本微量是 30–299、巨量是 >300，純數值 300 誰都不收，完全不觸發。
  const reasonFor = (value) =>
    kidneyLabEvidence(
      extractPatientFacts({
        userInput: { REPORT_DATE: "2026-08-06" },
        rawSources: {
          labData: {
            rObject: [
              { order_code: "12021C", assay_item_name: "Albumin/Creatinine Ratio", assay_value: String(value), unit_data: "mg/g", fee_ym: "11406" },
            ],
          },
        },
      }),
    ).reason;

  assert.match(reasonFor(299), /30–299/);
  assert.match(reasonFor(300), /達到或超過 300/, "300 必須算進巨量");
  assert.match(reasonFor(301), /達到或超過 300/);

  // 觸發後只列符合門檻的值，不得把 150 也一起列進去
  const mixed = kidneyLabEvidence(
    extractPatientFacts({
      userInput: { REPORT_DATE: "2026-08-06" },
      rawSources: {
        labData: {
          rObject: [150, 450].map((v) => ({
            order_code: "12021C", assay_item_name: "Albumin/Creatinine Ratio", assay_value: String(v), unit_data: "mg/g", fee_ym: "11406",
          })),
        },
      },
    }),
  ).reason;
  assert.match(mixed, /450/);
  assert.ok(!mixed.includes("150"), `不符門檻的值不得列入：${mixed}`);
});

test("第 1 型病人不會拿到第 2 型的 eGFR 分層監測規則", () => {
  // ckdMonitoringRuleId 原本不看型別，回傳的規則 typeGate 是 type2-confirmed，
  // 第 1 型病人會被規則過濾器濾掉，追蹤時程整條消失。
  const followUpFor = (icd) =>
    resolvePlan(
      null,
      extractPatientFacts({
        userInput: { REPORT_DATE: "2026-08-06", R3: 1 },
        rawSources: {
          medication: { rObject: [{ icd_code: icd, drug_date: "2024-01-01" }] },
          labData: {
            rObject: [{ order_code: "12015C", assay_item_name: "eGFR", assay_value: "38", unit_data: "ml/min/1.73m2", fee_ym: "11406" }],
          },
        },
      }),
    ).followUp.text.split("\n").filter((line) => /腎/.test(line));

  const t2 = followUpFor("E119");
  assert.equal(t2.length, 1);
  assert.match(t2[0], /每 3 個月/, "第 2 型走表二的分段");

  const t1 = followUpFor("E101");
  assert.equal(t1.length, 1, `第 1 型的腎臟條目不得消失或重複：${t1.join(" ／ ")}`);
  assert.ok(!/每 3 個月檢查一次腎功能/.test(t1[0]), "第 1 型不得套用第 2 型的分段文字");
});

test("血色素不得寫成「持續偏低」——沒有採檢日期就分不出持續與同一次事件", () => {
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-06", R3: 1 },
    rawSources: {
      labData: {
        rObject: [9.8, 10.2, 10.5].map((v) => ({
          fee_ym: "11406", assay_item_name: "Hb", assay_value: String(v), unit_data: "g/dL",
        })),
      },
    },
  });
  const messages = evaluateThresholds(extractLabFindings(facts), facts).map((item) => item.clinicianMessage);
  // 「糖化血色素」也含「血色素」三個字，用它比對會抓到缺檢提示。看轉介那一條。
  const anemia = messages.find((line) => /血色素/.test(line) && !/糖化血色素/.test(line));

  assert.ok(!messages.some((line) => line.includes("持續偏低")), "不得宣稱持續");
  if (anemia) assert.match(anemia, /可取得的血色素紀錄皆低於 11|無採檢日期/);
});

test("病人版敘述的 prompt 不得一邊要求、一邊禁止同一組詞", () => {
  /*
   * prompt 原本第一段要模型用「穩定、波動大」當結論詞，後段又禁止這些字。
   * 五份實跑全部出現波動／穩定，直接原因就是這個矛盾——加了禁令卻沒改掉
   * 製造違規的那句話。
   */
  const banned = ["波動", "起伏", "穩定"];
  const lines = LAB_NARRATIVE_PROMPT.split("\n");
  const bans = lines.filter((line) => /不得用/.test(line) && banned.some((w) => line.includes(w)));
  assert.ok(bans.length > 0, "prompt 必須明文禁止這組詞");

  // 禁令以外的地方不得把這些詞當成建議用語
  for (const line of lines) {
    if (bans.includes(line)) continue;
    if (!/（|(，|、)/.test(line)) continue;
    for (const word of banned) {
      assert.ok(
        !new RegExp(`[（、，]${word}`).test(line),
        `prompt 一邊禁止一邊示範使用「${word}」：${line.trim().slice(0, 60)}`,
      );
    }
  }
});

test("不得宣稱達到「需醫療團隊定案」的目標", () => {
  /*
   * 高齡者的糖化血色素目標要依健康狀態分級，申報資料判定不了，所以程式標成
   * 需定案。目標值本身沒定，就沒有達不達標可言。
   *
   * 實跑四份都出現「糖化血色素 6.1%，符合控制目標」，機械檢查全部放行——
   * 6.1 確實在來源裡、格式也沒問題。這是 ④ 報告審查抓到的，但它是程式判得動
   * 的事，不該只靠 LLM。
   */
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-06", BIRTHDAY: "1954-01-01" },
    rawSources: { labData: { rObject: [{ fee_ym: "11406", assay_item_name: "HbA1c", assay_value: "6.1", unit_data: "%" }] } },
  });
  const undetermined = resolveTargets(facts, 0)
    .targets.filter((item) => item.needsClinicianConfirmation || !item.value)
    .map((item) => item.metric);
  assert.ok(undetermined.includes("糖化血色素"), "72 歲的糖化血色素目標應為未定案");

  const claimed = (text) =>
    parseLabNarrative(
      JSON.stringify({ narrative: text, cited_values: [{ item: "HbA1c", value: "6.1" }] }),
      facts,
      undetermined,
    ).claimedTargets;

  // 別名要一起認：程式寫「糖化血色素」，模型可能寫「醣化血紅素」或 HbA1c
  for (const text of [
    "醣化血紅素數值為 6.1 %，符合控制目標。",
    "糖化血色素 6.1 %，已達標。",
    "HbA1c 為 6.1 %，控制良好。",
  ]) {
    assert.equal(claimed(text).length, 1, `應擋下：${text}`);
  }

  // 講數值但不宣稱達標，可以
  assert.deepEqual(claimed("糖化血色素為 6.1 %。實際目標值需由醫療團隊依您的健康狀態定案。"), []);
  // 目標已定案的指標不受影響
  assert.deepEqual(claimed("三酸甘油酯 120 mg/dL，符合控制目標。"), []);
  // 沒有未定案目標時整條不啟動
  assert.deepEqual(
    parseLabNarrative(JSON.stringify({ narrative: "糖化血色素 6.1 %，已達標。", cited_values: [] }), facts, []).claimedTargets,
    [],
  );
});

test("宣稱達標的偵測要涵蓋沒有動詞、指標名在前一句的寫法", () => {
  /*
   * 實跑抓到三種漏網寫法：
   *   「在理想目標內」——沒有符合／達到／落在這類動詞
   *   「醣化血紅素為 6.5 %。落在控制目標內。」——指標名在前一句
   *   「已達到常見的血糖控制範圍」——同上
   * 只看單句、只認固定動詞，這三種都會過。
   */
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-06", BIRTHDAY: "1941-01-01" },
    rawSources: { labData: { rObject: [{ fee_ym: "11406", assay_item_name: "HbA1c", assay_value: "6.5", unit_data: "%" }] } },
  });
  const claimed = (text) =>
    parseLabNarrative(
      JSON.stringify({ narrative: text, cited_values: [{ item: "HbA1c", value: "6.5" }] }),
      facts,
      ["糖化血色素"],
    ).claimedTargets.length;

  for (const text of [
    "醣化血色素數值在理想目標內。",
    "醣化血紅素為 6.5 %。落在控制目標內。",
    "糖化血色素落在目標範圍內。",
    "HbA1c 6.5 %。已達到常見的血糖控制範圍。",
  ]) {
    assert.ok(claimed(text) > 0, `應擋下：${text}`);
  }

  // 明說目標未定案，或指標的目標本來就定案了，都不該擋
  assert.equal(claimed("糖化血色素為 6.5 %，目標值需由醫療團隊定案。"), 0);
  assert.equal(claimed("三酸甘油酯 120 mg/dL，落在控制目標內。"), 0);
});

test("審查器看得到程式算出的目標與追蹤間隔，才分得出誰自訂處方", () => {
  /*
   * 沒有這一段，審查器把「每 3 個月檢查一次腎功能」判成模型自訂處方——
   * 而那個數字是程式從指引表二算出來、餵給模型照抄的。
   */
  const facts = extractPatientFacts({ userInput: { REPORT_DATE: "2026-08-06" }, rawSources: {} });
  const sections = { narrative: "測試", shortTerm: "測試", midTerm: "測試" };

  const without = buildReviewInput(sections, "事實", facts);
  assert.ok(!without.includes("程式依指引算出的目標"));

  const with_ = buildReviewInput(sections, "事實", facts, {
    targets: [{ metric: "糖化血色素", value: "低於 7.0%" }],
    followUp: "每 3 個月測一次 eGFR。",
  });
  assert.match(with_, /程式依指引算出的目標與追蹤間隔/);
  assert.match(with_, /照抄不算自訂處方/);
  assert.match(with_, /每 3 個月測一次 eGFR/);
});

// ── 醫師版的自由文字也要查臨床語意 ──────────────────────────────

test("醫師版的推論不因為讀者是專業人員就放行", () => {
  /*
   * 這一層原本只查「引用的數字存不存在」，所以「符合糖尿病腎病變」
   * 「腎功能顯著惡化」「尿酮 1+ 推到酮酸中毒風險」全部照樣進報告——
   * 數字都對，推論不成立。實測五份醫師版有四份出現，共 25 則。
   *
   * 讀者專業與否改變的是「要不要解釋」，不是「這句話成不成立」。
   */
  const blocked = [
    "符合糖尿病腎病變的表現",
    "慢性腎臟病進展中",
    "腎功能顯著惡化",
    "血糖劇烈波動",
    "尿酮 1+，有酮酸中毒風險",
    "符合慢性腎病相關貧血",
    "建議關注血糖藥物調整",
  ];
  for (const text of blocked) {
    assert.ok(findUnsupportedClaims(text, "clinician").length > 0, `應標記：${text}`);
  }

  // 陳述事實、引用指引、明說限制都不算
  for (const text of [
    "紀錄中曾出現 eGFR 22.8",
    "飯前血糖介於 65 至 500 mg/dL",
    "eGFR 低於 60，依指引建議至少每半年追蹤",
    "尿酮 1+（無採檢日期，無法判讀當下狀況）",
    "視網膜病變已納入本次衛教主題",
  ]) {
    assert.deepEqual(findUnsupportedClaims(text, "clinician"), [], `不該標記：${text}`);
  }

  // 血糖監測頻率只對病人版適用——寫給醫師是建議事項，由他判斷
  const smbg = "建議每日固定記錄空腹與餐後血糖";
  assert.ok(findUnsupportedClaims(smbg, "patient").length > 0);
  assert.deepEqual(findUnsupportedClaims(smbg, "clinician"), []);
});

test("醫師版的每一段自由文字都要掃到，不只是異常項目的說明", () => {
  // why、pattern、worth_a_look、data_quality_notes 都會直接進報告。
  const facts = extractPatientFacts({
    userInput: { REPORT_DATE: "2026-08-06" },
    rawSources: { labData: { rObject: [{ fee_ym: "11406", assay_item_name: "eGFR", assay_value: "43", unit_data: "ml/min/1.73m2" }] } },
  });
  const check = parseLabReview(
    JSON.stringify({
      abnormal: [{ item: "eGFR", worst: "43", worst_other: "", unit: "ml/min/1.73m2", reference: "", direction: "低", why: "符合糖尿病腎病變" }],
      groups: [{ system: "腎臟", items: ["eGFR"], pattern: "慢性腎臟病進展中" }],
      worth_a_look: ["血糖劇烈波動"],
      data_quality_notes: ["建議關注血糖藥物調整"],
    }),
    facts,
  );

  const labels = new Set(check.unsupportedClaims.map((item) => item.label));
  assert.ok(labels.has("推測診斷"), "why 與 pattern 都要掃");
  assert.ok(labels.has("以變化或穩定度描述數值"), "worth_a_look 也要掃");
  assert.ok(labels.has("處置或劑量建議"), "data_quality_notes 也要掃");

  // 標記要出現在醫師版那一節的開頭，不是附在最後——醫師是由上往下讀的
  const rendered = formatLabReview(check);
  const warnIndex = rendered.indexOf("超出這批資料能支持的範圍");
  const firstFinding = rendered.indexOf("符合糖尿病腎病變");
  assert.ok(warnIndex > 0, "醫師版要標出這些句子");
  assert.ok(warnIndex < firstFinding, "警語必須在被標記的內容之前");
});
