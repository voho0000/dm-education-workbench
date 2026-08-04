/**
 * 第四層：確定性輸出驗證器。
 *
 * 這裡只檢查「可以用程式 100% 判定」的事。判斷語氣、可讀性、臨床合理性
 * 仍然需要人或 LLM 稽核——但那些不應該和這些機械規則混在一起評分。
 *
 * 用途有二：
 *   1. 在 LLM 稽核之前先跑，把機械違規直接標出來。
 *   2. 作為 A/B/C 比較的評分器。它不會漂移，所以跨 arm 的分數可以直接比較。
 */

export type CheckId =
  | "no-symbol-bullets"
  | "no-markdown-emphasis"
  | "no-risk-labels"
  | "no-internal-codes"
  | "required-headings"
  | "single-separator"
  | "pr-omitted-when-r-positive"
  | "iso-report-date"
  | "numbers-supported"
  | "no-self-medication-change"
  | "evidence-sources";

export type CheckResult = {
  id: CheckId;
  label: string;
  passed: boolean;
  /** 違規的具體位置與內容，最多列 10 筆 */
  violations: string[];
  /** 這項檢查是否適用於目前的 profile */
  applicable: boolean;
};

export type ValidationReport = {
  profile: ValidationProfile;
  results: CheckResult[];
  applicableCount: number;
  passedCount: number;
  /** 通過率，0–1。分母只算適用的檢查。 */
  score: number;
};

export type ValidationProfile = "v14" | "workbench" | "modules";

/**
 * 指引與一般照護中會合法出現、但不會出現在病人申報資料裡的數值。
 * 出現在這份清單裡的數字不會被 numbers-supported 判為捏造。
 * 這份清單本身就是「應該被抽出來管理的門檻值」——目前 v14 prompt 把它們寫死在散文裡。
 */
export const GUIDELINE_TARGET_NUMBERS = new Set([
  "7", "7.0", "7.5", "8", "8.0", "8.5", // HbA1c 目標
  "70", "100", "40", "50", // LDL-C / HDL-C 目標
  "130", "140", "150", "80", "90", // 血壓目標
  "160", "180", "250", // 血糖目標與嚴重高血糖門檻
  "30", "60", "15", "45", // eGFR 分期與 UACR
  "1.73", // eGFR 單位 mL/min/1.73m²
  "65", "80", // 年齡門檻
  "119", "1925", // 緊急電話與安心專線
  "128", // 音叉震動感檢查頻率 128 Hz
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", // 條列編號
  "0", "12", "24", "48",
  "2022", "2024", "2026", // 指引、年鑑與報告年份
]);

const REQUIRED_V14_HEADINGS = [
  "一、觀察與提醒",
  "二、短期目標",
  "三、中期目標",
  "四、並發症預防與照護",
  "五、溫馨叮嚀",
];

const RISK_LABEL_PATTERN = /(高風險|中風險|低風險)/g;
const RISK_LABEL_ALLOWED = /高風險族群/;
const INTERNAL_CODE_PATTERN = /\b(?:R[1-7]|PR[1-7]|DCSI)\b|總分|得分|[0-9０-９]\s*分(?![鐘鍾])/g;
const SELF_MED_CHANGE_PATTERN = /自行(?:停藥|減藥|加藥|換藥|停用|調整劑量|增減劑量|增減藥量|更改劑量|更換藥品)/g;
/**
 * 「不自行停藥」「請勿自行停藥」「切勿自行減藥」都是正確衛教，只有肯定句才是違規。
 * 判定方式：看該次出現前 15 字內有沒有否定詞。
 * 已知限制：前文若因其他原因出現否定詞會漏判，屬於寧可漏報不誤報的取捨。
 */
const NEGATION_NEAR = /[不勿禁避免切別毋]/;
const NEGATION_WINDOW = 15;

