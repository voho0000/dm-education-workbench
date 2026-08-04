/**
 * 病人資料 → LLM 好讀文字。
 *
 * 由 app/page.tsx 原樣搬出，輸出格式逐字不變（tests/lib.test.mjs 有快照斷言）。
 * 搬出的唯一目的是讓它可以被單元測試。
 */

export type JsonRecord = Record<string, unknown>;

export const USER_INPUT_ORDER = [
  "REPORT_DATE",
  "BIRTHDAY",
  "INDX_DATE",
  "SEX",
  "P4P",
  "HT",
  "HL",
  "CKD",
  "T",
  "DCSI",
  "AGEGP",
  "GRADE",
];

export const USER_INPUT_LABELS: Record<string, string> = {
  REPORT_DATE: "報告日期",
  BIRTHDAY: "出生日期",
  INDX_DATE: "糖尿病指標日期",
  SEX: "性別代碼",
  P4P: "是否參加糖尿病P4P",
  HT: "高血壓",
  HL: "高血脂",
  CKD: "慢性腎臟病",
  T: "糖尿病病程年數",
  DCSI: "DCSI總分",
  AGEGP: "年齡分組",
  GRADE: "整體分級",
};

export const SOURCE_LABELS: Record<string, string> = {
  medication: "用藥紀錄",
  labData: "檢驗資料",
  chinesemed: "中藥用藥",
  imaging: "影像資料",
  allergy: "過敏資料",
  surgery: "手術資料",
  discharge: "出院資料",
  medDays: "用藥天數資料",
  patientSummary: "病人摘要",
  cancerScreening: "癌症篩檢",
  adultHealthCheck: "成人健檢",
};

/**
 * 純計費與系統欄位，臨床判讀完全用不到，但佔掉大量 token。
 *
 * 實測五位病人：拿掉這些欄位與和成分名重複的商品名，輸入從 234,688 降到
 * 153,295 tokens（省 35%）；用藥最多的那位從 119,637 降到 61,794（省 48%）。
 *
 * order_code 刻意保留——那是尿液（06012C／06013C）與血液唯一可靠的判別依據，
 * 砍掉會讓尿糖混進血糖，那個 bug 已經出現過一次。
 */
const BILLING_ONLY_FIELDS = new Set([
  "drug_code",
  "drug_ing_code",
  "func_seq_no",
  "fee_ym",
  "drug_multi_mark",
  "drug_std_qty",
  "assay_method",
]);

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function clean(value: unknown): string {
  if (value === null || value === undefined || value === "" || value === "null") {
    return "未提供";
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).replaceAll("\r", " ").replaceAll("\n", " ").trim() || "未提供";
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

export function countExact(records: unknown[]): Array<{ record: unknown; count: number }> {
  const counted = new Map<string, { record: unknown; count: number }>();
  for (const record of records) {
    const key = JSON.stringify(stableValue(record));
    const existing = counted.get(key);
    if (existing) existing.count += 1;
    else counted.set(key, { record, count: 1 });
  }
  return [...counted.values()];
}

export function compareUserInputKeys(a: string, b: string): number {
  const aIndex = USER_INPUT_ORDER.indexOf(a);
  const bIndex = USER_INPUT_ORDER.indexOf(b);
  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  }
  const aRisk = a.match(/^(R|PR)(\d+)$/);
  const bRisk = b.match(/^(R|PR)(\d+)$/);
  if (aRisk && bRisk) {
    if (aRisk[1] !== bRisk[1]) return aRisk[1] === "R" ? -1 : 1;
    return Number(aRisk[2]) - Number(bRisk[2]);
  }
  if (aRisk) return -1;
  if (bRisk) return 1;
  return a.localeCompare(b);
}

function genericLines(value: unknown, depth = 0): string[] {
  const indent = "  ".repeat(depth);
  if (Array.isArray(value)) {
    if (!value.length) return [`${indent}（空陣列）`];
    return value.flatMap((item, index) => {
      if (isRecord(item) || Array.isArray(item)) {
        return [`${indent}- 第 ${index + 1} 筆`, ...genericLines(item, depth + 1)];
      }
      return [`${indent}- ${clean(item)}`];
    });
  }
  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (!entries.length) return [`${indent}（空物件）`];
    return entries.flatMap(([key, item]) => {
      if (isRecord(item) || Array.isArray(item)) {
        return [`${indent}${key}：`, ...genericLines(item, depth + 1)];
      }
      return [`${indent}${key}：${clean(item)}`];
    });
  }
  return [`${indent}${clean(value)}`];
}

