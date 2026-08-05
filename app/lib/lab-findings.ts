/**
 * 把申報檢驗紀錄裡的實際數值接進指引門檻判定。
 *
 * 為什麼需要：獨立稽核指出，病人的 UACR≧300、eGFR 41.1／32.4 明明就在資料裡，
 * 已經達到指引「至少每半年監測」的門檻，兩份報告卻只給「一般每年評估一次」的
 * 通用敘述，還寫「實際數值需由檢驗結果確認」——數值就在旁邊卻沒有被串起來。
 *
 * 兩條硬規則：
 *   1. 來源沒有採檢日，只有費用年月。因此**永遠不說「最近一次」或「趨勢」**，
 *      一律敘述為「資料中曾出現」，並附上費用年月。
 *   2. 項目名稱映射保守。看不懂的名稱寧可不對應，也不要猜錯：
 *      單位為空、值含 + 號的 Glucose 是尿糖不是血糖；
 *      單位 g/dL 的 Albumin 是血清白蛋白，不是尿液白蛋白。
 */

import { RULES_BY_ID, citationText } from "./guideline-rules.ts";
import type { LabItemFact, PatientFacts } from "./patient-facts.ts";

export type Analyte =
  | "eGFR"
  | "UACR"
  | "HbA1c"
  | "fasting-glucose"
  | "postprandial-glucose"
  | "LDL-C"
  | "HDL-C"
  | "triglyceride"
  | "creatinine"
  | "potassium"
  | "sodium"
  | "haemoglobin"
  | "glucose-unspecified";

const ANALYTE_LABELS: Record<Analyte, string> = {
  eGFR: "腎絲球過濾率（eGFR）",
  UACR: "尿液白蛋白／肌酸酐比值（UACR）",
  HbA1c: "糖化血色素（HbA1c）",
  "fasting-glucose": "飯前血糖",
  "postprandial-glucose": "餐後血糖",
  "LDL-C": "低密度脂蛋白膽固醇（LDL-C）",
  "HDL-C": "高密度脂蛋白膽固醇（HDL-C）",
  triglyceride: "三酸甘油酯",
  creatinine: "血清肌酸酐",
  potassium: "血鉀",
  sodium: "血鈉",
  haemoglobin: "血色素（Hb）",
  "glucose-unspecified": "血糖（未標示採檢時機）",
};

/**
 * 醫師版的項目名稱：一律用檢驗報告本來的名稱，不加中文對照。
 *
 * 為什麼不是「英文（中文）」：那需要一張涵蓋所有項目的對照表，而判讀器
 * 回傳什麼名稱取決於各家醫院的原始資料（Glu.(Dipstick)、Albumin(Dipstick)
 * 這類查不到中文），漏一個就又變成一半有、一半沒有。
 * 「都沒有」是唯一保證得了的一致性，而且對醫師本來就夠。
 * 病人版不用這一套，維持中文（英文縮寫）。
 */
const CLINICIAN_LABELS: Record<Analyte, string> = {
  eGFR: "eGFR",
  UACR: "UACR",
  HbA1c: "HbA1c",
  "fasting-glucose": "Glucose AC",
  "postprandial-glucose": "Glucose PC",
  "LDL-C": "LDL-C",
  "HDL-C": "HDL-C",
  triglyceride: "TG",
  creatinine: "Cr",
  potassium: "K",
  sodium: "Na",
  haemoglobin: "Hb",
  // 括號裡是限定條件不是翻譯，移到後面與筆數同一個括號
  "glucose-unspecified": "Glucose",
};

type Matcher = {
  analyte: Analyte;
  name: RegExp;
  /** 單位必須符合才採用；null 表示不檢查單位。 */
  unit?: RegExp;
  /** 名稱符合但要排除的情形 */
  excludeName?: RegExp;
  /** 醫令代碼落在此範圍時排除（例如尿液檢查） */
  excludeOrderCodes?: RegExp;
  /**
   * 醫令代碼符合時直接採用，不再要求名稱相符。
   *
   * 名稱寫法各院不同（Glu-AC、GLU_AC、Sugar(One touch)、血液及體液葡萄糖），
   * 靠正則列舉一定會漏。實測漏掉一位病人 63 筆 Glu-AC，其中含 20 mg/dL，
   * 導致報告寫「最低 68」而真正的最低值是 20——那是第二級低血糖。
   * 醫令代碼是健保定義的，比名稱可靠。
   */
  includeOrderCodes?: RegExp;
};