function collectLineViolations(text: string, test: (line: string) => string | null): string[] {
  const violations: string[] = [];
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const hit = test(lines[index]);
    if (hit !== null) violations.push(`第 ${index + 1} 行：${hit}`);
    if (violations.length >= 10) break;
  }
  return violations;
}

function extractNumbers(text: string): string[] {
  return [...text.matchAll(/\d+(?:\.\d+)?/g)].map((match) => match[0]);
}

function check(id: CheckId, label: string, applicable: boolean, violations: string[]): CheckResult {
  return { id, label, applicable, passed: applicable ? violations.length === 0 : true, violations };
}

export type ValidateArgs = {
  report: string;
  /** 生成時實際送進去的病人資料，用來做 numbers-supported */
  patientText: string;
  profile: ValidationProfile;
  /** 已發生併發症為正的項目編號，例如 [2, 4]，用來檢查對應 PR 是否已省略 */
  positiveComplications?: number[];
  /**
   * 由輸入資料合法推導出來、但不會逐字出現的數字，例如以出生日期與報告日期算出的年齡。
   * 不列進來的話 numbers-supported 會把正確的推導誤判為捏造。
   */
  derivedNumbers?: Array<string | number>;
};

/** DRAFT 橫幅是版本標記，不是臨床內容，數字檢查要排除它。 */
function stripBanner(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("※ DRAFT"))
    .join("\n");
}

