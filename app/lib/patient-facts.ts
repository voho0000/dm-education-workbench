/**
 * 第一層：確定性事實抽取（arm C）。
 *
 * 目的是把「申報資料可以支持的結論」和「申報資料無法支持的推論」在程式層就分開，
 * 而不是寫成 prompt 規則交給模型記住。
 *
 * 三條硬規則：
 *   1. 來源沒有的欄位一律是 unknown，不補值、不視為 0、不視為正常。
 *   2. 用藥一律標記為「曾有申報紀錄」＋最後申報日，永遠不產生「目前用藥」欄位。
 *   3. 檢驗只有費用年月時，不產生任何順序或趨勢欄位。
 */

import { isRecord, sourceRecords, type JsonRecord } from "./format-patient.ts";

export type Unknown = { known: false; reason: string };
export type Known<T> = { known: true; value: T };
export type Maybe<T> = Known<T> | Unknown;

function known<T>(value: T): Known<T> {
  return { known: true, value };
}

function unknown(reason: string): Unknown {
  return { known: false, reason };
}

export type DiabetesTypeEvidence = {
  /** 判定結果。conflicting 與 absent 都不得用來啟用 T1／T2 補充模組。 */
  verdict: "type1-confirmed" | "type2-confirmed" | "conflicting" | "absent";
  type1IcdCodes: string[];
  type2IcdCodes: string[];
  otherDiabetesIcdCodes: string[];
  note: string;
};

export type MedicationClassFact = {
  atcClass: string;
  /** 這個分類出現過的藥品名稱（去重，最多列 8 個） */
  drugNames: string[];
  recordCount: number;
  /** 最後一次申報日期；來源沒有日期時為 null */
  lastClaimDate: string | null;
  /** 距報告日的天數；無法計算時為 null */
  daysSinceLastClaim: number | null;
};

export type LabItemFact = {
  itemName: string;
  /** 健保醫令代碼。判定檢體與項目時比名稱可靠得多。 */
  orderCodes: string[];
  /** 來源出現過的所有原始值，逐字保留、不排序成趨勢 */
  rawValues: string[];
  unit: string | null;
  referenceRange: string | null;
  /** 來源提供的費用年月集合 */
  feeMonths: string[];
  /** 來源是否提供實際採檢日 */
  hasDrawDates: boolean;
};

export type RiskField = {
  code: string;
  present: boolean;
  value: number | null;
  rawValue: string | null;
};

export type PatientFacts = {
  reportDate: Maybe<string>;
  dataCutoff: Maybe<string>;
  birthday: Maybe<string>;
  ageYears: Maybe<number>;
  sexCode: Maybe<string>;
  /**
   * 已解讀的性別，來源是 userInfo.gender（直接就是 M／F）。
   *
   * 刻意不從 userInput.SEX 推。五位病人剛好 SEX=0→M、SEX=1→F，但那是從
   * 五筆歸納出來的，不是規格。血球參考值是性別分層的（M 13.1-17.2／F 11.0-15.2），
   * 猜錯會讓 Hb 12.5 的男性被判為正常——寧可未知，也不要錯。
   */
  sex: Maybe<"男性" | "女性">;
  diabetesOnsetDate: Maybe<string>;
  diabetesDurationYears: Maybe<number>;
  comorbidityFlags: {
    hypertension: Maybe<boolean>;
    hyperlipidemia: Maybe<boolean>;
    ckd: Maybe<boolean>;
    p4p: Maybe<boolean>;
  };
  /**
   * 申報診斷碼裡直接指向慢性腎臟病的碼。
   *
   * CKD 欄位為 0、R3 也沒有值的病人仍可能有這些碼——DCSI 只認診斷碼，
   * 而診斷碼只出現在有開藥的就診，漏掉的機會不小。
   */
  ckdIcdCodes: string[];
  dcsiTotal: Maybe<number>;
  grade: Maybe<string>;
  ageGroup: Maybe<string>;
  /** 已發生併發症現況 R1–R7 */
  existingComplications: RiskField[];
  /** 未來風險預測 PR1–PR7 */
  riskPredictions: RiskField[];
  diabetesType: DiabetesTypeEvidence;
  /** 申報用藥的成分名（去重）。ATC5 分類太粗，SGLT2i 只會顯示「抗糖尿病藥物」。 */
  medicationIngredients: string[];
  medicationClasses: MedicationClassFact[];
  medicationRecordCount: number;
  medicationDateRange: Maybe<{ earliest: string; latest: string }>;
  labItems: LabItemFact[];
  labRecordCount: number;
  labHasDrawDates: boolean;
  /** 抽取過程中偵測到、需要人工注意的資料品質問題 */
  dataQualityFlags: string[];
};