/**
 * 保守映射。每一條都對應實際在申報資料中出現過的項目名稱。
 * Dipstick 的 Creatinine 與 Albumin 是尿液試紙項目，不對應血清指標。
 */
const MATCHERS: Matcher[] = [
  { analyte: "eGFR", name: /^eGFR(\s*\((MDRD|CKD-EPI)\))?$/i },
  { analyte: "UACR", name: /Albumin\s*\/\s*Creatinine/i },
  { analyte: "HbA1c", name: /^(HbA1c|Hb\s*A1c)/i, unit: /%/ },
  {
    // 只有名稱明確標示空腹／AC／飯前，才套用空腹血糖目標。
    analyte: "fasting-glucose",
    name: /(Glu(cose)?[-_\s]*AC|Glucose\(AC\)|Sugar[-_\s]*AC|空腹|飯前)/i,
    unit: /mg\s*\/?\s*d[lL]/i,
    excludeOrderCodes: /^(06012C|06013C)$/,
  },
  {
    // 餐後血糖有自己的指引目標（80–160），先前完全沒有對應的 analyte，
    // 所以 Glu-PC 208 這種超標值不會被比對到。
    analyte: "postprandial-glucose",
    name: /(Glu(cose)?[-_\s]*PC|Sugar[-_\s]*PC|餐後|飯後)/i,
    unit: /mg\s*\/?\s*d[lL]/i,
    excludeOrderCodes: /^(06012C|06013C)$/,
  },
  {
    /**
     * 其餘血糖。名稱沒有標示採檢時機（Sugar(One touch)、Glucose(spot)、
     * Glucose (Random)、血液及體液葡萄糖…），因此不能套空腹目標，
     * 但也絕不能整批丟掉——稽核就是在這裡發現數十筆 200–500 mg/dL 完全沒被看到。
     * 用醫令代碼排除尿液檢查（06012C 尿液常規、06013C 尿糖）。
     */
    analyte: "glucose-unspecified",
    name: /(glucose|sugar|血糖|葡萄糖)/i,
    // eAG（估計平均血糖）是由 HbA1c 換算出來的推估值，不是實測血糖。
    // 把它算進血糖統計等於把同一筆 HbA1c 重複計一次，且會讓「曾出現的血糖值」
    // 出現一個從來沒有真正測過的數字。
    excludeName: /estimated\s+average\s+glucose|\beAG\b/i,
    unit: /mg\s*\/?\s*d[lL]/i,
    excludeOrderCodes: /^(06012C|06013C)$/,
    // 09005C／09140C 是健保的「血液及體液葡萄糖」，名稱怎麼寫都算血糖。
    includeOrderCodes: /^(09005C|09140C)$/,
  },
  { analyte: "LDL-C", name: /LDL[-\s]?(cholesterol|Cho)/i, unit: /mg\s*\/?\s*d[lL]/i },
  { analyte: "HDL-C", name: /HDL[-\s]?(cholesterol|Cho)/i, unit: /mg\s*\/?\s*d[lL]/i },
  { analyte: "triglyceride", name: /Triglyceride/i, unit: /mg\s*\/?\s*d[lL]/i },
  { analyte: "potassium", name: /^(K|Potassium|血鉀)$/i, unit: /mmol\s*\/?\s*L/i },
  { analyte: "sodium", name: /^(Na|Sodium|血鈉)$/i, unit: /mmol\s*\/?\s*L/i },
  // 腎性貧血：eGFR 下降的病人常見，而且會讓糖化血色素失真。
  // 排除糖化血色素，否則 HbA1c 會被當成血色素抓進來。
  {
    analyte: "haemoglobin",
    name: /^(H[Bb]|H[ae]?moglobin|H[ae]?moglobin\s*血色素|血色素)$/i,
    excludeName: /A1c|A1C|糖化/i,
    unit: /g\s*\/?\s*d[lL]/i,
  },
  {
    analyte: "creatinine",
    /*
     * 靠名稱窮舉一定會漏。同一個醫令底下實測出現六種寫法——
     * CRE(11)、CRE(肌酸酐)(8)、CREA(1)、Creatinine(11)、Creatinine(B)(9)、
     * Creatinine 肌酸酐(1)——舊的比對式只認得其中三種，而且還把 `(B)` 排掉，
     * 但 (B) 就是 blood、正是我們要的血清肌酸酐。41 筆裡只抓到 20 筆，
     * 於是對兩位病人謊報「沒有肌酸酐紀錄」。
     *
     * 改以醫令代碼為準：09015C 是健保的「肌酸酐、血」。這跟血糖改用
     * 09005C／09140C 判定是同一個教訓——名稱怎麼寫都可能變，醫令代碼不會。
     */
    name: /(Creatinine|\bCREA?\b|肌酸酐)/i,
    /*
     * 09015C 底下同時掛著由肌酸酐換算的 eGFR（79 筆），那是另一個指標。
     * eGFR 有自己的比對式而且排在前面，但正確性不該靠陣列順序保證。
     * Dipstick 是尿液試紙；「CRE screening」是抗藥菌培養，跟腎功能無關——
     * 名稱放寬之後正好會咬到它，所以一起排除。
     */
    excludeName: /eGFR|Dipstick|Albumin\s*\/\s*Creatinine|screening/i,
    includeOrderCodes: /^09015C$/,
    excludeOrderCodes: /^(06012C|06013C|13007C)$/,
    unit: /mg\s*\/?\s*d[lL]/i,
  },
];