export function validateReport(args: ValidateArgs): ValidationReport {
  const { patientText, profile, positiveComplications = [], derivedNumbers = [] } = args;
  const report = stripBanner(args.report);
  const isV14 = profile === "v14";
  const isModules = profile === "modules";
  const results: CheckResult[] = [];

  results.push(
    check(
      "no-symbol-bullets",
      "沒有任何一行以 - * + • ‧ 開頭",
      isV14,
      collectLineViolations(report, (line) => {
        const trimmed = line.trimStart();
        return /^[-*+•‧]\s/.test(trimmed) ? trimmed.slice(0, 60) : null;
      }),
    ),
  );

  results.push(
    check(
      "no-markdown-emphasis",
      "沒有 Markdown 粗體、標題符號或表格符號",
      isV14,
      collectLineViolations(report, (line) => {
        if (/\*\*/.test(line)) return `使用了 ** ：${line.trim().slice(0, 60)}`;
        if (/^\s*#/.test(line)) return `使用了 # 標題：${line.trim().slice(0, 60)}`;
        if (/\|.*\|/.test(line)) return `疑似表格：${line.trim().slice(0, 60)}`;
        return null;
      }),
    ),
  );

  results.push(
    check(
      "no-risk-labels",
      "沒有把高／中／低風險當成分級標籤",
      isV14,
      collectLineViolations(report, (line) => {
        const matches = line.match(RISK_LABEL_PATTERN);
        if (!matches) return null;
        const withoutAllowed = line.replace(new RegExp(RISK_LABEL_ALLOWED.source, "g"), "");
        return RISK_LABEL_PATTERN.test(withoutAllowed) ? line.trim().slice(0, 60) : null;
      }),
    ),
  );

  results.push(
    check(
      "no-internal-codes",
      "病人可見內容沒有 R／PR／DCSI 代碼或分數",
      isV14 || isModules,
      (() => {
        // v14 的醫師版允許代碼，只檢查分隔線之後的病人版。
        const patientSection = isV14 && report.includes("[AI_SECTION_SEPARATOR]")
          ? report.split("[AI_SECTION_SEPARATOR]").slice(1).join("\n")
          : report;
        return collectLineViolations(patientSection, (line) => {
          const matches = line.match(INTERNAL_CODE_PATTERN);
          return matches ? `${matches.join("、")}｜${line.trim().slice(0, 50)}` : null;
        });
      })(),
    ),
  );

  results.push(
    check(
      "required-headings",
      "五大標題逐字完整且順序正確",
      isV14,
      (() => {
        const positions = REQUIRED_V14_HEADINGS.map((heading) => ({ heading, at: report.indexOf(heading) }));
        const missing = positions.filter((item) => item.at === -1).map((item) => `缺少「${item.heading}」`);
        if (missing.length) return missing;
        const order = positions.map((item) => item.at);
        const sorted = [...order].sort((a, b) => a - b);
        return order.every((value, index) => value === sorted[index]) ? [] : ["五大標題出現順序與規定不符"];
      })(),
    ),
  );

  results.push(
    check(
      "single-separator",
      "[AI_SECTION_SEPARATOR] 恰好出現一次",
      isV14,
      (() => {
        const count = report.split("[AI_SECTION_SEPARATOR]").length - 1;
        return count === 1 ? [] : [`出現 ${count} 次`];
      })(),
    ),
  );

  results.push(
    check(
      "pr-omitted-when-r-positive",
      "已發生併發症的項目不出現在未來風險預測清單",
      isV14 && positiveComplications.length > 0,
      positiveComplications
        .filter((index) => new RegExp(`PR${index}\\b`).test(report))
        .map((index) => `R${index} 大於 0，但報告中仍出現 PR${index}`),
    ),
  );

  results.push(
    check(
      "iso-report-date",
      "報告日期使用 YYYY-MM-DD",
      isV14,
      (() => {
        const badFormats = [...report.matchAll(/\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日|\d{4}\/\d{1,2}\/\d{1,2}/g)].map(
          (match) => match[0],
        );
        return badFormats.slice(0, 10).map((item) => `非 ISO 日期格式：${item}`);
      })(),
    ),
  );

  results.push(
    check(
      "numbers-supported",
      "報告中的數字都能在輸入資料或指引目標值中找到",
      true,
      (() => {
        const inputNumbers = new Set(extractNumbers(patientText));
        for (const value of derivedNumbers) inputNumbers.add(String(value));
        const unsupported = new Set<string>();
        for (const value of extractNumbers(report)) {
          if (inputNumbers.has(value)) continue;
          if (GUIDELINE_TARGET_NUMBERS.has(value)) continue;
          unsupported.add(value);
        }
        return [...unsupported].slice(0, 10).map((value) => `輸入資料中找不到的數字：${value}`);
      })(),
    ),
  );

  results.push(
    check(
      "no-self-medication-change",
      "沒有建議病人自行停藥、改藥或調整劑量",
      true,
      collectLineViolations(report, (line) => {
        for (const match of line.matchAll(SELF_MED_CHANGE_PATTERN)) {
          const before = line.slice(Math.max(0, (match.index ?? 0) - NEGATION_WINDOW), match.index);
          if (!NEGATION_NEAR.test(before)) return `${match[0]}｜${line.trim().slice(0, 60)}`;
        }
        return null;
      }),
    ),
  );

  results.push(
    check(
      "evidence-sources",
      "完整引用兩份來源與免責聲明",
      isV14,
      (() => {
        const missing: string[] = [];
        if (!report.includes("2022第2型糖尿病臨床照護指引")) missing.push("缺少 2022 臨床照護指引來源");
        if (!report.includes("糖尿病年鑑")) missing.push("缺少臺灣糖尿病年鑑來源");
        return missing;
      })(),
    ),
  );

  const applicable = results.filter((item) => item.applicable);
  const passed = applicable.filter((item) => item.passed);

  return {
    profile,
    results,
    applicableCount: applicable.length,
    passedCount: passed.length,
    score: applicable.length ? passed.length / applicable.length : 1,
  };
}

export function summarizeValidation(report: ValidationReport): string {
  const lines = [`確定性驗證：${report.passedCount}/${report.applicableCount} 項通過（${Math.round(report.score * 100)}%）`];
  for (const item of report.results) {
    if (!item.applicable) continue;
    lines.push(`${item.passed ? "✓" : "✗"} ${item.label}`);
    for (const violation of item.violations) lines.push(`    ${violation}`);
  }
  return lines.join("\n");
}
