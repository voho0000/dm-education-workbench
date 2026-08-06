/**
 * 可發布度：這份報告有多少「我們檢查得到的東西」通過了。
 *
 * **刻意不叫「信心指數」。** 那個詞會讓人以為它代表報告正確的機率，而它不是。
 * 如果去問模型「你對這份報告有多有信心」，那個數字沒有校準——而且最危險的
 * 情況正是模型自信地寫錯。這裡的分數只由**已經量到的訊號**組成：機械驗證過了
 * 幾項、有沒有核不到來源的數值、審查器標了什麼、資料本身缺了什麼。
 *
 * 換句話說：分數高只代表「我們查得到的都查過了，沒問題」，不代表「這份報告
 * 是對的」。查不到的東西不在分母裡。這個區別要寫在報告上，否則高分會被讀成
 * 背書。
 *
 * 每一項扣分都帶原因。只給一個數字等於換一種寫法的 pass/fail——人還是得整份
 * 重讀才知道要看哪裡。
 */

import type { CaseReview } from "./batch-review.ts";
import type { LabNarrativeCheck } from "./lab-narrative.ts";
import type { PatientFacts } from "./patient-facts.ts";
import type { ReportReviewCheck } from "./report-review.ts";
import { MODULE_CATALOG_APPROVED } from "./education-modules.ts";
import { RULES_APPROVED } from "./guideline-rules.ts";
import { SELF_CARE_APPROVED } from "./self-care-modules.ts";
import type { ResolvedPlan } from "./module-plan.ts";
import type { ValidationReport } from "./validate-report.ts";

export type Deduction = {
  code: string;
  /** 扣幾分 */
  points: number;
  reason: string;
  /** 人要做什麼 */
  action: string;
};

export type PublishReadiness = {
  /** 0–100。100 代表所有檢查得到的項目都通過，不代表報告一定正確。 */
  score: number;
  /**
   * 三段：
   *   blocked  有硬性問題，不可發布
   *   review   可以用，但要人看過
   *   ready    檢查得到的都通過了
   *
   * **ready 不等於可以自動發出。**要不要在 ready 時免除人工審閱，是產品決策，
   * 不在這個模組裡——這裡只回報狀態。
   */
  band: "blocked" | "review" | "ready";
  deductions: Deduction[];
};

export type ReadinessInput = {
  facts: PatientFacts;
  plan: ResolvedPlan;
  validation: ValidationReport;
  labNarrative: LabNarrativeCheck | null;
  reportReview: ReportReviewCheck | null;
  /** 批次判定的結果，避免同一件事在兩邊各判一次而給出不同答案。 */
  caseReview: CaseReview;
  llmRequested: boolean;
};

/*
 * 扣分的權重。
 *
 * 兩類分開：**硬性問題**一旦出現就直接歸零並落到 blocked，不是扣幾分的問題——
 * 一份寫著不存在數值的報告，不會因為其他項目都很好就變得可以發。
 * **資料完整度**才是扣分制，因為那些是程度問題。
 */
const HARD_ZERO = new Set([
  "validation-failed",
  "unverified-values",
  "banned-phrases",
  "echo-mismatch",
  "narrative-call-failed",
  "review-blocking",
  "review-hallucinated",
]);