export type ParsedValue = {
  raw: string;
  value: number;
  /** ≧300 這種帶不等號的值，判定門檻時要考慮方向 */
  qualifier: "=" | ">" | ">=" | "<" | "<=";
};

/** 解析 `≧300 (2+)`、`＞150`、`＜1.5`、`40.4` 這類值。 */
export function parseLabValue(raw: string): ParsedValue | null {
  const text = raw.trim();
  const match = text.match(/^([≧≥>＞<＜≦≤]?)\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[2]);
  if (!Number.isFinite(value)) return null;
  const symbol = match[1];
  const qualifier: ParsedValue["qualifier"] =
    symbol === "≧" || symbol === "≥" ? ">=" :
    symbol === ">" || symbol === "＞" ? ">" :
    symbol === "≦" || symbol === "≤" ? "<=" :
    symbol === "<" || symbol === "＜" ? "<" : "=";
  return { raw: text, value, qualifier };
}

export type AnalyteFinding = {
  analyte: Analyte;
  label: string;
  unit: string | null;
  values: ParsedValue[];
  min: number;
  max: number;
  feeMonths: string[];
  /** 來源是否提供採檢日。目前申報資料一律 false。 */
  hasDrawDates: boolean;
};

function matches(item: LabItemFact): Analyte | null {
  for (const matcher of MATCHERS) {
    const byCode = matcher.includeOrderCodes
      ? item.orderCodes.some((code) => matcher.includeOrderCodes!.test(code))
      : false;
    if (!byCode && !matcher.name.test(item.itemName)) continue;
    if (matcher.excludeName?.test(item.itemName)) continue;
    if (matcher.excludeOrderCodes && item.orderCodes.some((code) => matcher.excludeOrderCodes!.test(code))) continue;
    if (matcher.unit && !(item.unit && matcher.unit.test(item.unit))) continue;
    return matcher.analyte;
  }
  return null;
}

/**
 * 資料中實測到的最低血糖，飯前與未標示採檢時機的都算。
 * 判定低血糖時兩者都要看——未標示時機不代表那個值不是真的。
 */
export function lowestMeasuredGlucose(findings: AnalyteFinding[]): number | null {
  const values = findings
    .filter(
      (item) =>
        item.analyte === "fasting-glucose" ||
        item.analyte === "postprandial-glucose" ||
        item.analyte === "glucose-unspecified",
    )
    .map((item) => item.min);
  return values.length ? Math.min(...values) : null;
}

/**
 * 判讀器回報的項目名稱是否就是程式已經逐條判定過的核心指標。
 * 兩節合併後要靠它去重，否則血鈉、血鉀、血糖會在同一份報告出現兩次。
 */
