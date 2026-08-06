/**
 * 批次跑完之後，哪幾份需要人進去看。
 *
 * 要解決的情況：一次跑三千份，沒有人會逐份打開醫師版。目前所有的例外訊號
 * ——稽核提出的異議、型別判不出來、某次呼叫失敗、驗證未通過——都只寫在
 * 各自那份報告裡，等於寫在沒人打開的檔案中。跑完之後手上有三千個資料夾，
 * 而「哪幾份有問題」這個問題沒有答案。
 *
 * 這裡把每一份的例外訊號收成一則紀錄，跑完彙總成一份清單。判定完全由程式
 * 做，不呼叫模型——用模型判斷「這份要不要人看」等於再引入一個要驗證的東西。
 *
 * 嚴重度只有三級，而且定義是「人要做什麼」，不是「問題有多大」：
 *   blocking   這份報告不能直接使用
 *   attention  可以使用，但要有人看過再出
 *   note       只是紀錄，不需要行動
 */

import type { DataAudit, ResolvedPlan } from "./module-plan.ts";
import type { LabNarrativeCheck } from "./lab-narrative.ts";
import type { LabReviewCheck } from "./lab-llm.ts";
import type { PatientFacts } from "./patient-facts.ts";
import type { ValidationReport } from "./validate-report.ts";

export type ReviewSeverity = "blocking" | "attention" | "note";

export type ReviewFlag = {
  code: string;
  severity: ReviewSeverity;
  /** 發生什麼事 */
  message: string;
  /** 人接下來要做什麼。沒有這一句的旗標只會變成雜訊。 */
  action: string;
};

export type CaseReview = {
  id: string;
  /** blocking 或 attention 任一存在 */
  needsReview: boolean;
  flags: ReviewFlag[];
};

export type ReviewInput = {
  id: string;
  facts: PatientFacts;
  plan: ResolvedPlan;
  validation: ValidationReport;
  /** 三次呼叫的解析結果。null 代表該次失敗或解析不出來。 */
  audit: DataAudit | null;
  labReview: LabReviewCheck | null;
  labNarrative: LabNarrativeCheck | null;
  /** 這次跑有沒有要求執行 LLM。沒有的話，三個 null 是預期行為，不算例外。 */
  llmRequested: boolean;
};

const SEVERITY_ORDER: Record<ReviewSeverity, number> = { blocking: 0, attention: 1, note: 2 };