/**
 * 慢性腎臟病／糖尿病腎病變的申報診斷碼。
 *
 * 用 DCSI 腎病變本來就採用的碼集（ICD-9 250.4x、580–588、593.9、V42.0、V45.1、V56.x
 * 對應到 ICD-10），因為要補的正是 R3 應該抓到卻沒抓到的那一塊。
 * 刻意不含 N17（急性腎損傷）——那是急性事件，不是慢性腎臟病。
 */
const CKD_ICD = /^(E1[0-4]2|N0[0-8]|N1[89]|N2[5-8]|Z940|Z992|Z49)/i;

const T1_ICD = /^E10/i;
const T2_ICD = /^E11/i;
const OTHER_DM_ICD = /^E1[234]/i;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim().replaceAll("/", "-");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function daysBetween(from: string, to: string): number | null {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

function flagFromCode(value: unknown, label: string): Maybe<boolean> {
  const numeric = toNumber(value);
  if (numeric === null) return unknown(`來源未提供 ${label} 欄位`);
  return known(numeric === 1);
}

function riskFields(userInput: JsonRecord, prefix: "R" | "PR"): RiskField[] {
  const fields: RiskField[] = [];
  for (let index = 1; index <= 7; index += 1) {
    const code = `${prefix}${index}`;
    const present = Object.hasOwn(userInput, code);
    const raw = present ? userInput[code] : null;
    fields.push({
      code,
      present,
      value: present ? toNumber(raw) : null,
      rawValue: present && raw !== null && raw !== undefined ? String(raw) : null,
    });
  }
  return fields;
}

function detectDiabetesType(medications: unknown[]): DiabetesTypeEvidence {
  const type1 = new Set<string>();
  const type2 = new Set<string>();
  const other = new Set<string>();

  for (const record of medications) {
    if (!isRecord(record)) continue;
    const code = String(record.icd_code ?? "").trim();
    if (!code) continue;
    if (T1_ICD.test(code)) type1.add(code);
    else if (T2_ICD.test(code)) type2.add(code);
    else if (OTHER_DM_ICD.test(code)) other.add(code);
  }

  const type1Codes = [...type1].sort();
  const type2Codes = [...type2].sort();
  const otherCodes = [...other].sort();

  if (type1Codes.length && type2Codes.length) {
    return {
      verdict: "conflicting",
      type1IcdCodes: type1Codes,
      type2IcdCodes: type2Codes,
      otherDiabetesIcdCodes: otherCodes,
      note: "申報資料同時出現第一型與第二型糖尿病診斷碼，無法據此判定類型；不得啟用任何 T1／T2 補充模組。",
    };
  }
  if (type1Codes.length) {
    return {
      verdict: "type1-confirmed",
      type1IcdCodes: type1Codes,
      type2IcdCodes: [],
      otherDiabetesIcdCodes: otherCodes,
      note: "申報資料只出現第一型糖尿病診斷碼。注意申報診斷碼是計費用途，仍應由醫療團隊確認。",
    };
  }
  if (type2Codes.length) {
    return {
      verdict: "type2-confirmed",
      type1IcdCodes: [],
      type2IcdCodes: type2Codes,
      otherDiabetesIcdCodes: otherCodes,
      note: "申報資料只出現第二型糖尿病診斷碼。注意申報診斷碼是計費用途，仍應由醫療團隊確認。",
    };
  }
  return {
    verdict: "absent",
    type1IcdCodes: [],
    type2IcdCodes: [],
    otherDiabetesIcdCodes: otherCodes,
    note: "申報用藥紀錄中沒有 E10／E11 糖尿病診斷碼，無法判定類型。",
  };
}

function extractMedications(medications: unknown[], reportDate: string | null) {
  const byClass = new Map<string, { names: Set<string>; count: number; dates: string[] }>();
  const allDates: string[] = [];

  for (const record of medications) {
    if (!isRecord(record)) continue;
    const atcClass = String(record.drug_atc5_name ?? "").trim() || "未分類或來源未提供分類";
    const name = String(record.drug_ename ?? "").trim();
    const date = normalizeDate(record.drug_date);
    if (date) allDates.push(date);

    const entry = byClass.get(atcClass) ?? { names: new Set<string>(), count: 0, dates: [] };
    if (name) entry.names.add(name);
    entry.count += 1;
    if (date) entry.dates.push(date);
    byClass.set(atcClass, entry);
  }

  const classes: MedicationClassFact[] = [...byClass.entries()]
    .map(([atcClass, entry]) => {
      const sorted = [...entry.dates].sort();
      const lastClaimDate = sorted.length ? sorted[sorted.length - 1] : null;
      return {
        atcClass,
        drugNames: [...entry.names].sort().slice(0, 8),
        recordCount: entry.count,
        lastClaimDate,
        daysSinceLastClaim: lastClaimDate && reportDate ? daysBetween(lastClaimDate, reportDate) : null,
      };
    })
    .sort((a, b) => {
      if (a.lastClaimDate && b.lastClaimDate && a.lastClaimDate !== b.lastClaimDate) {
        return b.lastClaimDate.localeCompare(a.lastClaimDate);
      }
      return b.recordCount - a.recordCount;
    });

  const sortedDates = allDates.sort();
  const dateRange: Maybe<{ earliest: string; latest: string }> = sortedDates.length
    ? known({ earliest: sortedDates[0], latest: sortedDates[sortedDates.length - 1] })
    : unknown("用藥紀錄沒有可解析的日期");

  return { classes, dateRange };
}

/**
 * 不是病人測量值的列。
 *
 * 實測五位病人共 79 筆：檢體品質旗標（溶血 28、脂血 28、Sample Hemolysis 5，
 * 值多半是 0／無單位）與微生物培養的自由文字註解（COMMENT 18 筆，內容是
 * 「因分離出 VRE 抗藥性菌株,請執行接觸隔離」這類敘述）。
 *
 * 為什麼是濾掉而不是提示：溶血確實會假性升高血鉀，但這批資料**沒有任何欄位
 * 把品質旗標連到特定的結果列**，也無法確認那次抽血到底有沒有驗鉀。既然無從
 * 辨別，提示只會變成每份報告都掛一句沒人能處理的警語。留著它們還有一個壞處：
 * 它們會被送進 LLM 的輸入，模型有機會把「溶血」當成一個發現寫進報告。
 */
function isNotAMeasurement(itemName: string): boolean {
  if (/^(溶血|脂血|黃疸)$/.test(itemName)) return true;
  if (/sample\s+(hemoly|haemoly)|icterus|lipemi/i.test(itemName)) return true;
  if (/^comment$/i.test(itemName) || /^[:：]/.test(itemName)) return true;
  return false;
}

function extractLabs(labs: unknown[]) {
  const byItem = new Map<
    string,
    { values: string[]; units: Set<string>; refs: Set<string>; months: Set<string>; codes: Set<string> }
  >();
  let hasDrawDates = false;

  for (const record of labs) {
    if (!isRecord(record)) continue;
    if (normalizeDate(record.assay_date) || normalizeDate(record.inspect_date)) hasDrawDates = true;

    const itemName = String(record.assay_item_name ?? "").trim() || String(record.order_name ?? "").trim() || "未提供項目名稱";
    const value = String(record.assay_value ?? "").trim();
    if (!value) continue;
    if (isNotAMeasurement(itemName)) continue;

    // 分組鍵必須含單位與醫令代碼。只用名稱的話，尿液鏡檢的 WBC（/HPF，參考 0–3）
    // 會和血液的 WBC（10^3/μL，參考 4–10）併成同一項，單位與參考範圍全混在一起，
    // 判定「超出範圍」時會產生大量假警報。
    const unitKey = String(record.unit_data ?? "").trim();
    const codeKey = String(record.order_code ?? "").trim();
    const groupKey = `${itemName}｜${unitKey}｜${codeKey}`;

    const entry = byItem.get(groupKey) ?? {
      values: [],
      units: new Set<string>(),
      refs: new Set<string>(),
      months: new Set<string>(),
      codes: new Set<string>(),
    };
    const orderCode = String(record.order_code ?? "").trim();
    if (orderCode) entry.codes.add(orderCode);
    entry.values.push(value);
    const unit = String(record.unit_data ?? "").trim();
    if (unit && unit !== "null") entry.units.add(unit);
    const ref = String(record.consult_value ?? "").trim();
    if (ref && ref !== "null") entry.refs.add(ref);
    const month = String(record.fee_ym ?? "").trim();
    if (month) entry.months.add(month);
    byItem.set(groupKey, entry);
  }

  const items: LabItemFact[] = [...byItem.entries()]
    .map(([groupKey, entry]) => ({
      itemName: groupKey.split("｜")[0],
      orderCodes: [...entry.codes].sort(),
      rawValues: entry.values,
      unit: entry.units.size === 1 ? [...entry.units][0] : entry.units.size > 1 ? [...entry.units].join(" / ") : null,
      referenceRange: entry.refs.size ? [...entry.refs][0] : null,
      feeMonths: [...entry.months].sort(),
      hasDrawDates,
    }))
    .sort((a, b) => b.rawValues.length - a.rawValues.length);

  return { items, hasDrawDates };
}

export function extractPatientFacts(input: unknown): PatientFacts {
  const root = isRecord(input) ? input : {};
  const userInput = isRecord(root.userInput) ? root.userInput : {};
  const rawSources = isRecord(root.rawSources) ? root.rawSources : {};

  const reportDate = normalizeDate(userInput.REPORT_DATE);
  const birthday = normalizeDate(userInput.BIRTHDAY);
  const onset = normalizeDate(userInput.INDX_DATE);

  const ageDays = birthday && reportDate ? daysBetween(birthday, reportDate) : null;
  const durationRaw = toNumber(userInput.T);

  const medications = sourceRecords(rawSources, "medication");
  const labs = sourceRecords(rawSources, "labData");
  const { classes, dateRange } = extractMedications(medications, reportDate);
  const { items, hasDrawDates } = extractLabs(labs);

  const dataQualityFlags: string[] = [];
  if (!hasDrawDates && labs.length) {
    dataQualityFlags.push(
      "檢驗紀錄只有費用年月、沒有採檢日期，因此無法建立時間順序或趨勢。任何「趨勢」「最近一次」的敘述都沒有資料支持。",
    );
  }
  if (!reportDate) dataQualityFlags.push("來源未提供 REPORT_DATE，無法標示資料截止日。");
  const existingComplications = riskFields(userInput, "R");
  const riskPredictions = riskFields(userInput, "PR");
  /*
   * R／PR 缺欄位不是資料缺漏，是資料模型本身。
   *
   * 先前這裡對每位病人都推一條「來源未出現下列欄位，不得補值也不得視為 0」，
   * 兩半都是錯的：
   *   - R 缺欄位就是該項 DCSI 分數為 0（六位病人 sum(R) 全部等於 DCSI），
   *     而且程式自己就是這樣處理的——同一份輸入裡卻叫模型不要當成 0，自相矛盾。
   *   - PR 缺欄位代表該主題已有 R 值、不需要預測，不是來源漏給。
   * 真正的異常只有一種：同一主題 R 與 PR 同時出現，或兩者同時缺席。
   */
  const conflicting: string[] = [];
  for (let topic = 1; topic <= 6; topic += 1) {
    const r = existingComplications.find((item) => item.code === `R${topic}`);
    const pr = riskPredictions.find((item) => item.code === `PR${topic}`);
    if (r?.present && pr?.present) conflicting.push(`R${topic} 與 PR${topic} 同時有值`);
    if (!r?.present && !pr?.present) conflicting.push(`R${topic} 與 PR${topic} 同時缺席`);
  }
  if (conflicting.length) {
    dataQualityFlags.push(
      `下列主題不符合來源的資料模型（同一主題應只有 R 或 PR 其中一個）：${conflicting.join("、")}。`,
    );
  }

  const diabetesType = detectDiabetesType(medications);
  if (diabetesType.verdict === "conflicting") {
    dataQualityFlags.push(diabetesType.note);
  }

  const genderRaw = String((isRecord(root.userInfo) ? root.userInfo.gender : "") ?? "").trim().toUpperCase();
  const resolvedSex: "男性" | "女性" | null =
    genderRaw === "M" || genderRaw === "男" ? "男性" : genderRaw === "F" || genderRaw === "女" ? "女性" : null;

  return {
    reportDate: reportDate ? known(reportDate) : unknown("來源未提供 REPORT_DATE"),
    dataCutoff: reportDate ? known(reportDate) : unknown("來源未提供資料截止日"),
    birthday: birthday ? known(birthday) : unknown("來源未提供 BIRTHDAY"),
    ageYears: ageDays !== null ? known(Math.floor(ageDays / 365.25)) : unknown("缺少出生日期或報告日期，無法計算年齡"),
    sexCode: userInput.SEX !== undefined && userInput.SEX !== null && userInput.SEX !== ""
      ? known(String(userInput.SEX))
      : unknown("來源未提供 SEX"),
    sex: resolvedSex ? known(resolvedSex) : unknown("userInfo.gender 未提供或無法解讀"),
    diabetesOnsetDate: onset ? known(onset) : unknown("來源未提供 INDX_DATE"),
    diabetesDurationYears: durationRaw !== null ? known(Number(durationRaw.toFixed(1))) : unknown("來源未提供 T"),
    ckdIcdCodes: [
      ...new Set(
        medications
          .map((record) => (isRecord(record) ? String(record.icd_code ?? "").trim() : ""))
          .filter((code) => code && CKD_ICD.test(code.replace(/\./g, ""))),
      ),
    ].sort(),
    comorbidityFlags: {
      hypertension: flagFromCode(userInput.HT, "HT"),
      hyperlipidemia: flagFromCode(userInput.HL, "HL"),
      ckd: flagFromCode(userInput.CKD, "CKD"),
      p4p: flagFromCode(userInput.P4P, "P4P"),
    },
    dcsiTotal: toNumber(userInput.DCSI) !== null ? known(toNumber(userInput.DCSI) as number) : unknown("來源未提供 DCSI"),
    grade: userInput.GRADE !== undefined ? known(String(userInput.GRADE)) : unknown("來源未提供 GRADE"),
    ageGroup: userInput.AGEGP !== undefined ? known(String(userInput.AGEGP)) : unknown("來源未提供 AGEGP"),
    existingComplications,
    riskPredictions,
    diabetesType,
    medicationIngredients: [
      ...new Set(
        medications
          .map((record) => (isRecord(record) ? String(record.drug_ing_name ?? "").trim() : ""))
          .filter(Boolean),
      ),
    ].sort(),
    medicationClasses: classes,
    medicationRecordCount: medications.length,
    medicationDateRange: dateRange,
    labItems: items,
    labRecordCount: labs.length,
    labHasDrawDates: hasDrawDates,
    dataQualityFlags,
  };
}

function maybeText<T>(value: Maybe<T>, format?: (item: T) => string): string {
  if (!value.known) return `未知（${value.reason}）`;
  return format ? format(value.value) : String(value.value);
}

/**
 * 給 arm C 的 LLM 看的精簡事實摘要。
 * 刻意不含病人正文、不含指引內容，只有選模組需要的判斷依據。
 */
export function factsForSelectorPrompt(facts: PatientFacts, options: { maxMedicationClasses?: number } = {}): string {
  const maxClasses = options.maxMedicationClasses ?? 25;
  const lines: string[] = [];

  lines.push("【基本判斷依據】");
  lines.push(`報告日期：${maybeText(facts.reportDate)}`);
  lines.push(`年齡：${maybeText(facts.ageYears, (v) => `${v} 歲`)}`);
  lines.push(`性別：${facts.sex.known ? facts.sex.value : maybeText(facts.sex)}`);
  lines.push(`糖尿病病程年數：${maybeText(facts.diabetesDurationYears, (v) => `${v} 年`)}`);
  lines.push(`DCSI 總分：${maybeText(facts.dcsiTotal)}`);
  lines.push(`高血壓：${maybeText(facts.comorbidityFlags.hypertension, (v) => (v ? "是" : "否"))}`);
  lines.push(`高血脂：${maybeText(facts.comorbidityFlags.hyperlipidemia, (v) => (v ? "是" : "否"))}`);
  lines.push(`慢性腎臟病：${maybeText(facts.comorbidityFlags.ckd, (v) => (v ? "是" : "否"))}`);

  lines.push("", "【已發生併發症現況（R）】");
  for (const item of facts.existingComplications) {
    lines.push(`${item.code}：${item.present ? `${item.rawValue}` : "來源未出現此欄位（不得視為 0）"}`);
  }

  lines.push("", "【未來風險預測（PR）】");
  for (const item of facts.riskPredictions) {
    lines.push(`${item.code}：${item.present ? `${item.rawValue}` : "來源未出現此欄位（不得視為 0）"}`);
  }

  lines.push("", "【糖尿病類型證據】");
  lines.push(`判定：${facts.diabetesType.verdict}`);
  lines.push(`第一型診斷碼：${facts.diabetesType.type1IcdCodes.join("、") || "無"}`);
  lines.push(`第二型診斷碼：${facts.diabetesType.type2IcdCodes.join("、") || "無"}`);
  lines.push(`說明：${facts.diabetesType.note}`);

  lines.push("", "【用藥申報分類（非目前用藥）】");
  lines.push(
    `共 ${facts.medicationRecordCount} 筆申報紀錄，涵蓋 ${facts.medicationClasses.length} 個 ATC 分類。以下為最近申報的前 ${Math.min(maxClasses, facts.medicationClasses.length)} 類。`,
  );
  for (const item of facts.medicationClasses.slice(0, maxClasses)) {
    const last = item.lastClaimDate
      ? `最後申報 ${item.lastClaimDate}${item.daysSinceLastClaim !== null ? `（距報告日 ${item.daysSinceLastClaim} 天）` : ""}`
      : "來源無日期";
    lines.push(`- ${item.atcClass}｜${item.recordCount} 筆｜${last}`);
  }

  lines.push("", "【檢驗資料可用性】");
  lines.push(`共 ${facts.labRecordCount} 筆；是否有採檢日：${facts.labHasDrawDates ? "有" : "沒有，只有費用年月"}`);

  lines.push("", "【R／PR 的資料模型】");
  lines.push(
    "- 同一主題只會出現 R 或 PR 其中一個。",
    "- R 有值＝該併發症已發生；R 未出現＝尚未發生（該項 DCSI 分數為 0）。",
    "- PR 未出現＝該主題已有 R 值、不需要預測，不得視為 PR=0。",
    "- 來源只提供 PR1–PR6，沒有 PR7。",
  );

  if (facts.dataQualityFlags.length) {
    lines.push("", "【資料限制】");
    for (const flag of facts.dataQualityFlags) lines.push(`- ${flag}`);
  }

  return lines.join("\n");
}
