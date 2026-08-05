import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
import { GUIDELINE_RULES, RULES_APPROVED, RULES_BY_ID, RULES_VERSION } from "../app/lib/guideline-rules.ts";
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
import { parseLabReview, labSectionOf, LAB_REVIEW_PROMPT } from "../app/lib/lab-llm.ts";
import { analyteForItemName, evaluateThresholds, extractLabFindings, lowestMeasuredGlucose } from "../app/lib/lab-findings.ts";
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
  assert.match(text, /至少每半年/, "已達門檻時應列出加密追蹤");
  assert.ok(!/肌酸酐、eGFR、尿液常規與白蛋白尿建議每年檢查一次/.test(text), "不應同時保留每年的一般間隔");

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

test("檢驗判讀器的輸入含性別與生日，但不含用藥", () => {
  // 這批資料的參考值是分層的（[≧18y]M 4-5.52 F 3.78-4.99）。
  // 不給年齡性別就選不出該用哪一段，而 prompt 又要求它選。
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
  assert.match(section, /birthday：1949-03-08/);
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
  // 醫師版用原本的事實陳述（含檢查技術名稱），病人版才用白話說法
  assert.match(section, /單股纖維壓覺/);
  // 每一條都要能追到出處
  for (const line of section.split("\n").filter((l) => /^\s{2}\S/.test(l) && !/^\s*[一二三四五六七]、/.test(l))) {
    assert.match(line, /〔.+p\.\d+〕/, `追蹤間隔缺出處：${line.trim()}`);
  }
  // statement 沒有主詞的才補，有主詞的不重述
  assert.match(section, /腎功能與尿液白蛋白：至少每半年/);
  assert.ok(!/腎功能與尿液白蛋白：肌酸酐/.test(section));

  // 病人版仍是白話說法
  const patient = assemblePatientReport(plan, { reportDate: "2026-08-04", dataCutoff: null });
  assert.ok(!patient.includes("單股纖維壓覺"));
  assert.match(patient, /建議每年做一次足部感覺檢查/);
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
  assert.match(referral.citation, /p\. ?200|第 200 頁/);
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