export function reviewCase(input: ReviewInput): CaseReview {
  const { facts, plan, validation, audit, labReview, labNarrative, llmRequested } = input;
  const flags: ReviewFlag[] = [];

  // ── 報告不能直接使用 ────────────────────────────────────

  /*
   * 沒跑 LLM 時，「六個段落逐字完整」必然失敗——短期建議只由 ③ 產生，
   * 沒有程式版的替代文字。那是預期行為，不是例外。
   *
   * 不排除掉的話，一批無 LLM 的三千份會三千份全標成不可使用，清單就等於
   * 沒有清單。反過來，有跑 LLM 卻缺段就是真的出事，那時候要留著。
   */
  const expectedWithoutLlm = new Set(llmRequested ? [] : ["required-headings"]);
  const failedChecks = validation.results.filter((item) => !item.passed && !expectedWithoutLlm.has(item.id));
  if (failedChecks.length) {
    flags.push({
      code: "validation-failed",
      severity: "blocking",
      message: `機械驗證 ${failedChecks.length} 項未通過：${failedChecks.map((item) => item.label).join("；")}`,
      action: "打開病人版報告核對未通過的項目。驗證不擋下載，所以這份可能已經被取用。",
    });
  }

  if (labNarrative?.unverifiedValues.length) {
    flags.push({
      code: "unverified-values",
      severity: "blocking",
      message: `病人版出現 ${labNarrative.unverifiedValues.length} 個核不到來源的數值：${labNarrative.unverifiedValues
        .map((item) => `${item.item}=${item.value}`)
        .join("、")}`,
      action: "這些數字在該項目自己的來源值裡找不到，可能是掛錯項目。不要發出這份報告。",
    });
  }

  if (labNarrative?.bannedPhrases.length) {
    flags.push({
      code: "banned-phrases",
      severity: "blocking",
      message: `病人版出現禁止事項：${labNarrative.bannedPhrases.join("、")}`,
      action: "模型跨線給了處置建議或時序說法。不要發出這份報告。",
    });
  }

  /*
   * echo 是判讀器把輸入裡的年齡與 DCSI 抄回來的欄位，存在的唯一理由就是抓
   * 「兩位病人的輸出對調」——中介檔刻意不寫識別碼，所以放錯資料夾不會有
   * 任何症狀。實測發生過一次，是靠肉眼讀出病程對不上才發現的。
   */
  if (audit?.echo) {
    const expectedAge = facts.ageYears.known ? facts.ageYears.value : null;
    const expectedDcsi = facts.dcsiTotal.known ? facts.dcsiTotal.value : null;
    const mismatched: string[] = [];
    if (expectedAge !== null && audit.echo.ageYears !== null && audit.echo.ageYears !== expectedAge) {
      mismatched.push(`年齡 輸入 ${expectedAge}／回抄 ${audit.echo.ageYears}`);
    }
    if (expectedDcsi !== null && audit.echo.dcsi !== null && audit.echo.dcsi !== expectedDcsi) {
      mismatched.push(`DCSI 輸入 ${expectedDcsi}／回抄 ${audit.echo.dcsi}`);
    }
    if (mismatched.length) {
      flags.push({
        code: "echo-mismatch",
        severity: "blocking",
        message: `判讀器抄回來的數字對不上輸入：${mismatched.join("；")}`,
        action: "很可能是兩位病人的輸出對調，或這一份讀到了別人的中介檔。整批的對應關係都要重查。",
      });
    }
  }

  if (llmRequested && !labNarrative) {
    flags.push({
      code: "narrative-call-failed",
      severity: "blocking",
      message: "③ 檢驗敘述失敗或解析不出來。",
      action: "觀察摘要、短期建議、中期目標三段會整段消失，其中短期建議沒有程式版的替代文字。重跑這一份。",
    });
  }

  // ── 可以使用，但要有人看過 ──────────────────────────────

  if (audit?.disagreements.length) {
    flags.push({
      code: "audit-disagreement",
      severity: "attention",
      message: `資料稽核提出 ${audit.disagreements.length} 則異議：${audit.disagreements
        .map((item) => `${item.topic}（程式判${item.program_decision}，稽核認為${item.your_view}）`)
        .join("；")}`,
      action: "稽核不能改判定，所以這裡是唯一會看到它的地方。打開醫師版的資料稽核一節確認。",
    });
  }

  const verdict = facts.diabetesType.verdict;
  if (verdict !== "type1-confirmed" && verdict !== "type2-confirmed") {
    flags.push({
      code: "diabetes-type-undetermined",
      severity: "attention",
      message:
        verdict === "conflicting"
          ? `申報診斷碼同時出現兩型：第 1 型 ${facts.diabetesType.type1IcdCodes.join("、")}；第 2 型 ${facts.diabetesType.type2IcdCodes.join("、")}`
          : "申報資料中沒有可判定糖尿病型別的診斷碼。",
      action:
        "目標與追蹤間隔一律套第 2 型的數值。兩型的餐後血糖上限差 20 mg/dL、篩檢起始時機也不同，若這位是第 1 型需重新判定。",
    });
  }

  /*
   * 診斷碼說第 2 型，但用藥只有胰島素、一顆非胰島素的藥都沒有。
   * 不推翻診斷碼，但這是編碼錯誤的第 1 型會有的樣子，而兩型的餐後血糖
   * 上限與篩檢起始時機都不同——判錯型別，整份報告的數字就是錯的。
   */
  if (facts.diabetesType.insulinOnly) {
    flags.push({
      code: "type2-but-insulin-only",
      severity: "attention",
      message: "診斷碼判為第 2 型，但用藥只有胰島素、沒有任何非胰島素的降血糖藥。",
      action: "這也可能是被編成第 2 型的第 1 型病人。報告目前套第 2 型的數值，請確認診斷類型。",
    });
  }

  const provisional = plan.decisions.filter((item) => item.provisional);
  if (provisional.length) {
    flags.push({
      code: "topic-provisional",
      severity: "attention",
      message: `${provisional.map((item) => item.topicName).join("、")}只由檢驗數值救回，未經診斷確認。`,
      action: "申報資料沒有採檢日期，證明不了異常持續三個月以上。醫師版標為需確認，需要病歷佐證才能當成確診。",
    });
  }

  if (labNarrative?.foundAfterAll.length) {
    flags.push({
      code: "program-miss",
      severity: "attention",
      message: `模型找到而程式門檻沒抓到的異常 ${labNarrative.foundAfterAll.length} 項。`,
      action: "這是規則表的缺口訊號，累積起來會指出該補哪一條規則。這一份本身不受影響。",
    });
  }

  if (labNarrative?.uncitedNumbers.length) {
    flags.push({
      code: "uncited-numbers",
      severity: "attention",
      message: `病人版有 ${labNarrative.uncitedNumbers.length} 個未列進引用清單的數字：${labNarrative.uncitedNumbers.join("、")}`,
      action: "這些數字沒被逐項核對過。確認它們不是模型自己算出來的。",
    });
  }

  if (labReview?.unverifiedValues.length) {
    flags.push({
      code: "clinician-unverified-values",
      severity: "attention",
      message: `醫師版出現 ${labReview.unverifiedValues.length} 個核不到來源的數值。`,
      action: "醫師版讀者是專業人員，不列為 blocking，但這些數值不可轉述給病人。",
    });
  }

  if (llmRequested && !audit) {
    flags.push({
      code: "audit-call-failed",
      severity: "attention",
      message: "① 資料稽核失敗或解析不出來。",
      action: "醫師版會少掉資料稽核一節，病人版不受影響。這一份的資料矛盾沒有人檢查過。",
    });
  }

  if (llmRequested && !labReview) {
    flags.push({
      code: "review-call-failed",
      severity: "attention",
      message: "② 檢驗判讀失敗或解析不出來。",
      action: "醫師版會少掉需核實的檢驗結果一節，病人版不受影響。",
    });
  }

  if (!plan.topicModuleIds.length) {
    flags.push({
      code: "no-topics",
      severity: "attention",
      message: "一個併發症主題都沒有納入。",
      action: "確認來源的 R／PR 欄位是不是整批缺漏。報告會只剩通用內容。",
    });
  }

  if (facts.labRecordCount === 0) {
    flags.push({
      code: "no-lab-records",
      severity: "attention",
      message: "完全沒有檢驗紀錄。",
      action: "門檻判定與檢驗敘述都無從產生，報告會明顯偏短。確認匯出是否漏了檢驗段。",
    });
  }

  // ── 只是紀錄 ───────────────────────────────────────────

  if (plan.targets.undetermined.length) {
    flags.push({
      code: "undetermined-targets",
      severity: "note",
      message: `${plan.targets.undetermined.length} 項因資料不足而未判定。`,
      action: "報告中已逐條說明，不需要額外處理。",
    });
  }

  flags.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return {
    id: input.id,
    needsReview: flags.some((item) => item.severity !== "note"),
    flags,
  };
}