export function analyteForItemName(name: string, unit?: string | null): Analyte | null {
  for (const matcher of MATCHERS) {
    if (!matcher.name.test(name)) continue;
    if (matcher.excludeName?.test(name)) continue;
    if (matcher.unit && unit && !matcher.unit.test(unit)) continue;
    return matcher.analyte;
  }
  return null;
}

/**
 * 糖尿病照護該有、但這位病人的紀錄中完全沒有出現的核心指標。
 *
 * 敘述器只讀得到存在的紀錄，沒有紀錄的東西對它來說不存在。缺檢和異常
 * 一樣值得病人知道（一位病人完全沒有糖化血色素），所以由程式算出來
 * 餵給它，讓它寫進同一段裡，而不是在別處另外印一行。
 */
const CORE_ANALYTES: Array<[Analyte, string]> = [
  ["HbA1c", "糖化血色素（HbA1c）"],
  ["eGFR", "腎絲球過濾率（eGFR）"],
  ["UACR", "尿液白蛋白／肌酸酐比值（UACR）"],
  ["creatinine", "血清肌酸酐"],
  ["LDL-C", "低密度脂蛋白膽固醇"],
  ["HDL-C", "高密度脂蛋白膽固醇"],
  ["triglyceride", "三酸甘油酯"],
];

export function missingCoreAnalytes(findings: AnalyteFinding[]): string[] {
  const present = new Set(findings.map((item) => item.analyte));
  return CORE_ANALYTES.filter(([analyte]) => !present.has(analyte)).map(([, label]) => label);
}

export function extractLabFindings(facts: PatientFacts): AnalyteFinding[] {
  const byAnalyte = new Map<Analyte, AnalyteFinding>();

  for (const item of facts.labItems) {
    const analyte = matches(item);
    if (!analyte) continue;
    const parsed = item.rawValues.map(parseLabValue).filter((v): v is ParsedValue => v !== null);
    if (!parsed.length) continue;

    const existing = byAnalyte.get(analyte);
    const merged = existing ? [...existing.values, ...parsed] : parsed;
    byAnalyte.set(analyte, {
      analyte,
      label: ANALYTE_LABELS[analyte],
      unit: existing?.unit ?? item.unit,
      values: merged,
      min: Math.min(...merged.map((v) => v.value)),
      max: Math.max(...merged.map((v) => v.value)),
      feeMonths: [...new Set([...(existing?.feeMonths ?? []), ...item.feeMonths])].sort(),
      hasDrawDates: facts.labHasDrawDates,
    });
  }

  return [...byAnalyte.values()];
}

/** 來源的單位欄位可能是「無」「未提供」「N/A」，那些不是單位。 */
function cleanUnit(unit: string | null): string {
  if (!unit) return "";
  const text = unit.trim();
  if (!text || /^(無|未提供|N\/A|null)$/i.test(text)) return "";
  // 來源的上標字元常是亂碼（m︿2、m^2、m2），統一成 m²
  return ` ${text.replace(/m\s*[︿^]\s*2|(?<=\d\.\d{2})m2\b/gi, "m²")}`;
}

/**
 * 值的呈現方式。
 *
 * 這裡曾經有一個危險的 bug：只要出現任何帶不等號的值，就改成「列出前四個相異值」，
 * 結果一位病人的 eGFR 顯示成「40.4、33.9、37.0、＞60.0」，把最低的 22.8 藏起來了，
 * 而同一份報告的安全提示卻用 22.8 判定 metformin 禁用——同一份文件自相矛盾。
 *
 * 現在的規則：相異值少就全部列出；多的時候一律顯示 min–max（範圍才是重點），
 * 並額外標出帶不等號的值，兩者都不會被犧牲。
 */
function valueText(finding: AnalyteFinding): string {
  const distinct = [...new Set(finding.values.map((v) => v.raw))];
  const qualified = [...new Set(finding.values.filter((v) => v.qualifier !== "=").map((v) => v.raw))];

  if (distinct.length <= 3) return distinct.join("、");

  const range = `${finding.min}–${finding.max}`;
  return qualified.length ? `${range}（含 ${qualified.slice(0, 3).join("、")}）` : range;
}