export function assessPublishReadiness(input: ReadinessInput): PublishReadiness {
  const { facts, plan, validation, labNarrative, reportReview, caseReview, llmRequested } = input;
  const deductions: Deduction[] = [];
  let hard = false;

  const add = (code: string, points: number, reason: string, action: string) => {
    deductions.push({ code, points, reason, action });
    if (HARD_ZERO.has(code)) hard = true;
  };

  // ── 硬性：這份不能發 ────────────────────────────────────

  const failed = validation.results.filter((item) => !item.passed);
  // 沒跑 LLM 時「六段完整」必然失敗（短期建議只由 ③ 產生），那是預期行為
  const realFailures = llmRequested ? failed : failed.filter((item) => item.id !== "required-headings");
  if (realFailures.length) {
    add(
      "validation-failed",
      100,
      `機械驗證 ${realFailures.length} 項未通過：${realFailures.map((item) => item.label).join("；")}`,
      "打開病人版報告核對未通過的項目。",
    );
  }

  if (labNarrative?.unverifiedValues.length) {
    add(
      "unverified-values",
      100,
      `${labNarrative.unverifiedValues.length} 個數值在該項目自己的來源值裡找不到`,
      "可能掛錯項目。不要發出這份報告。",
    );
  }

  if (labNarrative?.bannedPhrases.length) {
    add("banned-phrases", 100, `踩到禁止事項：${labNarrative.bannedPhrases.join("、")}`, "不要發出這份報告。");
  }

  const blockingFindings = reportReview?.findings.filter((item) => item.severity === "blocking") ?? [];
  if (blockingFindings.length) {
    add(
      "review-blocking",
      100,
      `審查器標記 ${blockingFindings.length} 處會讓病人做出錯誤決定的內容`,
      "逐句看審查器的標記，確認後修正或重跑。",
    );
  }

  /*
   * 審查器引用了報告裡沒有的句子，代表它在對不存在的內容發表意見。
   * 這一則不是「報告有問題」，是「這次審查不可信」——同樣不能放行，
   * 因為我們不知道它有沒有漏掉真的問題。
   */
  if (reportReview?.hallucinatedQuotes.length) {
    add(
      "review-hallucinated",
      100,
      `審查器引用了 ${reportReview.hallucinatedQuotes.length} 句報告中找不到的話`,
      "這次審查不可信，整份要人重看。",
    );
  }

  if (llmRequested && !labNarrative) {
    add("narrative-call-failed", 100, "③ 檢驗敘述失敗，短期建議整段消失", "重跑這一份。");
  }

  // ── 扣分：程度問題 ──────────────────────────────────────

  const attention = reportReview?.findings.filter((item) => item.severity === "attention") ?? [];
  if (attention.length) {
    add(
      "review-attention",
      Math.min(30, attention.length * 10),
      `審查器標記 ${attention.length} 處讀起來不理想或有疑慮`,
      "看標記出來的句子，判斷要不要改。",
    );
  }

  const verdict = facts.diabetesType.verdict;
  if (verdict !== "type1-confirmed" && verdict !== "type2-confirmed") {
    add(
      "type-undetermined",
      20,
      "糖尿病型別判不出來，目標值一律套第 2 型",
      "兩型的餐後血糖上限差 20 mg/dL、篩檢起始時機也不同。確認這位是哪一型。",
    );
  } else if (facts.diabetesType.insulinOnly) {
    add(
      "type2-but-insulin-only",
      10,
      "診斷碼判為第 2 型，但用藥只有胰島素",
      "這也可能是被編成第 2 型的第 1 型病人。",
    );
  }

  if (plan.decisions.some((item) => item.provisional)) {
    add(
      "topic-provisional",
      10,
      "有主題只由檢驗數值救回，未經診斷確認",
      "醫師版標為需確認，需要病歷佐證才能當成確診。",
    );
  }

  if (labNarrative?.uncitedNumbers.length) {
    add(
      "uncited-numbers",
      Math.min(20, labNarrative.uncitedNumbers.length * 5),
      `${labNarrative.uncitedNumbers.length} 個數字沒有列進引用清單，因此沒被逐項核對`,
      "確認它們不是模型自己算出來的。",
    );
  }

  if (facts.labRecordCount === 0) {
    add("no-lab-records", 20, "完全沒有檢驗紀錄", "報告會明顯偏短。確認匯出是否漏了檢驗段。");
  }

  if (!plan.topicModuleIds.length) {
    add("no-topics", 15, "一個併發症主題都沒有納入", "確認來源的 R／PR 欄位是不是整批缺漏。");
  }

  if (llmRequested && reportReview && !reportReview.openEndedUsed) {
    add(
      "review-no-open-ended",
      5,
      "審查器沒有回答開放式那一題",
      "它可能只照 rubric 掃了一遍，新類型的問題不會被發現。",
    );
  }

  /*
   * 內容尚未核准。這一項對每一份都成立，所以不影響排序，但必須出現在扣分
   * 明細裡——不然滿分會被讀成「這份可以直接給病人」。
   */
  if (!MODULE_CATALOG_APPROVED || !RULES_APPROVED || !SELF_CARE_APPROVED) {
    add("content-draft", 0, "衛教模組與門檻表尚未經醫療團隊核准", "報告抬頭已印 DRAFT 警語，目前不得提供給病人。");
  }

  const softTotal = deductions.filter((item) => !HARD_ZERO.has(item.code)).reduce((sum, item) => sum + item.points, 0);
  const score = hard ? 0 : Math.max(0, 100 - softTotal);

  return {
    score,
    band: hard ? "blocked" : caseReview.needsReview || score < 100 ? "review" : "ready",
    deductions,
  };
}

/** 給人讀的一行摘要，附扣分明細。 */
export function formatReadiness(readiness: PublishReadiness): string[] {
  const label =
    readiness.band === "blocked" ? "不可發布" : readiness.band === "review" ? "需人看過" : "檢查項目全通過";
  const lines = [
    `可發布度 ${readiness.score}／100　${label}`,
    "（分數只代表我們檢查得到的項目通過了，不代表報告內容一定正確。）",
  ];
  for (const item of readiness.deductions) {
    lines.push(`  −${item.points}　${item.reason}`);
    lines.push(`        → ${item.action}`);
  }
  return lines;
}
