/**
 * 用來源自己帶的參考範圍判定「超出範圍」，並整理成可以交給 LLM 歸納的結構。
 *
 * 為什麼這一層值得做：五位病人共 7,549 筆有數值的檢驗，其中 80%（6,030 筆）
 * 的參考範圍是機器可讀的 `[下限][上限]` 格式。也就是說「超出參考範圍」不需要
 * 我維護一張幾百個分析物的門檻表——一個解析器就涵蓋掉了，而且範圍是跟著每一筆
 * 紀錄走的，不是猜的。3000 位病人不會讓這件事變難。
 *
 * 但直接把結果列出來沒有用：6,030 筆裡有 3,511 筆超出範圍（58%）。逐筆列等於
 * 沒有標記，而且用健康人的參考範圍去判糖尿病人的血糖會產生大量假警報
 * （Glucose AC 113、參考上限 110，對糖尿病人根本不算異常）。
 *
 * 所以這一層只負責「算出結構化事實」，分流與歸納交給 LLM，
 * 而 LLM 只能引用這裡算出來的東西。
 */

import type { LabItemFact, PatientFacts } from "./patient-facts.ts";

export type ReferenceRange = { lo: number | null; hi: number | null; raw: string };

/** 解析檢驗值，容許 ≧ ＜ 等不等號前綴。 */
export function parseNumericValue(raw: string): number | null {
  const match = String(raw).trim().match(/^[≧≥><＞＜≦≤]?\s*(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function boundary(text: string): number | null {
  const match = String(text).trim().match(/^[＜<>＞≦≤≧≥]?\s*=?\s*(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

/**
 * 解析來源的參考值欄位。
 * 主要格式是 `[下限][上限]`；也支援單欄位內的區間或不等式。
 * `[NIL][]`、`[無][無]`、`[.][.]` 這類代表沒有給範圍，回傳 null。
 */
export function parseReferenceRange(raw: string | null): ReferenceRange | null {
  if (!raw) return null;
  const brackets = String(raw).match(/\[([^\]]*)\]/g);
  if (!brackets) return null;
  const inner = brackets.map((part) => part.slice(1, -1).trim()).filter(Boolean);
  if (!inner.length) return null;

  // 1) 括號內本身就是完整區間。來源有兩種寫法：`[70][110]`（分放兩格）
  //    以及 `[7-25][7-25]`、`[3.5~5.1][3.5~5.1]`（兩格各放整段）。
  //    先找區間，否則後者會被讀成 lo=7、hi=7，讓任何不等於 7 的值都變成異常。
  for (const segment of inner) {
    const match = segment.match(/(\d+(?:\.\d+)?)\s*[-~–—]\s*(\d+(?:\.\d+)?)/);
    if (match) {
      const lo = Number(match[1]);
      const hi = Number(match[2]);
      if (lo <= hi) return { lo, hi, raw: String(raw) };
    }
  }

  // 2) 不等式，例如 `[][＜5]`、`[＞=90][]`、`[＜1 (評估感染…)]`
  for (const segment of inner) {
    let match = segment.match(/^[＜<]\s*=?\s*(\d+(?:\.\d+)?)/);
    if (match) return { lo: null, hi: Number(match[1]), raw: String(raw) };
    match = segment.match(/^[＞>]\s*=?\s*(\d+(?:\.\d+)?)/);
    if (match) return { lo: Number(match[1]), hi: null, raw: String(raw) };
  }

  // 3) 兩格各放一個數字的 `[下限][上限]`。
  //    兩邊相同時視為無法判定——那幾乎一定是上面那種「兩格各放整段」的殘留，
  //    寧可放棄也不要產生一個「只有單一數值算正常」的退化範圍。
  if (inner.length >= 2) {
    const lo = boundary(inner[0]);
    const hi = boundary(inner[1]);
    if (lo !== null && hi !== null && lo < hi) return { lo, hi, raw: String(raw) };
  }

  return null;
}

export type OutOfRangeFinding = {
  itemName: string;
  orderCodes: string[];
  unit: string | null;
  range: ReferenceRange;
  /** 超出範圍的筆數 */
  outCount: number;
  totalCount: number;
  /** 偏離最遠的那一筆 */
  worst: number;
  direction: "low" | "high" | "both";
  feeMonths: string[];
  /** 偏離幅度，用來排序：超出邊界的比例 */
  deviation: number;
};

/**
 * 已由指引門檻表個別判定的項目不重複列在這裡。
 * 糖尿病人的血糖、糖化血色素、血脂本來就不該用健康人參考範圍判定。
 */
const HANDLED_BY_GUIDELINE =
  /glucose|sugar|血糖|葡萄糖|HbA1c|Hb\s*A1c|醣化血色素|eGFR|Albumin\s*\/\s*Creatinine|LDL|HDL|Triglyceride|三酸甘油|^K$|^Na$|Potassium|Sodium|血鉀|血鈉/i;

function deviationOf(value: number, range: ReferenceRange): number {
  if (range.hi !== null && value > range.hi) {
    return range.hi === 0 ? 1 : (value - range.hi) / Math.abs(range.hi);
  }
  if (range.lo !== null && value < range.lo) {
    return range.lo === 0 ? 1 : (range.lo - value) / Math.abs(range.lo);
  }
  return 0;
}

export type ReferenceScan = {
  findings: OutOfRangeFinding[];
  /** 有數值的筆數 */
  numericRecords: number;
  /** 參考範圍可解析的筆數 */
  withRange: number;
  /** 超出範圍的筆數 */
  outOfRange: number;
  /** 已由指引門檻表處理、因此不列入的項目數 */
  handledByGuideline: number;
};

export function scanReferenceRanges(facts: PatientFacts): ReferenceScan {
  const findings: OutOfRangeFinding[] = [];
  let numericRecords = 0;
  let withRange = 0;
  let outOfRange = 0;
  let handledByGuideline = 0;

  for (const item of facts.labItems as LabItemFact[]) {
    const values = item.rawValues.map(parseNumericValue).filter((v): v is number => v !== null);
    if (!values.length) continue;
    numericRecords += values.length;

    if (HANDLED_BY_GUIDELINE.test(item.itemName)) {
      handledByGuideline += 1;
      continue;
    }

    const range = parseReferenceRange(item.referenceRange);
    if (!range) continue;
    withRange += values.length;

    const outliers = values.filter((value) => deviationOf(value, range) > 0);
    if (!outliers.length) continue;
    outOfRange += outliers.length;

    const low = outliers.some((v) => range.lo !== null && v < range.lo);
    const high = outliers.some((v) => range.hi !== null && v > range.hi);
    const worst = outliers.reduce((a, b) => (deviationOf(b, range) > deviationOf(a, range) ? b : a));

    findings.push({
      itemName: item.itemName,
      orderCodes: item.orderCodes,
      unit: item.unit,
      range,
      outCount: outliers.length,
      totalCount: values.length,
      worst,
      direction: low && high ? "both" : low ? "low" : "high",
      feeMonths: item.feeMonths,
      deviation: deviationOf(worst, range),
    });
  }

  findings.sort((a, b) => b.deviation - a.deviation || b.outCount - a.outCount);
  return { findings, numericRecords, withRange, outOfRange, handledByGuideline };
}

/** 交給 LLM 歸納用的結構化摘要。刻意不含原始逐筆紀錄。 */
export function scanForPrompt(scan: ReferenceScan, limit = 40): string {
  if (!scan.findings.length) return "（沒有超出來源參考範圍的其他檢驗項目。）";
  const lines = scan.findings.slice(0, limit).map((item) => {
    const range = `${item.range.lo ?? "-"}~${item.range.hi ?? "-"}`;
    const unit = item.unit && !/^(無|未提供|N\/A|null)$/i.test(item.unit) ? ` ${item.unit}` : "";
    return `${item.itemName}｜最偏離 ${item.worst}${unit}（參考 ${range}）｜${item.direction === "low" ? "偏低" : item.direction === "high" ? "偏高" : "高低都有"}｜${item.outCount}/${item.totalCount} 筆超出`;
  });
  const more = scan.findings.length > limit ? `\n（另有 ${scan.findings.length - limit} 個項目超出範圍，依偏離幅度排序後未列出）` : "";
  return lines.join("\n") + more;
}

export const LAB_TRIAGE_PROMPT = `你是協助整理檢驗報告的助手，讀者是忙碌的醫師。

輸入是一份「超出來源參考範圍」的檢驗項目清單，已經由程式算好。糖尿病照護的核心指標（血糖、糖化血色素、腎功能、血脂、電解質）已在報告的其他區塊依臨床指引判定過，不在這份清單裡。

你的任務只有兩件：

1. 把這些項目依生理系統分組（例如血液學、肝膽、血氣與酸鹼、發炎指標、凝血、其他），每組給一句話說明整體型態。
2. 指出其中哪些組合值得醫師優先看一眼，並說明理由。

嚴格限制：
- 只能使用清單中出現的項目名稱與數值，不得引入清單以外的任何項目或數字。
- 不得重新判讀數值，不得推測診斷，不得提出處置建議。
- 這些檢驗只有費用年月、沒有採檢日期，不得敘述趨勢、先後順序或「最近一次」。
- 數值可能來自兩年前的急性事件，不得當成目前狀態。
- 若某一組沒有臨床意義，就說它可能只是反映當時的急性狀況或檢體條件，不要硬掰。

輸出格式：只輸出一個 JSON 物件，不要加說明文字或程式碼圍籬。

{
  "groups": [
    { "system": "系統名稱", "items": ["清單中的項目名稱"], "pattern": "一句話描述整體型態" }
  ],
  "worth_a_look": ["值得優先看的組合與理由，每則 60 字以內"]
}`;

export type LabTriage = {
  groups: Array<{ system: string; items: string[]; pattern: string }>;
  worth_a_look: string[];
};

/**
 * 解析並驗證 LLM 的歸納結果。
 * 引用了清單以外的項目一律剔除——這是唯一能防止它自己加菜的方法。
 */
export function parseLabTriage(raw: string, scan: ReferenceScan): { triage: LabTriage; rejected: string[] } {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first === -1 || last <= first) throw new Error("檢驗歸納器沒有回傳可解析的 JSON。");
    parsed = JSON.parse(candidate.slice(first, last + 1));
  }
  const record = (parsed ?? {}) as Record<string, unknown>;

  const known = new Set(scan.findings.map((item) => item.itemName));
  const rejected: string[] = [];

  const groups = (Array.isArray(record.groups) ? record.groups : [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => {
      const items = (Array.isArray(item.items) ? item.items : []).map(String);
      const kept = items.filter((name) => {
        if (known.has(name)) return true;
        rejected.push(name);
        return false;
      });
      return { system: String(item.system ?? "").trim(), items: kept, pattern: String(item.pattern ?? "").trim() };
    })
    .filter((item) => item.system && item.items.length);

  const worth = (Array.isArray(record.worth_a_look) ? record.worth_a_look : [])
    .filter((item) => typeof item === "string")
    .map(String);

  return { triage: { groups, worth_a_look: worth }, rejected };
}

export function formatTriage(triage: LabTriage, scan: ReferenceScan, rejected: string[]): string {
  const lines: string[] = [];
  lines.push(
    `本區塊涵蓋糖尿病核心指標以外的檢驗：${scan.withRange} 筆有可解析的參考範圍，其中 ${scan.outOfRange} 筆超出範圍，分屬 ${scan.findings.length} 個項目。以下分組由輔助判讀器整理，未做臨床判定。`,
  );
  for (const group of triage.groups) {
    lines.push(`  ${group.system}：${group.pattern}`);
    lines.push(`    項目：${group.items.join("、")}`);
  }
  if (triage.worth_a_look.length) {
    lines.push("  值得優先看：");
    for (const item of triage.worth_a_look) lines.push(`    - ${item}`);
  }
  if (rejected.length) {
    lines.push(`  ⚠ 輔助判讀器引用了清單以外的項目，已剔除：${[...new Set(rejected)].join("、")}`);
  }
  return lines.join("\n");
}