/**
 * 病人版敘述。刻意不寫筆數——「共 1819 筆」對病人沒有意義，只會造成困惑，
 * 而且那個數字是統計出來的，不是檢驗結果。
 */
export function describeRange(finding: AnalyteFinding): string {
  const months = finding.feeMonths.length ? `費用年月 ${finding.feeMonths.join("、")}` : "來源未提供年月";
  const many = new Set(finding.values.map((v) => v.raw)).size > 3 ? "多次紀錄，" : "";
  return `${finding.label}：${many}${valueText(finding)}${cleanUnit(finding.unit)}（${months}）`;
}

/** 醫師版敘述，保留筆數與完整分布。 */
export function describeRangeForClinician(finding: AnalyteFinding): string {
  const months = finding.feeMonths.length ? `費用年月 ${finding.feeMonths.join("、")}` : "來源未提供年月";
  const distinct = new Set(finding.values.map((v) => v.raw)).size;
  const caveat = finding.analyte === "glucose-unspecified" ? "未標示採檢時機，" : "";
  return `${CLINICIAN_LABELS[finding.analyte]}：${valueText(finding)}${cleanUnit(finding.unit)}（${caveat}共 ${finding.values.length} 筆／${distinct} 種結果，${months}）`;
}

/**
 * 有些門檻在《2022第2型糖尿病臨床照護指引》裡沒有對應條目——電解質、貧血、
 * 未標示採檢時機的高血糖都是。那些是一般臨床門檻，由我們自訂。
 *
 * 必須標示出來。醫師看到一整排提示時，要能分辨哪幾條有指引依據、
 * 哪幾條沒有；不標等於讓他以為全部都有出處。
 */
const NOT_IN_GUIDELINE = "（一般臨床門檻，非本指引條列）";

export type ThresholdHit = {
  code: string;
  /** 這則判定是由哪一個檢驗項目觸發的，讓報告可以把說明貼在數值旁邊。 */
  analyte: Analyte | null;
  ruleId: string | null;
  severity: "info" | "attention" | "urgent";
  /** 給醫師版，含實際數值 */
  clinicianMessage: string;
  /** 給病人版，不含代碼，且不聲稱時序 */
  patientMessage: string | null;
  citation: string | null;
};

function rule(id: string) {
  const found = RULES_BY_ID.get(id);
  return found ? { statement: found.statement, citation: citationText(found) } : null;
}

/**
 * 依實際數值判定門檻。
 * 所有敘述都以「曾出現」表達，因為申報資料無法確認哪一筆較新。
 */