export type BatchSummary = {
  total: number;
  needsReview: number;
  blocking: number;
  /** 各旗標出現在幾份案件中，由多到少 */
  byCode: Array<{ code: string; severity: ReviewSeverity; cases: number }>;
};

export function summarizeBatch(reviews: CaseReview[]): BatchSummary {
  const byCode = new Map<string, { code: string; severity: ReviewSeverity; cases: number }>();
  for (const review of reviews) {
    // 同一份裡同一個 code 只算一次，否則「幾份案件」會變成「幾個旗標」
    for (const code of new Set(review.flags.map((item) => item.code))) {
      const flag = review.flags.find((item) => item.code === code)!;
      const row = byCode.get(code) ?? { code, severity: flag.severity, cases: 0 };
      row.cases += 1;
      byCode.set(code, row);
    }
  }

  return {
    total: reviews.length,
    needsReview: reviews.filter((item) => item.needsReview).length,
    blocking: reviews.filter((item) => item.flags.some((flag) => flag.severity === "blocking")).length,
    byCode: [...byCode.values()].sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.cases - a.cases,
    ),
  };
}

const SEVERITY_LABEL: Record<ReviewSeverity, string> = {
  blocking: "不可直接使用",
  attention: "需人看過",
  note: "紀錄",
};

/**
 * 跑完之後直接可讀的清單。
 *
 * 只列需要行動的案件。三千份裡有兩千九百份沒事，把它們也印出來會讓真正
 * 該看的那幾份被埋掉——這份清單的用途是「接下來去看哪幾份」。
 */
export function formatBatchReview(reviews: CaseReview[]): string {
  const summary = summarizeBatch(reviews);
  const lines: string[] = [
    "需人工檢查清單",
    "",
    `共 ${summary.total} 份，其中 ${summary.needsReview} 份需要人看過，${summary.blocking} 份不可直接使用。`,
    "",
  ];

  if (summary.byCode.length) {
    lines.push("依原因統計（同一份可能有多個原因）：", "");
    for (const row of summary.byCode) {
      lines.push(`  ${row.cases} 份　[${SEVERITY_LABEL[row.severity]}] ${row.code}`);
    }
    lines.push("");
  }

  const needing = reviews.filter((item) => item.needsReview);
  if (!needing.length) {
    lines.push("沒有需要人工檢查的案件。");
    return `${lines.join("\n")}\n`;
  }

  lines.push("逐份明細：", "");
  for (const review of needing) {
    lines.push(`── ${review.id} ──`);
    for (const flag of review.flags) {
      if (flag.severity === "note") continue;
      lines.push(`  [${SEVERITY_LABEL[flag.severity]}] ${flag.message}`);
      lines.push(`      → ${flag.action}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}