export function sourceRecords(rawSources: JsonRecord, key: string): unknown[] {
  const source = rawSources[key];
  if (!isRecord(source)) return [];
  return Array.isArray(source.rObject) ? source.rObject : [];
}

function compactRecord(record: unknown): string {
  if (!isRecord(record)) return clean(record);
  return Object.entries(record)
    .filter(([, value]) => value !== null && value !== undefined && value !== "" && value !== "null")
    .map(([key, value]) => `${key}:${clean(value)}`)
    .join("｜");
}

export function formatPatientJson(value: unknown): string {
  if (!isRecord(value)) {
    return [
      "【輸入資料】",
      ...genericLines(value),
      "",
      "【資料使用限制】",
      "以上僅重新排版，沒有推定缺少的診斷、日期、用藥狀態或治療資訊。",
    ].join("\n");
  }

  const hasKnownStructure = ["downloadType", "userInfo", "userInput", "rawSources"].some((key) => key in value);
  if (!hasKnownStructure) {
    return [
      "【來源JSON欄位】",
      ...genericLines(value),
      "",
      "【資料使用限制】",
      "以上保留來源欄位並重新排版；空值或未出現欄位不得自行解讀為0或正常。",
    ].join("\n");
  }

  const lines: string[] = ["【檔案與基本資料】", `資料匯出類型：${clean(value.downloadType)}`];
  const userInfo = isRecord(value.userInfo) ? value.userInfo : {};
  const userInput = isRecord(value.userInput) ? value.userInput : {};
  const rawSources = isRecord(value.rawSources) ? value.rawSources : {};

  for (const [key, item] of Object.entries(userInfo)) lines.push(`${key}：${clean(item)}`);

  lines.push("", "【來源模型欄位】", "以下保留來源原值；未提供不等同於0。");
  const userInputKeys = Object.keys(userInput).sort(compareUserInputKeys);
  if (!userInputKeys.length) lines.push("未提供來源模型欄位。");
  for (const key of userInputKeys) {
    const label = USER_INPUT_LABELS[key] ? `（${USER_INPUT_LABELS[key]}）` : "";
    lines.push(`${key}${label}：${clean(userInput[key])}`);
  }

  lines.push("", "【DCSI與風險欄位說明】");
  lines.push("僅保留來源DCSI、R與PR原始欄位；整理階段不重新解釋分數。來源未出現的欄位不得自行補值，也不得直接視為0。");

  lines.push("", "【資料來源概況】");
  const sourceEntries = Object.entries(rawSources);
  if (!sourceEntries.length) lines.push("未提供rawSources資料來源。");
  for (const [key, source] of sourceEntries) {
    const records = isRecord(source) && Array.isArray(source.rObject) ? source.rObject : [];
    lines.push(`${SOURCE_LABELS[key] ?? key}（${key}）：${records.length}筆${records.length ? "" : "，來源為空陣列"}`);
  }

  const medications = sourceRecords(rawSources, "medication");
  const medicationUnique = countExact(medications);
  const medicationGroups = new Map<string, Array<{ text: string; count: number }>>();
  for (const item of medicationUnique) {
    const record = isRecord(item.record) ? item.record : {};
    const date = clean(record.drug_date).replaceAll("/", "-");
    const diagnosis = `ICD ${clean(record.icd_code)}｜${clean(record.icd_cname)}`;
    const key = `${date}｜${diagnosis}`;
    // drug_ename 是商品名，和 drug_ing_name 的成分名語意重複，只留成分名。
    const detail = compactRecord(
      Object.fromEntries(
        Object.entries(record).filter(
          ([field]) =>
            !["drug_date", "icd_code", "icd_cname", "drug_ename"].includes(field) &&
            !BILLING_ONLY_FIELDS.has(field),
        ),
      ),
    );
    const group = medicationGroups.get(key) ?? [];
    group.push({ text: detail || "原紀錄沒有其他欄位", count: item.count });
    medicationGroups.set(key, group);
  }

  lines.push("", "【用藥紀錄】");
  lines.push(`來源共${medications.length}筆；完全相同紀錄合併後${medicationUnique.length}筆。重複次數以×N保留；不同欄位不合併。`);
  if (!medications.length) lines.push("未提供用藥紀錄。");
  for (const key of [...medicationGroups.keys()].sort().reverse()) {
    lines.push(key);
    for (const item of medicationGroups.get(key) ?? []) {
      lines.push(`- ${item.text}${item.count > 1 ? `｜×${item.count}` : ""}`);
    }
  }

  const labs = sourceRecords(rawSources, "labData");
  const labUnique = countExact(labs);
  const labGroups = new Map<string, Array<{ text: string; count: number }>>();
  for (const item of labUnique) {
    const record = isRecord(item.record) ? item.record : {};
    const key = [
      clean(record.fee_ym),
      clean(record.order_code),
      clean(record.order_name),
      `檢體或模式:${clean(record.inspect_mode)}`,
    ].join("｜");
    let detail = `${clean(record.assay_item_name)}=${clean(record.assay_value)}`;
    if (clean(record.unit_data) !== "未提供") detail += ` ${clean(record.unit_data)}`;
    detail += `｜參考:${clean(record.consult_value)}`;
    const extras = Object.entries(record)
      .filter(([field, itemValue]) =>
        ![
          "fee_ym",
          "order_code",
          "order_name",
          "assay_method",
          "inspect_mode",
          "assay_item_name",
          "assay_value",
          "unit_data",
          "consult_value",
        ].includes(field) && !BILLING_ONLY_FIELDS.has(field) && itemValue !== null && itemValue !== undefined && itemValue !== "",
      )
      .map(([field, itemValue]) => `${field}:${clean(itemValue)}`);
    if (extras.length) detail += `｜其他欄位:${extras.join("、")}`;
    const group = labGroups.get(key) ?? [];
    group.push({ text: detail, count: item.count });
    labGroups.set(key, group);
  }

  lines.push("", "【檢驗與檢查紀錄】");
  lines.push(`來源共${labs.length}筆；完全相同紀錄合併後${labUnique.length}筆。若來源只有費用年月而沒有採檢日時，不得推定同月份內的先後順序。`);
  if (!labs.length) lines.push("未提供檢驗與檢查紀錄。");
  for (const key of [...labGroups.keys()].sort().reverse()) {
    lines.push(key);
    for (const item of labGroups.get(key) ?? []) {
      lines.push(`- ${item.text}${item.count > 1 ? `｜×${item.count}` : ""}`);
    }
  }

  lines.push("", "【其他來源的非空紀錄】");
  let otherCount = 0;
  for (const [key] of sourceEntries.filter(([sourceKey]) => !["medication", "labData"].includes(sourceKey))) {
    const records = sourceRecords(rawSources, key);
    if (!records.length) continue;
    otherCount += records.length;
    const unique = countExact(records);
    lines.push(`${SOURCE_LABELS[key] ?? key}（${key}）：來源${records.length}筆，完全相同紀錄合併後${unique.length}筆。`);
    unique.forEach((item, index) => {
      lines.push(`- ${index + 1}. ${compactRecord(item.record)}${item.count > 1 ? `｜×${item.count}` : ""}`);
    });
  }
  if (!otherCount) lines.push("其餘來源目前沒有可列出的紀錄。");

  const otherRootKeys = Object.keys(value).filter(
    (key) => !["downloadType", "userInfo", "userInput", "rawSources"].includes(key),
  );
  if (otherRootKeys.length) {
    lines.push("", "【其他根層欄位】");
    for (const key of otherRootKeys) lines.push(`${key}：${clean(value[key])}`);
  }

  lines.push("", "【資料使用限制】");
  lines.push("以上為來源JSON重新排版；除合併完全相同紀錄外，未刪除不同結果，也未判定哪一筆較可信。重複筆數均以×N保留。");
  lines.push("不同檢驗數值可能代表真實病程變化，也可能涉及資料品質；若有疑義，應由醫療人員結合實際採檢時間與臨床狀況確認。");
  lines.push("來源未提供的日期、糖尿病類型、診斷、檢驗、用藥狀態或治療資訊不得自行補寫；歷史申報用藥不得直接描述為目前仍在使用。");
  return lines.join("\n");
}