export function evaluateThresholds(findings: AnalyteFinding[], facts: PatientFacts): ThresholdHit[] {
  const hits: ThresholdHit[] = [];
  const get = (analyte: Analyte) => findings.find((item) => item.analyte === analyte);
  /** 只有真的是一段範圍時才印，否則會出現「範圍 124–124」這種贅字。 */
  const range = (item: AnalyteFinding) => (item.min === item.max ? "" : `（範圍 ${item.min}–${item.max}）`);
  /** 落在指定區間內的實際數值。「介於 30–45（43.3–115.7）」裡的 115.7 不在區間內，讀起來自相矛盾。 */
  const within = (item: AnalyteFinding, lo: number, hi: number) =>
    [...new Set(item.values.filter((v) => v.value >= lo && v.value < hi).map((v) => v.raw))].join("、");
  /** 已經在括號裡時用這個，否則會出現「（最低 3.3（範圍 3.3–4.8））」這種巢狀括號。 */
  const rangeInline = (item: AnalyteFinding) => (item.min === item.max ? "" : `，範圍 ${item.min}–${item.max}`);

  const egfr = get("eGFR");
  const uacr = get("UACR");

  // 腎臟：加密追蹤門檻。
  // 指引註 3 的適用範圍是「eGFR 介於 30–60」，不是「低於 60」。低於 30 時
  // 「至少每半年」仍然成立（那是下限），但那條註解沒有涵蓋它，追蹤頻率
  // 應由腎臟科決定——不能拿註 3 當出處說已經夠了。
  const egfrBelow60 = egfr && egfr.min < 60;
  const uacrAbove300 = uacr && uacr.values.some((v) => v.value > 300 || (v.value === 300 && v.qualifier === ">="));
  if (egfrBelow60 || uacrAbove300) {
    const parts: string[] = [];
    if (egfrBelow60) parts.push(`eGFR 曾出現低於 60 的數值（${within(egfr, 0, 60)}）`);
    if (uacrAbove300) parts.push(`UACR 曾出現達到或超過 300 mg/g 的結果（${[...new Set(uacr.values.map((v) => v.raw))].join("、")}）`);
    const r = rule("kidney-intensive-followup");
    hits.push({
      code: "kidney-intensive-followup",
      analyte: "eGFR",
      ruleId: "kidney-intensive-followup",
      severity: "attention",
      clinicianMessage: `${parts.join("；")}。依指引${r?.statement ?? ""}`,
      patientMessage:
        "您的資料中曾出現腎功能或尿蛋白的異常結果。指引建議這種情況至少每半年追蹤一次，請與醫療團隊確認您目前需要的追蹤頻率。（資料只有費用年月，無法確認這些結果的先後順序或是否為最新。）",
      citation: r?.citation ?? null,
    });
  }

  /**
   * eGFR<30 時指引給的是轉介，不是某個追蹤頻率。
   *
   * 但那一段的前提是「糖尿病人因腎臟疾病之病因不能確診時」——貧血、
   * 電解質不平衡是 DKD 情境下的附加條件，不是獨立觸發。單憑一個沒有日期的
   * 血鈉 128、而病人根本沒有腎臟問題，就建議轉介腎臟科是過度延伸。
   */
  const hasKidneyDisease = Boolean(
    egfrBelow60 || uacrAbove300 || (facts.comorbidityFlags.ckd.known && facts.comorbidityFlags.ckd.value),
  );
  const hbForReferral = get("haemoglobin");
  const kForReferral = get("potassium");
  const naForReferral = get("sodium");
  const coFeatures = [
    hbForReferral && hbForReferral.max < 11 ? `血色素持續偏低（最高 ${hbForReferral.max} g/dL）` : "",
    kForReferral && (kForReferral.min < 3.0 || kForReferral.max > 5.5) ? "血鉀異常" : "",
    naForReferral && (naForReferral.min < 130 || naForReferral.max > 150) ? "血鈉異常" : "",
  ].filter(Boolean);
  const severeEgfr = egfr && egfr.min < 30;
  const referralReasons = severeEgfr
    ? [`eGFR 曾出現低於 30 的數值（最低 ${egfr.min}）`, ...coFeatures]
    : hasKidneyDisease && coFeatures.length
      ? ["已有腎臟疾病證據", ...coFeatures]
      : [];
  if (referralReasons.length) {
    const r = rule("referral-nephrology");
    hits.push({
      code: "referral-nephrology",
      analyte: "eGFR",
      ruleId: "referral-nephrology",
      severity: "attention",
      clinicianMessage: `${referralReasons.join("、")}。${r?.statement ?? ""}`,
      patientMessage: null,
      citation: r?.citation ?? null,
    });
  }

  // 用藥安全：metformin 與腎功能
  const usesAntidiabetic = facts.medicationClasses.some((item) => /抗糖尿病|metformin|雙胍|胰島素/i.test(item.atcClass));
  if (egfr && usesAntidiabetic) {
    if (egfr.min < 30) {
      const r = rule("metformin-egfr-30");
      hits.push({
        code: "metformin-contraindicated",
        analyte: "eGFR",
        ruleId: "metformin-egfr-30",
        severity: "urgent",
        clinicianMessage: `eGFR 曾出現低於 30 的數值（最低 ${egfr.min}）。${r?.statement ?? ""}`,
        patientMessage: null,
        citation: r?.citation ?? null,
      });
    } else if (egfr.min < 45) {
      const r = rule("metformin-egfr-30-45");
      hits.push({
        code: "metformin-reduce",
        analyte: "eGFR",
        ruleId: "metformin-egfr-30-45",
        severity: "attention",
        clinicianMessage: `eGFR 曾出現介於 30–45 的數值（${within(egfr, 30, 45)}）。${r?.statement ?? ""}`,
        patientMessage: null,
        citation: r?.citation ?? null,
      });
    }
  }

  // 電解質：不是照護目標，是安全門檻，因此留在這一層。
  // 值得注意的是這些數值可能來自兩年前的急性住院，沒有採檢日無法分辨，
  // 所以措辭一律是「曾出現」，並要求由醫療團隊確認目前狀況。
  // 低血鉀的臨床門檻是 3.5，不是 3.0。原本用 3.0 會讓 3.0/3.2/3.3 這種
  // 整批偏低的資料一則都不觸發——實測就發生過。
  const potassium = get("potassium");
  if (potassium && (potassium.min < 3.5 || potassium.max > 5.5)) {
    const low = potassium.min < 3.5;
    const detail = low ? `最低 ${potassium.min}` : `最高 ${potassium.max}`;
    hits.push({
      code: "potassium-abnormal",
      analyte: "potassium",
      ruleId: null,
      severity: potassium.min < 3.0 || potassium.max > 6.0 ? "urgent" : "attention",
      clinicianMessage: `K 曾出現${low ? "偏低" : "偏高"}數值（${detail}${rangeInline(potassium)} mmol/L）。${NOT_IN_GUIDELINE}`,
      patientMessage: `您的資料中曾出現${low ? "偏低" : "偏高"}的血鉀數值（${detail} mmol/L）。血鉀太${low ? "低" : "高"}可能影響心跳與肌肉力量${low ? "，利尿劑與腹瀉嘔吐都可能造成" : "，腎功能下降時較容易發生"}。這些紀錄沒有檢查日期，請在回診時主動提出。`,
      citation: null,
    });
  }

  const sodium = get("sodium");
  if (sodium && (sodium.min < 130 || sodium.max > 150)) {
    const detail = sodium.min < 130 ? `最低 ${sodium.min}` : `最高 ${sodium.max}`;
    hits.push({
      code: "sodium-abnormal",
      analyte: "sodium",
      ruleId: null,
      severity: "urgent",
      clinicianMessage: `Na 曾出現異常值（${detail}${rangeInline(sodium)} mmol/L）。${NOT_IN_GUIDELINE}`,
      patientMessage:
        "您的資料中曾出現異常的血鈉數值。這些紀錄沒有檢查日期，請在回診時主動提出，由醫療團隊確認目前狀況。",
      citation: null,
    });
  }

  // 腎性貧血。慢性腎臟病人 Hb 下降很常見，而且會讓糖化血色素失真——
  // 紅血球壽命縮短、輸血或使用紅血球生成素都會把 HbA1c 壓低。
  // 這一條同時是下一條「HbA1c 在腎功能不全時不可盡信」的依據。
  const egfrForAnaemia = get("eGFR");
  const kidneyImpaired =
    facts.comorbidityFlags.ckd.known && facts.comorbidityFlags.ckd.value === true
      ? true
      : Boolean(egfrForAnaemia && egfrForAnaemia.min < 60);
  const hb = get("haemoglobin");
  if (hb && hb.min < 11) {
    hits.push({
      code: "anaemia",
      analyte: "haemoglobin",
      ruleId: null,
      severity: hb.min < 8 ? "urgent" : "attention",
      // 糖化血色素失真由下面那一則專門處理，這裡不重複。
      clinicianMessage: `Hb 曾出現 ${hb.min} g/dL${range(hb)}${kidneyImpaired ? "，合併腎功能不全，需考慮腎性貧血" : ""}。${NOT_IN_GUIDELINE}`,
      patientMessage: `您的資料中曾出現偏低的血色素（${hb.min} g/dL），也就是貧血。${kidneyImpaired ? "腎功能下降的人比較容易發生貧血。" : ""}貧血可能讓您容易疲倦、喘或頭暈，也會讓糖化血色素這個指標看起來比實際情況好。請在回診時主動提出。`,
      citation: null,
    });
  }

  // 腎功能不全或貧血時，糖化血色素不能單獨解讀。
  // 這件事醫師版本來就有寫，但病人版沒有——病人看到 6.5% 只會以為控制得很好。
  // 「HbA1c 不可盡信」是一個推論，需要持續性的依據。用 hb.min < 11 等於
  // 一筆兩年前的舊值就永久觸發——五位病人全部命中，那個警語就沒有資訊量。
  // 改為連最高的一筆都低於 11（貧血是持續狀態），或有腎功能不全。
  const persistentAnaemia = Boolean(hb && hb.max < 11);
  const a1c = get("HbA1c");
  if (!a1c) {
    hits.push({
      code: "hba1c-missing",
      analyte: "HbA1c",
      ruleId: "interval-hba1c",
      severity: "attention",
      clinicianMessage: "資料中沒有糖化血色素紀錄。",
      patientMessage:
        "您的資料中沒有糖化血色素（HbA1c）的紀錄。這是評估一段期間血糖控制的指標，回診時可以確認是否需要安排。",
      citation: rule("interval-hba1c")?.citation ?? null,
    });
  }
  if (a1c && (kidneyImpaired || persistentAnaemia)) {
    hits.push({
      code: "hba1c-unreliable",
      analyte: "HbA1c",
      ruleId: "hba1c-unreliable",
      severity: "attention",
      clinicianMessage: `HbA1c ${a1c.min === a1c.max ? a1c.min : `${a1c.min}–${a1c.max}`} % 在${kidneyImpaired ? "腎功能不全" : ""}${kidneyImpaired && persistentAnaemia ? "合併" : ""}${persistentAnaemia ? "貧血" : ""}的情況下可能低估實際血糖，建議併用自我血糖監測或糖化白蛋白判讀。`,
      patientMessage: `您的糖化血色素是 ${a1c.min === a1c.max ? a1c.min : `${a1c.min}–${a1c.max}`}%，看起來在目標範圍內，但這個數字對您可能不準。${kidneyImpaired ? "腎功能下降" : ""}${kidneyImpaired && persistentAnaemia ? "與" : ""}${persistentAnaemia ? "貧血" : ""}都會讓它比實際血糖低。請不要只看這個數字就認為血糖控制良好，回診時請醫療團隊一起看您平時的血糖紀錄。`,
      citation: null,
    });
  }

  // 低血糖：任何一筆血糖低於 70 都要被看到，低於 54 屬臨床上的嚴重低血糖。
  // 這比高血糖更急，卻最容易被「只看平均值」的做法漏掉。
  const anyGlucose = [get("fasting-glucose"), get("postprandial-glucose"), get("glucose-unspecified")].filter(
    (item): item is AnalyteFinding => Boolean(item),
  );
  const lowest = anyGlucose.length ? Math.min(...anyGlucose.map((item) => item.min)) : null;
  if (lowest !== null && lowest < 70) {
    hits.push({
      code: "hypoglycemia",
      analyte: null,
      ruleId: "hypoglycemia-levels",
      severity: lowest < 54 ? "urgent" : "attention",
      clinicianMessage: `Glucose 曾出現 ${lowest} mg/dL，屬低血糖範圍${lowest < 54 ? "（低於 54，屬嚴重低血糖）" : ""}。`,
      patientMessage:
        "您的資料中曾出現偏低的血糖數值。低血糖可能造成發抖、冒冷汗、頭暈或意識改變，請在回診時主動提出，讓醫療團隊了解發生的情況。",
      citation: null,
    });
  }

  // 未標示採檢時機的血糖不能套空腹目標，但明顯偏高仍必須被看到。
  const otherGlucose = get("glucose-unspecified");
  if (otherGlucose && otherGlucose.max >= 200) {
    hits.push({
      code: "glucose-unspecified-high",
      analyte: "glucose-unspecified",
      ruleId: null,
      severity: otherGlucose.max >= 300 ? "urgent" : "attention",
      clinicianMessage: `Glucose 曾出現 ${otherGlucose.max} mg/dL${range(otherGlucose)}。${NOT_IN_GUIDELINE}`,
      patientMessage:
        "您的資料中曾出現偏高的血糖數值。這些紀錄沒有註明是飯前還是飯後測的，也沒有檢查日期，請在回診時和醫療團隊一起看實際結果。",
      citation: null,
    });
  }

  // 血糖與血脂的門檻改由 target-comparison 統一處理。
  // 這裡曾另外判定飯前血糖 ≥250 與 HbA1c ≥10，結果同一個數值在病人版與醫師版
  // 各被講兩次——稽核指出那正是產品負責人拒絕的重複贅述。
  // 這一層只保留 compareToTargets 涵蓋不到的：腎臟追蹤與用藥安全。

  return hits;
}
