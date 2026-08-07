/**
 * arm C 的組裝層。
 *
 * 責任分配（這一版和上一版最大的差別）：
 *
 *   併發症主題要不要納入 → **程式**依 R／PR 判定，不由 LLM 決定。
 *     上一版讓 LLM 依「R>0 或 PR 存在」選模組，結果五位病人幾乎都選滿六個主題，
 *     個人化整個塌掉。原因不是模型選錯，是規則太寬。
 *
 *   LLM 只負責規則做不到的事：排出前三優先、指出資料中需要醫療團隊注意的地方，
 *   以及對程式的判定提出不同意見（不同意見會被記錄，但不會覆寫程式判定）。
 *
 *   病人可見正文一律由程式以固定文字組合，LLM 不改寫、不補數值。
 */

import {
  EDUCATION_MODULES,
  pregnancyApplies,
  MODULE_BY_ID,
  MODULE_CATALOG_APPROVED,
  MODULE_CATALOG_VERSION,
} from "./education-modules.ts";
import { SELF_CARE_BY_ID, SELF_CARE_VERSION, selectSelfCareModules } from "./self-care-modules.ts";
import { RULES_VERSION, RULES_SOURCE, RULES_BY_ID, citationShort } from "./guideline-rules.ts";
import { fingerprintLabel } from "./fingerprint.ts";
import { resolveTargets, type ResolvedPlanTargets } from "./resolve-targets.ts";
import type { PatientFacts } from "./patient-facts.ts";
import { SHARED_CARE_BLOCKS, followUpForClinician, followUpSchedule } from "./shared-care.ts";
import {
  describeRange,
  PATIENT_LAB_ANALYTES,
  describeRangeForClinician,
  evaluateThresholds,
  extractLabFindings,
  ckdMonitoringRuleId,
  kidneyLabEvidence,
  lowestMeasuredGlucose,
  type Analyte,
} from "./lab-findings.ts";
import { ANALYTE_TO_MODULE, compareToTargets, outOfTargetOnly } from "./target-comparison.ts";
import { formatLabReview, type LabReviewCheck } from "./lab-llm.ts";
import { formatLabNarrative, type LabNarrativeCheck } from "./lab-narrative.ts";

/**
 * PR 數值的極性——整個 arm C 的臨床意義都掛在這一個常數上，改錯會把每位病人的
 * 風險判定整個反過來，因此把來源寫在這裡，並且只在這裡定義一次。
 *
 * **2026-08-04：由資料來源方確認為 zero-is-low-risk。**
 *   PR=0 日常維持、PR=1 適度介入、PR=2 積極照護。
 *   同時確認先前流傳的 prompt（v14 及其衍生說法）在這一點上是錯的。
 *
 * 這推翻了先前依資料歸納的設定，過程記在這裡以免重蹈：
 *
 *   歸納一：舊批次匯出同時給了數值與中文敘述，同一位病人 PR3=0、PR4=0、PR6=0，
 *     敘述為「腎病變:高風險, 神經病變:高風險, 周邊血管病變:高風險」。
 *     那份對照現在看來要嘛是另一套編碼，要嘛是匯出時就已對錯，不可作為依據。
 *
 *   歸納二：三位 CKD=1 的病人 PR3 全部為 0，唯一 PR3=2 的病人 CKD=0。
 *     依確認後的極性，等於風險模型對已有慢性腎臟病的人預測「腎病變日常維持」。
 *     ⚠ 這個現象沒有被解釋掉，值得向來源方追問——但 n 只有 3，
 *     而且推導規則本來就不對我們公開，不足以推翻書面確認。
 *
 * 教訓：靠六位病人的資料歸納一個決定臨床方向的常數，即使內部一致也可能是錯的。
 * 這種常數要的是規格，不是統計。
 *
 * ── R 值的意義（2026-08-05 由資料負責人確認）──────────────────
 *
 * R1–R7 就是 DCSI 的分項分數，**DCSI 怎麼算就怎麼用**，我們不另做判斷。
 * 六位病人 sum(R) 全部等於 DCSI，無一例外，與這個說法一致。
 *
 * 因此 R4=2 不是錯誤：原始 DCSI 的神經病變雖然只計 0/1，但這份資料的實作
 * 計到 2，我們照收。規格文件寫「R4 區分 0/1」講的是狀態數（有／無），
 * 不是字面值——實測 R4 只出現 0 與 2，從沒出現 1，與二元一致。
 */
/** 風險最低，維持既有照護即可，不納入主題內容 */
export const PR_LOW = 0;
/** 中等風險，只給簡短提醒 */
export const PR_MODERATE = 1;
/** 風險最高，需要完整模組 */
export const PR_HIGH = 2;

/** PR 分級用語。沿用 v14 已定義的三級，避免病人版出現「高／中／低風險」標籤。 */
export const PR_ACTION_TIER: Record<number, string> = {
  [PR_HIGH]: "積極照護",
  [PR_MODERATE]: "適度介入",
  [PR_LOW]: "日常維持",
};

const TOPIC_TO_MODULE: Record<number, string> = {
  1: "EYE-CORE",
  2: "STROKE-CORE",
  3: "KIDNEY-CORE",
  4: "NERVE-CORE",
  5: "HEART-CORE",
  6: "LEG-CIRCULATION-CORE",
};

const TOPIC_NAMES: Record<number, string> = {
  1: "視網膜病變",
  2: "腦血管疾病",
  3: "腎臟病變",
  4: "神經病變",
  5: "心血管疾病",
  6: "周邊血管疾病",
  // 第 7 項沒有對應的衛教模組（來源也不提供 PR7），但主管機關要求現況必須呈現。
  7: "代謝性急症",
};

export type TopicKind =
  | "established"
  | "prevention-active"
  | "prevention-moderate"
  | "excluded";

export type TopicDecision = {
  topic: number;
  topicName: string;
  moduleId: string;
  kind: TopicKind;
  rValue: number | null;
  prValue: number | null;
  reason: string;
  /**
   * 只由檢驗數值救回來的主題。
   *
   * 指引要求先排除非糖尿病引起的腎臟病，並列出六項需排除的情形（p.197），
   * 而申報資料判定不了那些；資料也只有費用年月、沒有採檢日期——單一筆
   * eGFR 58 可能是急性腎損傷、脫水、或那天的檢驗誤差。衛教內容照給（腎功能
   * 異常本來就該講），但醫師版不能寫成「已發生」，否則等於用一筆無日期的
   * 數字下了一個指引明說需要先做鑑別診斷的判斷。
   */
  provisional?: boolean;
};

/**
 * 確定性的主題判定。
 *
 * 先講來源的資料模型，因為判定完全建立在它上面：
 * **同一個主題，R 與 PR 只會出現其中一個。** 已發生的併發症輸出 R（值恆 ≥1），
 * 尚未發生的才輸出 PR 風險預測。實測六位病人 × 7 個主題共 42 個位置，
 * 兩者同時出現的次數是 0，恰有其一的是 37（其餘 5 個是 R7/PR7，
 * 因為來源只提供 PR1–PR6，沒有 PR7）。
 *
 * 所以「R 缺值 + PR 存在」不是資訊不明，而是**該併發症尚未發生**——
 * 正因為沒發生，模型才會為它產生風險預測。
 *
 *   R 存在（恆 >0）            → 已發生，完整模組
 *   R 缺值、PR 為高風險        → 尚未發生，完整模組（預防內容）
 *   R 缺值、PR 為中風險        → 尚未發生，只給簡短提醒
 *   R 缺值、PR 為低風險        → 不納入
 *   R 與 PR 皆缺               → 真的無從判斷，不納入
 *
 * 另外：來源的 CKD 欄位若為 1，代表已有慢性腎臟病，即使 R3 缺值也要以
 * 已發生處理，否則會對 CKD 病人說「腎臟尚未受影響」。
 */
export function decideTopics(facts: PatientFacts): TopicDecision[] {
  const decisions: TopicDecision[] = [];
  const ckdFlag = facts.comorbidityFlags.ckd;
  const hasCkdFlag = ckdFlag.known && ckdFlag.value;
  const ckdIcdCodes = facts.ckdIcdCodes;
  // 檢驗證據是第三條獨立來源。R3、CKD 欄位、診斷碼都可能同時漏掉同一位病人，
  // 而 eGFR 22.8 這種數字自己就說明了問題。
  const kidneyLabs = kidneyLabEvidence(facts);

  for (let topic = 1; topic <= 6; topic += 1) {
    const r = facts.existingComplications.find((item) => item.code === `R${topic}`);
    const pr = facts.riskPredictions.find((item) => item.code === `PR${topic}`);
    const rPresent = Boolean(r?.present);
    const rValue = rPresent ? (r?.value ?? null) : null;
    const prValue = pr?.present ? pr.value : null;
    const base = {
      topic,
      topicName: TOPIC_NAMES[topic],
      moduleId: TOPIC_TO_MODULE[topic],
      rValue,
      prValue,
    };

    if (rValue !== null && rValue > 0) {
      decisions.push({ ...base, kind: "established", reason: `R${topic}=${rValue}，屬已發生的併發症現況。` });
      continue;
    }

    // 來源 CKD 欄位與申報診斷碼都是獨立於 DCSI 的既有診斷宣告，優先於 R3 的缺值。
    // DCSI 只認診斷碼，而診斷碼只出現在有開藥的就診，所以 R3 漏掉腎病變的機會不小。
    if (topic === 3 && (hasCkdFlag || ckdIcdCodes.length > 0 || kidneyLabs.triggered)) {
      const basis = hasCkdFlag
        ? "來源 CKD 欄位為 1"
        : ckdIcdCodes.length > 0
          ? `申報診斷碼出現慢性腎臟病（${ckdIcdCodes.join("、")}）`
          : kidneyLabs.reason;
      const labOnly = !hasCkdFlag && ckdIcdCodes.length === 0;
      decisions.push({
        ...base,
        kind: "established",
        provisional: labOnly,
        reason: labOnly
          ? `${basis}。${kidneyLabs.caveat}，因此列為需確認而非確診；衛教內容照納入。`
          : `${basis}，即使 R3${rPresent ? `=${rValue}` : " 缺值"} 也以已發生處理。`,
      });
      continue;
    }

    // 走到這裡代表 R 不存在或為 0（R>0 已在上面判為已發生），兩種情形都是尚未發生。
    if (prValue === PR_HIGH) {
      decisions.push({
        ...base,
        kind: "prevention-active",
        reason: `來源以 PR${topic}=${PR_HIGH}（${PR_ACTION_TIER[PR_HIGH]}）呈現、未輸出 R${topic}，依資料模型代表尚未發生；納入預防內容。`,
      });
      continue;
    }
    if (prValue === PR_MODERATE) {
      decisions.push({
        ...base,
        kind: "prevention-moderate",
        reason: `PR${topic}=${PR_MODERATE}（${PR_ACTION_TIER[PR_MODERATE]}），尚未發生；納入預防內容。`,
      });
      continue;
    }
    if (prValue === PR_LOW) {
      decisions.push({
        ...base,
        kind: "excluded",
        reason: `PR${topic}=${PR_LOW}（${PR_ACTION_TIER[PR_LOW]}），維持既有照護即可，不納入主題內容。`,
      });
      continue;
    }
    decisions.push({
      ...base,
      kind: "excluded",
      reason: `來源同時未提供 R${topic} 與 PR${topic}，無從判斷是否發生，不得補值，因此不納入。`,
    });
  }

  return decisions;
}

/**
 * 資料稽核。
 *
 * 這一站原本叫「模組挑選」，要模型排出前三優先項。實測五位病人，把它的輸出
 * 接上與不接上，兩份報告**逐字相同**——因為納入哪些主題由程式依 R／PR 判定，
 * 優先序改不了任何東西，而真正有價值的 clinician_notes 與 data_concerns
 * 則被程式直接丟棄。等於每位病人都付了一次呼叫，然後把有用的部分扔掉。
 *
 * 它丟掉的東西長這樣（實測輸出）：
 *   「基本資料標示『慢性腎臟病：否』，但檢驗紀錄顯示 eGFR 最低曾達 22.8，
 *     資料存在顯著矛盾。」
 * 那正是我們花了好幾輪才手動發現的矛盾，它每次都抓得到。
 *
 * 所以改成專職做資料稽核：拿掉優先序，結果進醫師版。
 */
export const DATA_AUDIT_PROMPT = `你是糖尿病照護資料的稽核者，讀者是醫療團隊，不是病人。

重要：哪些併發症主題要納入報告、個別化目標與追蹤間隔，**全部已由程式依 R／PR 與指引門檻表判定完成**，你不需要也不能改變。病人可見的衛教正文也由程式以已核准的固定文字組合，你寫的任何文字都不會出現在病人版。

你只做兩件規則做不到的事：

1. **找出資料本身的矛盾與限制**。例如：基本資料的共病旗標與檢驗數值互相矛盾、申報用藥距報告日過久而不能代表目前用藥、關鍵指標完全缺漏、同一項檢驗在不同院所名稱不一致而可能被程式漏抓。
2. **提醒醫療團隊需要人工確認的地方**。以「請確認什麼」的句型寫，不要下結論。

如果你認為程式的主題判定有問題，寫在 disagreements。意見會記錄下來供人工檢視，但不會覆寫程式判定——這個管道曾經抓到程式把缺值當成 0 的真實錯誤。

限制：
- 不得推測資料沒有的診斷、檢驗、日期或目前用藥。
- 申報用藥只代表曾有申報紀錄，不得當成目前正在使用。
- 不得提出停藥、加藥、換藥或調整劑量的建議。
- 每一則都要能指回輸入中的具體欄位或數值，不要寫泛泛的注意事項。

輸出格式：只輸出一個 JSON 物件，不要加說明文字或程式碼圍籬。

{
  "echo": { "age_years": 輸入中的年齡數字, "dcsi": 輸入中的 DCSI 總分（沒有就填 null） },
  "clinician_notes": ["需要醫療團隊確認的事，每則 80 字以內"],
  "data_concerns": ["資料本身的矛盾或限制，每則 80 字以內"],
  "disagreements": [
    { "topic": "R3", "program_decision": "程式的判定", "your_view": "你的看法與理由" }
  ]
}`;

export type DataAudit = {
  /**
   * 輸入中的年齡與 DCSI，由判讀器抄回來。
   *
   * 輸出檔沒有病人識別碼是刻意的（不把識別資料寫進中介檔），代價是放錯
   * 資料夾不會有任何症狀——實測就發生過兩位病人的輸出對調，而且是靠肉眼
   * 讀出「病程 1.6 年」對不上才發現的。抄回兩個數字就能自動核對。
   */
  echo: { ageYears: number | null; dcsi: number | null } | null;
  clinician_notes: string[];
  data_concerns: string[];
  disagreements: Array<{ topic: string; program_decision: string; your_view: string }>;
};

export function parseDataAudit(raw: string): DataAudit {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first === -1 || last <= first) throw new Error("輔助判讀器沒有回傳可解析的 JSON。");
    parsed = JSON.parse(candidate.slice(first, last + 1));
  }
  if (!parsed || typeof parsed !== "object") throw new Error("輔助判讀器回傳的不是 JSON 物件。");
  const record = parsed as Record<string, unknown>;

  const strings = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item) => typeof item === "string").map(String) : [];

  const echoRaw = (record.echo ?? null) as Record<string, unknown> | null;
  const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

  return {
    echo: echoRaw ? { ageYears: num(echoRaw.age_years), dcsi: num(echoRaw.dcsi) } : null,
    clinician_notes: strings(record.clinician_notes),
    data_concerns: strings(record.data_concerns),
    disagreements: (Array.isArray(record.disagreements) ? record.disagreements : [])
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({
        topic: String(item.topic ?? "").trim(),
        program_decision: String(item.program_decision ?? "").trim(),
        your_view: String(item.your_view ?? "").trim(),
      }))
      .filter((item) => item.topic),
  };
}

/**
 * 補充模組附在對應 CORE 底下，不自成一個主題。
 *
 * 少了這一條，EYE-PREGNANCY 會被當成獨立主題，然後把 EYE-T2 的補充文字再拉
 * 一次——同一句話在報告裡出現兩遍。既有的重複句測試就是這樣抓到的。
 *
 * 挑選（resolvePlan）與排版（assemblePatientReport）在兩個函式裡各用一次，
 * 所以放在模組層級：只改到一邊，補充模組就會同時是主題又是補充。
 */
const IS_SUPPLEMENT = /-(T[12]|PREGNANCY)$/;

export type ResolvedPlan = {
  decisions: TopicDecision[];
  /** 完整展開的併發症主題模組，已排序 */
  topicModuleIds: string[];
  /** 只給簡短提醒的主題 */
  moderateTopics: TopicDecision[];
  selfCareModuleIds: string[];
  selfCareReasons: Record<string, string>;
  /** 給模組文字挑選變體用的成分名 */
  medicationIngredients: string[];
  /** 病人版最終順序（含 BASE 與類型提醒） */
  patientModuleIds: string[];
  targets: ResolvedPlanTargets;
  /** 資料稽核的結果；沒跑或解析失敗時為 null。 */
  audit: DataAudit | null;
  /** LLM 指定但不在已納入清單中的優先項，已被忽略 */
  /** 病人版可讀的檢驗數值敘述（不含時序宣稱、不含筆數） */
  labNotes: string[];
  /** 醫師版：含筆數與結果種類數 */
  labNotesForClinician: string[];
  /** 由實際數值觸發、可給病人看的門檻提醒 */
  labPatientMessages: string[];
  /** 文末數值，每一則帶著它自己的說明，讓病人不必自行配對。 */
  labNoteEntries: Array<{ text: string; messages: string[] }>;
  /** 由實際數值觸發、給醫師看的門檻判定（含數值與出處） */
  labThresholds: ReturnType<typeof evaluateThresholds>;
  /** 共同照護區塊，整份報告各出現一次 */
  sharedBlockIds: string[];
  followUp: ReturnType<typeof followUpSchedule>;
  /** 各主題的就醫警訊，集中成單一清單 */
  urgentSigns: string[];
  /** 目標值與實際檢驗值的逐項比對 */
  targetComparisons: ReturnType<typeof compareToTargets>;
  /** 模組代碼 → 該器官相關的檢驗值敘述，用來嵌進對應段落 */
  labByModule: Record<string, string[]>;
  /** 同上，但每一則帶著它自己的說明。 */
  labEntriesByModule: Record<string, Array<{ text: string; messages: string[] }>>;
  /** 該器官段落建議的檢查項目中，資料裡完全沒有紀錄的那些。 */
  missingByModule: Record<string, string[]>;
  /** 用藥與檢驗資料的時間落差（天）；無法計算時為 null */
  medicationLabGapDays: number | null;
  /** 已納入門檻判定的指標數 */
  evaluatedAnalytes: number;
  /** 已由程式逐條判定的檢驗項目，供判讀器那一段去重 */
  evaluatedAnalyteKeys: string[];
  /** 有數值但未納入判定的檢驗項目種類數 */
  unevaluatedNumericItems: number;
};

export function resolvePlan(audit: DataAudit | null, facts: PatientFacts): ResolvedPlan {
  const decisions = decideTopics(facts);

  const established = decisions
    .filter((item) => item.kind === "established")
    .sort((a, b) => (b.rValue ?? 0) - (a.rValue ?? 0) || a.topic - b.topic);
  const active = decisions
    .filter((item) => item.kind === "prevention-active")
    .sort((a, b) => a.topic - b.topic);
  const moderate = decisions.filter((item) => item.kind === "prevention-moderate").sort((a, b) => a.topic - b.topic);

  // 分型專屬補充模組只有在糖尿病類型明確確認時才附加，且必須跟在對應的 CORE 之後。
  const typeSuffix =
    facts.diabetesType.verdict === "type1-confirmed"
      ? "T1"
      : facts.diabetesType.verdict === "type2-confirmed"
        ? "T2"
        : null;
  const TYPE_VARIANTS: Record<string, string> = {
    "EYE-CORE": "EYE",
    "KIDNEY-CORE": "KIDNEY",
    "NERVE-CORE": "NERVE",
  };

  // PR=1 與 PR=2 都展開完整模組；兩者的差別只留在醫師版與判定路徑的分級標示上。
  /*
   * 性別／年齡條件的補充模組，掛在對應的 CORE 之後。
   *
   * 判定放在這裡而不是輸出時再濾，是為了讓醫師版的「納入了哪些模組」與病人版
   * 實際看到的內容是同一份清單——兩邊各判一次就會有一天不一致。
   */
  const SEX_VARIANTS: Record<string, string[]> = { "EYE-CORE": ["EYE-PREGNANCY"] };
  const sexAllows = (id: string) => (MODULE_BY_ID.get(id)?.sexGate ? pregnancyApplies(facts) : true);

  const topicModuleIds: string[] = [];
  for (const item of [...established, ...active, ...moderate]) {
    topicModuleIds.push(item.moduleId);
    const prefix = TYPE_VARIANTS[item.moduleId];
    if (typeSuffix && prefix && MODULE_BY_ID.has(`${prefix}-${typeSuffix}`)) {
      topicModuleIds.push(`${prefix}-${typeSuffix}`);
    }
    for (const extra of SEX_VARIANTS[item.moduleId] ?? []) {
      if (sexAllows(extra)) topicModuleIds.push(extra);
    }
  }

  const patientModuleIds: string[] = ["BASE-01"];
  const verdict = facts.diabetesType.verdict;
  if (verdict === "conflicting" || verdict === "absent") patientModuleIds.push("TYPE-UNCLEAR");
  patientModuleIds.push(...topicModuleIds);
  if (topicModuleIds.includes("NERVE-CORE") || topicModuleIds.includes("LEG-CIRCULATION-CORE")) {
    patientModuleIds.push("BASE-02");
  }

  // 檢驗數值：接進門檻判定。沒有採檢日，所以一律以「曾出現」敘述。
  const labFindings = extractLabFindings(facts);
  const labThresholds = evaluateThresholds(labFindings, facts);

  // 計數只有一個來源：主題判定。低血糖模組要看實測值，所以檢驗判定必須先跑。
  const lowestGlucose = lowestMeasuredGlucose(labFindings);
  const selfCare = selectSelfCareModules(facts, established.length, lowestGlucose);

  // 共同照護區塊：由選到的主題決定，整份報告各出現一次。
  const needed = new Set<string>();
  for (const id of topicModuleIds) {
    for (const key of MODULE_BY_ID.get(id)?.needsShared ?? []) needed.add(key);
  }
  const sharedBlockIds = SHARED_CARE_BLOCKS.filter(
    (block) => block.appliesWhen === "always" || needed.has(block.appliesWhen),
  ).map((block) => block.id);

  // 就醫警訊集中；同一份報告裡不重複。
  const urgentSigns: string[] = [];
  for (const id of topicModuleIds) {
    const signs = MODULE_BY_ID.get(id)?.urgentSigns;
    if (signs && !urgentSigns.includes(signs)) urgentSigns.push(signs);
  }
  for (const id of selfCare.moduleIds) {
    const signs = SELF_CARE_BY_ID.get(id)?.urgentSigns;
    if (signs && !urgentSigns.includes(signs)) urgentSigns.push(signs);
  }

  const includedTopics = [...established, ...active].map((item) => item.topic);
  const targetComparisons = compareToTargets(labFindings, facts);

  // 把檢驗值嵌進對應的器官段落。稽核指出數值全放在文末附錄時，
  // 病人必須自己把「數值」和「建議」兩段對照，等於把工作丟回去。
  const labByModule: Record<string, string[]> = {};
  const labEntriesByModule: Record<string, Array<{ text: string; messages: string[] }>> = {};
  const inlined = new Set<string>();
  for (const finding of labFindings) {
    const moduleId = ANALYTE_TO_MODULE[finding.analyte];
    if (!moduleId || !topicModuleIds.includes(moduleId)) continue;
    const text = describeRange(finding);
    (labByModule[moduleId] ??= []).push(text);
    (labEntriesByModule[moduleId] ??= []).push({
      text,
      messages: [
        ...labThresholds
          .filter((hit) => hit.analyte === finding.analyte && hit.patientMessage)
          .map((hit) => hit.patientMessage as string),
        ...targetComparisons
          .filter((item) => item.analyte === finding.analyte && item.outOfTarget && item.patientMessage)
          .map((item) => item.patientMessage as string),
      ],
    });
    inlined.add(finding.analyte);
  }

  // 段落裡教了要看哪些檢查，就要說明哪一項資料中完全沒有——
  // 否則會出現「說您有腎臟問題、只給一個正常的肌酸酐」這種讀不通的組合。
  const missingByModule: Record<string, string[]> = {};
  const measured = new Set(labFindings.map((item) => item.analyte));
  for (const [moduleId, expected] of Object.entries(EXPECTED_ANALYTES)) {
    if (!topicModuleIds.includes(moduleId)) continue;
    const missing = expected.filter((item) => !measured.has(item.analyte)).map((item) => item.label);
    if (missing.length) missingByModule[moduleId] = missing;
  }

  // 用藥申報停在兩年前、檢驗卻是近月，這種落差醫師需要知道。
  let medicationLabGapDays: number | null = null;
  if (facts.medicationDateRange.known && facts.reportDate.known) {
    const latest = Date.parse(`${facts.medicationDateRange.value.latest}T00:00:00Z`);
    const report = Date.parse(`${facts.reportDate.value}T00:00:00Z`);
    if (Number.isFinite(latest) && Number.isFinite(report)) {
      medicationLabGapDays = Math.round((report - latest) / 86_400_000);
    }
  }

  return {
    decisions,
    topicModuleIds,
    moderateTopics: moderate,
    selfCareModuleIds: selfCare.moduleIds,
    selfCareReasons: selfCare.reasons,
    medicationIngredients: facts.medicationIngredients,
    patientModuleIds,
    targets: resolveTargets(facts, established.length),
    audit,
    // 已經嵌進器官段落的就不在文末摘要重複一次。
    labNotes: labFindings.filter((f) => !inlined.has(f.analyte)).map(describeRange),
    labNotesForClinician: labFindings.map(describeRangeForClinician),
    labPatientMessages: labThresholds
      .map((hit) => hit.patientMessage)
      .filter((message): message is string => Boolean(message)),
    // 輕重之分靠排序表達，不靠在前面加一個摘要區塊。
    // 摘要區塊只會列出「血鈉異常」這種病人看不懂又無從行動的臨床名詞，
    // 而且緊接著的資料限制說明會立刻否定它。
    /*
     * 病人版只列糖尿病照護相關的檢驗——見 PATIENT_LAB_ANALYTES。
     *
     * 少了這個過濾，血鈉 122 會以「・血鈉：122 mmol/L」的樣子留在清單裡，
     * 而它的說明已經移到醫師版，於是變成一個沒有任何解釋的數字。那比原本
     * 更糟：病人看到一個看不懂的異常值，卻連「該做什麼」都沒有。
     */
    labNoteEntries: labFindings
      .filter((f) => PATIENT_LAB_ANALYTES.has(f.analyte))
      .filter((f) => !inlined.has(f.analyte))
      .map((f) => {
        // 說明有兩個來源：門檻判定與目標比對。先前只配對前者，導致
        // 「飯前血糖 20–315」底下沒有說明，而說明掉到區塊最後變成孤兒。
        const hits = labThresholds.filter((hit) => hit.analyte === f.analyte && hit.patientMessage);
        const offTarget = targetComparisons.filter(
          (item) => item.analyte === f.analyte && item.outOfTarget && item.patientMessage,
        );
        const messages = [
          ...hits.map((hit) => hit.patientMessage as string),
          ...offTarget.map((item) => item.patientMessage as string),
        ];
        return {
          text: describeRange(f),
          messages,
          rank: hits.some((hit) => hit.severity === "urgent") ? 0 : messages.length ? 1 : 2,
        };
      })
      .sort((a, b) => a.rank - b.rank)
      .map(({ text, messages }) => ({ text, messages })),
    labThresholds,
    sharedBlockIds,
    targetComparisons,
    labByModule,
    labEntriesByModule,
    missingByModule,
    medicationLabGapDays,
    evaluatedAnalytes: labFindings.length,
    evaluatedAnalyteKeys: labFindings.map((item) => item.analyte),
    unevaluatedNumericItems: facts.labItems.filter(
      (item) => item.rawValues.some((v) => /^[≧≥><＞＜]?\s*\d/.test(v.trim())),
    ).length - labFindings.length,
    followUp: followUpSchedule(includedTopics, {
      kidneyIntensive: labThresholds.some((hit) => hit.code === "kidney-intensive-followup"),
          type1: facts.diabetesType.verdict === "type1-confirmed",
          ckdMonitoringRuleId: ckdMonitoringRuleId(facts),
          pregnancyRelevant: pregnancyApplies(facts),
    }),
    urgentSigns,
  };
}

function draftBanner(narrative = false): string[] {
  const extra = narrative
    ? ["※ 本報告的「觀察摘要」「短期建議」「中期目標」三段由模型直接撰寫，未經醫療團隊逐句核准；數值已由程式逐一比對來源，目標值取自指引門檻表。"]
    : [];
  if (MODULE_CATALOG_APPROVED) return extra.length ? [...extra, ""] : [];
  return [
    `※ DRAFT｜衛教模組 ${MODULE_CATALOG_VERSION}／自我照護模組 ${SELF_CARE_VERSION}／指引門檻表 ${RULES_VERSION} 均尚未經醫療團隊核准，僅供流程比較，不得提供給病人。`,
    ...extra,
    "",
  ];
}

/**
 * 中風險主題的一句話提醒。
 *
 * 先前這一區只印病名，讀者拿到「1. 腦血管疾病 2. 心血管疾病」加一句免責聲明——
 * 製造焦慮又不給出路。列出一個項目就要能回答「那我該做什麼」。
 */
/**
 * 各器官段落「應該要有」的檢查項目。資料中完全沒有紀錄時要講出來，
 * 因為那本身就是一件病人可以在回診時處理的事。
 */
const EXPECTED_ANALYTES: Record<string, Array<{ analyte: Analyte; label: string }>> = {
  "KIDNEY-CORE": [
    { analyte: "UACR", label: "尿液白蛋白／肌酸酐比值（UACR）" },
    { analyte: "creatinine", label: "血清肌酸酐" },
    { analyte: "eGFR", label: "腎絲球過濾率（eGFR）" },
  ],
};



export type AssembleOptions = {
  /**
   * 這份報告實際產出的日期，由呼叫端給（通常是今天）。
   *
   * 不可用來源的 REPORT_DATE 代替。那是資料匯出當時的日期，會讓一份今天
   * 產出的報告顯示成十幾天前做的，而病人版還要讀者「請先查看資料截至日期」——
   * 兩個日期一樣就等於沒有給任何資訊。
   */
  reportDate: string | null;
  /** 資料的截止日，來自來源的 REPORT_DATE。 */
  dataCutoff: string | null;
  /**
   * 產出這份報告時所用輸入的指紋。
   *
   * 印在抬頭，讓一份已經印出來的報告事後仍可追回是哪一份輸入——換病人後
   * 某次呼叫失敗、畫面留著上一位的報告，是這條流程最容易發生也最難察覺
   * 的錯誤，而兩份報告長得幾乎一樣。
   */
  inputFingerprint?: string;
  /** 檢驗判讀器的輸出；未執行時省略。只影響醫師版。 */
  labReview?: LabReviewCheck;
  /**
   * 病人版的檢驗敘述；未執行時省略，改用程式組出的固定句型。
   *
   * 這是報告中唯一一段未經逐句核准的文字。程式驗證它引用的數值與禁止事項，
   * 但不改寫它——判定是它的職責。
   */
  labNarrative?: LabNarrativeCheck;
};

/**
 * 安全提示的分級標籤。
 *
 * 內部鍵值沿用 info／attention／urgent（排序要用），但**印出來的字不能暗示即時性**。
 * 這些數值全部來自沒有採檢日的申報資料——一筆 Na 124 可能是兩年前住院時測的、
 * 早就處理完了。標成「urgent」等於要醫師對一個可能已經不存在的狀況立刻反應。
 *
 * 分級真正的意思是「該優先核實哪一項目前狀態」，不是「現在有多急」。
 */
const SEVERITY_LABEL: Record<"info" | "attention" | "urgent", string> = {
  urgent: "優先核實",
  attention: "留意",
  info: "參考",
};

/**
 * 三個標題層級要一眼分得出來，否則「腦血管」和「掌握自己的數字」看起來
 * 是同一種東西——前者是你的狀況，後者是要做的事。
 *
 *   ──── 分隔線＋【】  區塊
 *   ◆                  模組
 *   1. 2. 3.／・        內容（指令／資訊）
 */
function section(lines: string[], title: string) {
  lines.push("────────────────────────────────", `【${title}】`, "");
}

/**
 * 病人版：逐字使用固定文字，不出現代碼、分數或高／中／低風險標籤。
 *
 * 結構經過一次重整：主題模組只放該疾病特有的內容，通用照護、追蹤時程與
 * 就醫警訊各集中一次，避免六個模組串起來後同一件事講六遍。
 */
export function assemblePatientReport(plan: ResolvedPlan, options: AssembleOptions): string {
  const lines: string[] = [...draftBanner(Boolean(options.labNarrative))];

  lines.push("糖尿病衛教報告");
  lines.push(`報告產生日期：${options.reportDate ?? "未提供"}`);
  lines.push(`資料截至日期：${options.dataCutoff ?? "未提供"}`);
  if (options.inputFingerprint) lines.push(fingerprintLabel(options.inputFingerprint));
  lines.push("");

  const byId = new Map(plan.decisions.map((item) => [item.moduleId, item]));
  /**
   * suffix：狀態直接寫在標題上。
   * 區塊開頭那句「以下是已經有的狀況」在第 17 行，讀到第 45 行的「腎臟」時
   * 已經隔了 30 行，而器官名本身是中性的——單看標題分不出是「你已經有」
   * 還是「你要預防」。
   *
   * merged：分型補充模組（EYE-T2 等）原本各自起一個「第二型糖尿病眼底檢查補充」
   * 標題，讀起來像文件章節編號而不是對病人說話。改為併進母模組的內文。
   */
  // 有 LLM 敘述時，數值全部集中在那一段；器官段落不再嵌入，否則同一個 eGFR
  // 會用兩種語氣講兩次。缺檢提示保留——那是程式知道而敘述器不知道的事
  // （它只描述存在的紀錄，不知道「該有而沒有」）。
  const inlineValues = !options.labNarrative;
  const emit = (id: string, suffix = "", merged: string[] = []) => {
    const moduleDef = MODULE_BY_ID.get(id);
    if (!moduleDef) return;
    lines.push(`◆ ${moduleDef.title}${suffix}`, "");
    lines.push(moduleDef.patientText, "");
    for (const extra of merged) lines.push(extra, "");
    // 相關數值直接放在該器官段落，病人不必自己回頭對照文末附錄。
    const entries = inlineValues ? plan.labEntriesByModule[id] : undefined;
    if (entries?.length) {
      // 時間限制在報告開頭講過一次，這裡不重複，否則每個器官段落都會再唸一遍。
      // 標題帶上器官名，才不會和文末的「您的其他檢驗數值」撞名。
      lines.push(`您的${moduleDef.title}相關數值：`, "");
      // 數值是資訊、不是待辦。用「・」和行動項目的「1. 2. 3.」區隔，
      // 否則同一份報告裡「1. 血糖 55–459」和「1. 每天查看腳背」讀起來是同一種東西。
      entries.forEach((entry) => {
        lines.push(`・${entry.text}`);
        for (const message of entry.messages) lines.push(`   ${message}`);
      });
      lines.push("");
    }
    const missing = inlineValues ? plan.missingByModule[id] : undefined;
    if (missing?.length) {
      lines.push(`您的資料中沒有${missing.join("、")}的紀錄。回診時可以確認是否需要安排。`, "");
    }
  };

  for (const id of ["BASE-01", "TYPE-UNCLEAR"]) {
    if (plan.patientModuleIds.includes(id)) emit(id);
  }

  // 檢驗資料的時間限制整份報告只講一次，之後各處直接列數值。
  const hasAnyValues = plan.labNotes.length > 0 || Object.keys(plan.labByModule).length > 0;
  if (hasAnyValues) {
    lines.push(
      "以下提到的檢驗數值都來自健保申報紀錄。這些紀錄只有費用年月、沒有檢查日期，因此無法確認先後順序，也無法確認哪一筆最新。",
      "",
    );
  }



  const topicIds = plan.patientModuleIds.filter((id) => !["BASE-01", "TYPE-UNCLEAR"].includes(id));
  /**
   * 已發生與預防不分區。
   *
   * R 欄位來自我們看不到推導方式的來源倉儲，分成「您已有的」與「預防的」
   * 兩區等於要病人自己去想「我到底有沒有」——而那個問題我們答不了。
   * 該給的衛教照給，順序上已發生的排前面，但不標示狀態。
   */
  const orderedIds: string[] = [];
  // 順序：已發生排前面，其次積極照護，再來適度介入。三種都會展開完整模組。
  for (const kind of ["established", "prevention-active", "prevention-moderate"] as const) {
    for (const id of topicIds) {
      if (IS_SUPPLEMENT.test(id)) continue;
      const decision = byId.get(id);
      const parent = decision ? null : topicIds.find((other) => byId.get(other) && id.startsWith(other.split("-")[0]));
      const actual = decision?.kind ?? (parent ? byId.get(parent)?.kind : undefined);
      if (actual !== kind) continue;
      orderedIds.push(id);
    }
  }


  if (options.labNarrative) {
    // LLM 直接寫的連貫段落。固定句型只涵蓋程式有規則的項目，而且會把
    // 「曾出現偏低」與「曾出現偏高」並排成兩句，要讀者自己合起來想。
    section(lines, "觀察摘要：您的檢驗數值");
    lines.push(...formatLabNarrative(options.labNarrative), "");
  } else {
  // 沒有配對到任何數值的提醒（例如「資料中沒有 HbA1c 紀錄」、低血糖跨了兩種
    // 血糖項目）也必須印出來。先前整段包在 labNoteEntries.length 裡，數值全部
    // 被嵌進器官段落時 labNoteEntries 是空的，這些提醒就跟著消失了。
    const pairedMessages = new Set([
      ...plan.labNoteEntries.flatMap((entry) => entry.messages),
      ...Object.values(plan.labEntriesByModule).flatMap((entries) => entries.flatMap((entry) => entry.messages)),
    ]);
    const looseMessages = [
      ...plan.labPatientMessages.filter((message) => !pairedMessages.has(message)),
      ...outOfTargetOnly(plan.targetComparisons)
        .map((item) => item.patientMessage)
        .filter((message): message is string => Boolean(message))
        .filter((message) => !pairedMessages.has(message)),
    ];

    if (plan.labNoteEntries.length || looseMessages.length) {
      section(lines, "觀察摘要：您的其他檢驗數值");
      plan.labNoteEntries.forEach((entry) => {
        lines.push(`・${entry.text}`);
        for (const message of entry.messages) lines.push(`   ${message}`);
      });
      if (plan.labNoteEntries.length) lines.push("");
      for (const message of looseMessages) lines.push(message, "");
    }
  }

  // 短期建議：LLM 與觀察摘要同一次呼叫產生，屬於個人化內容。
  // 模型沒回這一段就整段不印——寧可少一節，也不要放一段沒人寫過的空話。
  if (options.labNarrative?.shortTerm) {
    section(lines, "短期建議：這一兩週可以開始做的事");
    lines.push(options.labNarrative.shortTerm, "");
  }

  /**
   * 中期目標。
   *
   * 這一段本來只在醫師版有，病人版看不到自己要往哪裡走——只知道現在的數值，
   * 不知道該落在哪裡、什麼時候再驗。目標值與出處都取自門檻表，不是模型生成的。
   *
   * 追蹤間隔併進來：目標與「什麼時候再驗一次」分成兩段的話，病人得自己配對。
   */
  const patientTargets = plan.targets.targets.filter((item) => item.value && !item.needsClinicianConfirmation);
  if (options.labNarrative?.midTerm || patientTargets.length || plan.followUp.text) {
    section(lines, "中期目標：下一階段要達到的數字");
    // 目標數字一律出自門檻表。LLM 拿到的就是下面這份清單，它只負責寫成病人的話——
    // 讓模型自己訂目標值會失去可追溯性，也可能跟醫師版對不上。
    if (options.labNarrative?.midTerm) {
      lines.push(options.labNarrative.midTerm, "");
    } else if (patientTargets.length) {
      // 出處只在這裡講一次。逐條掛〔章表，p.頁次〕會把頁碼變成病人版追溯不到的
      // 裸數字，而且對病人沒有意義——要回查的是醫師，醫師版本來就逐條附了。
      lines.push("以下是依中華民國糖尿病學會指引、對照您的狀況推出的控制目標。實際數字仍以醫療團隊的評估為準。", "");
      for (const target of patientTargets) {
        const rule = target.ruleId ? RULES_BY_ID.get(target.ruleId) : undefined;
        lines.push(`◆ ${target.metric}：${rule?.patientStatement ?? target.value}`, "");
      }
    }
    // LLM 版的中期目標已經把追蹤時間寫進去了（那份間隔也是餵給它的材料之一），
    // 再印一次就是同一件事講兩遍。
    if (!options.labNarrative?.midTerm && plan.followUp.text) {
      lines.push("下次檢查的建議時間：", "");
      lines.push(plan.followUp.text, "");
    }
  }

  // 「照護重點」與「每天可以做的事」是我們的內部分類（跨主題共用區塊 vs
  // DSMES 自我照護模組），不是病人的分類——兩區都是「要做的事」，分成兩塊
  // 只會讓人以為有什麼差別。合成一區。
  if (orderedIds.length) {
    // 有些主題是風險預測選進來的。原本這句話掛在「持續留意」那一區，
    // 那一區併進來之後若不補回來，病人會把預測讀成已經確診。
    const fromPrediction = orderedIds.some((id) => {
      const decision = byId.get(id) ?? byId.get(topicIds.find((other) => id.startsWith(other.split("-")[0])) ?? "");
      return decision?.kind === "prevention-active" || decision?.kind === "prevention-moderate";
    });
    section(lines, "併發症風險：與您有關的健康重點");
    lines.push(
      "以下項目依您的健康紀錄挑選。若不確定自己是否有相關診斷，請回診時向醫療團隊確認。",
      ...(fromPrediction
        ? ["其中有些來自風險評估而非診斷，列出是為了提早注意，不代表您已經有這個疾病。"]
        : []),
      "",
    );
    for (const id of orderedIds) {
      const extras = topicIds
        .filter((other) => IS_SUPPLEMENT.test(other) && other.split("-")[0] === id.split("-")[0])
        .map((other) => MODULE_BY_ID.get(other)?.patientText)
        .filter((text): text is string => Boolean(text));
      emit(id, "", extras);
    }
  }

  if (plan.sharedBlockIds.length || plan.selfCareModuleIds.length) {
    section(lines, "預防叮嚀：日常照護");
    for (const id of plan.sharedBlockIds) {
      const block = SHARED_CARE_BLOCKS.find((item) => item.id === id);
      if (!block) continue;
      lines.push(`◆ ${block.title}`, "");
      lines.push(block.text, "");
    }
    const kidneyOrHeart = plan.decisions.some(
      (item) => item.kind === "established" && (item.topic === 3 || item.topic === 5),
    );
    const ingredients = plan.medicationIngredients.join(" ");
    const active: Record<string, boolean> = {
      "kidney-or-heart": kidneyOrHeart,
      "sick-day-hold-drugs": /metformin|雙胍|gliflozin/i.test(ingredients),
      sglt2: /gliflozin/i.test(ingredients),
    };
    for (const id of plan.selfCareModuleIds) {
      const moduleDef = SELF_CARE_BY_ID.get(id);
      if (!moduleDef) continue;
      let text = moduleDef.patientText;
      let changed = false;
      for (const variant of moduleDef.definiteVariants ?? []) {
        if (!active[variant.when]) continue;
        /*
         * from 對不到就要炸。
         *
         * 原本無論有沒有換成功都設 changed = true，所以一個對不到的 from 會
         * 安靜地什麼都不做——報告照樣產出，只是留著我們已經判定「對這位病人
         * 不適用」的那句話。兩個 variant 指向同一行時尤其容易發生：第一個換掉
         * 之後，第二個的 from 就再也對不到了。
         *
         * 這種情況下丟出來比出報告好。留著的是我們明知不適用的衛教內容，
         * 而下面的測試會在進產品前就把它擋掉。
         */
        if (!text.includes(variant.from)) {
          throw new Error(
            `模組 ${moduleDef.id} 的 ${variant.when} 變體對不到原文，替換沒有發生。` +
              `原文可能被改過，或被另一個變體先換走了。要換的是：「${variant.from.slice(0, 30)}…」`,
          );
        }
        text = text.replace(variant.from, variant.to);
        changed = true;
      }
      if (changed) text = renumber(text);
      lines.push(`◆ ${moduleDef.title}`, "");
      lines.push(text, "");
    }
  }

  /*
   * 就醫警訊放在最後。
   *
   * 先前放在最前面，理由是「唯一延誤會造成傷害的內容」。改成最後是資料負責人的
   * 決定：個人化的內容（觀察摘要、短期建議、中期目標）才值得排前面，模組型的
   * 通用衛教網路上就找得到。取捨要記著——病人沒讀完就放下時，紅旗清單是最先漏掉的。
   */
  if (plan.urgentSigns.length) {
    section(lines, "什麼情況要立刻就醫");
    // 分兩組。先前是一串 1–9，要逐條讀完才知道哪幾條該打 119。
    // 「儘速就醫；若呼吸困難明顯再打 119」這種混合式的主要指示是儘速就醫，
    // 放進 119 那組會誇大。只有整條就是叫人打 119 的才算。
    const needs119 = (text: string) => /119/.test(text) && !/儘速就醫|當天/.test(text);
    const groups: Array<[string, string[]]> = [
      ["立即撥打 119", plan.urgentSigns.filter(needs119)],
      ["儘速就醫", plan.urgentSigns.filter((item) => !needs119(item))],
    ];
    for (const [title, items] of groups) {
      if (!items.length) continue;
      lines.push(`◆ ${title}`, "");
      items.forEach((item, index) => lines.push(`${index + 1}. ${item}`, ""));
    }
  }

  return lines.join("\n").trimEnd();
}

/** 醫師版：含 DCSI、R1–R7、PR1–PR7 代碼與分數（法規要求），以及個別化目標與安全旗標。 */
/**
 * 條列重新編號。變體會插入或移除條目，直接沿用原文的數字會撞號
 * （實測出現過 1, 2, 2, 3, 4, 4）。
 */
function renumber(text: string): string {
  let n = 0;
  return text
    .split("\n")
    .map((line) => (/^\d+\.\s/.test(line) ? line.replace(/^\d+\.\s/, `${++n}. `) : line))
    .join("\n");
}

const DIABETES_TYPE_LABEL: Record<PatientFacts["diabetesType"]["verdict"], string> = {
  "type1-confirmed": "診斷碼指向第 1 型",
  "type2-confirmed": "第 2 型",
  conflicting: "⚠ 第 1 型與第 2 型診斷碼並存",
  absent: "資料中無糖尿病診斷碼",
};

export function assembleClinicianReport(plan: ResolvedPlan, facts: PatientFacts, options: AssembleOptions): string {
  const lines: string[] = [...draftBanner()];

  lines.push("【AI 醫療人員報告】");
  lines.push(`報告產生日期：${options.reportDate ?? "未提供"}`);
  lines.push(`資料截至日期：${options.dataCutoff ?? "未提供"}`);
  if (options.inputFingerprint) lines.push(fingerprintLabel(options.inputFingerprint));
  lines.push(`年齡：${facts.ageYears.known ? `${facts.ageYears.value} 歲` : "未提供"}｜性別：${facts.sex.known ? facts.sex.value : "未提供"}｜糖尿病病程：${facts.diabetesDurationYears.known ? `${facts.diabetesDurationYears.value} 年` : "未提供"}`);
  lines.push("");

  const NUM = ["一", "二", "三", "四", "五", "六", "七", "八"];
  let sectionNo = 0;
  const section = (title: string) => `${NUM[sectionNo++]}、${title}`;

  lines.push(section("併發症現況與風險預測"));
  lines.push(`DCSI 總分：${facts.dcsiTotal.known ? facts.dcsiTotal.value : "來源未提供"}`);
  const rByTopic = new Map(facts.existingComplications.map((item) => [item.code.slice(1), item]));
  const prByTopic = new Map(facts.riskPredictions.map((item) => [item.code.slice(2), item]));
  const kindByTopic = new Map(plan.decisions.map((item) => [String(item.topic), item.kind]));
  const topics = Object.keys(TOPIC_NAMES).map(Number).sort((a, b) => a - b);
  const width = Math.max(...topics.map((topic) => TOPIC_NAMES[topic].length));
  for (const topic of topics) {
    const key = String(topic);
    const r = rByTopic.get(key);
    const pr = prByTopic.get(key);
    let state: string;
    if (r?.present) {
      state = `已發生（嚴重度 ${r.rawValue}）`;
    } else if (kindByTopic.get(key) === "established") {
      /*
       * 用該主題實際的判定理由，不要固定寫「依來源 CKD 註記」。
       * 腎臟主題有三條覆寫來源（CKD 欄位／申報診斷碼／檢驗證據），寫死一條
       * 等於對另外兩條說謊——醫師照著去查 CKD 欄位會發現它是 0。
       */
      const decision = plan.decisions.find((entry) => String(entry.topic) === key);
      const prefix = decision?.provisional ? "需確認" : "已發生";
      state = `${prefix}（${decision?.reason ?? "本項未輸出嚴重度"}）`;
    } else if (pr?.present && pr.value !== null) {
      state = `未發生｜風險預測：${PR_ACTION_TIER[pr.value] ?? "未定義分級"}`;
    } else {
      state = "來源未提供現況與風險預測";
    }
    lines.push(`  ${TOPIC_NAMES[topic].padEnd(width, "　")}  ${state}`);
  }
  lines.push("  （來源對每一項只輸出其一：已發生者給嚴重度分數，未發生者給風險預測。）");
  lines.push("");

  // 只在類型有疑義時提出來。判定為第二型是常態，寫出來只是佔版面。
  if (facts.diabetesType.verdict !== "type2-confirmed") {
    lines.push(section("糖尿病類型"));
    lines.push(`  ${DIABETES_TYPE_LABEL[facts.diabetesType.verdict]}｜${facts.diabetesType.note}`);
    const icd = [...facts.diabetesType.type1IcdCodes, ...facts.diabetesType.type2IcdCodes];
    if (icd.length) lines.push(`  相關診斷碼：${icd.join("、")}`);
    lines.push("");
  }

  // 只列推導得出的目標值。推導依據、出處與「需醫療團隊確認」這類警語刻意不印——
  // 這是給醫師看的報告，目標值本來就由他決定，把程式的推理過程貼上去只是雜訊。
  // 目標名稱也用檢驗報告的縮寫，和第四節一致。
  const METRIC_LABEL: Record<string, string> = {
    血壓: "BP",
    低密度脂蛋白膽固醇: "LDL-C",
    高密度脂蛋白膽固醇: "HDL-C",
    三酸甘油酯: "TG",
    糖化血色素: "HbA1c",
    空腹血糖: "Glucose AC",
    餐後血糖: "Glucose PC",
  };
  const decided = plan.targets.targets.filter((item) => item.value);
  if (decided.length) {
    lines.push(`${section("依指引推導的個別化目標")}　來源：${RULES_SOURCE}`);
    for (const item of decided) {
      const rule = item.ruleId ? RULES_BY_ID.get(item.ruleId) : undefined;
      lines.push(`  ${METRIC_LABEL[item.metric] ?? item.metric}：${rule?.targetValue ?? item.value}${rule ? `　〔${citationShort(rule)}〕` : ""}`);
    }
    lines.push("");
  }

  // 追蹤間隔是醫師要開單的依據，先前只出現在病人版，而且病人版用的是
  // 白話說法（「每年做一次足部感覺檢查」）。醫師版用原本的事實陳述並附出處。
  if (plan.followUp.rules.length) {
    lines.push(section("依指引的追蹤間隔"));
    lines.push(...followUpForClinician(plan.followUp.rules));
    lines.push("");
  }

  // 只保留病人特有的安全提示。申報資料的通則性限制（檢驗只有費用年月、申報用藥
  // 不等於目前用藥等）刻意不列——那些每份報告都一樣，醫師本來就知道，列了只是雜訊。
  const disagreements = plan.audit?.disagreements ?? [];
  const offTarget = outOfTargetOnly(plan.targetComparisons);
  if (plan.targets.safetyFlags.length || plan.labThresholds.length || offTarget.length || disagreements.length) {
    lines.push(section("需核實的檢驗結果"));
    // 依嚴重度排，不依插入順序——先前 [參考] 會排在 [優先核實] 前面。
    const RANK = { urgent: 0, attention: 1, info: 2 } as const;
    const rows: Array<{ severity: "info" | "attention" | "urgent"; text: string }> = [];
    for (const item of offTarget) {
      rows.push({
        severity: item.severity,
        text: `${item.clinicianMessage}${item.citationShort ? `　〔${item.citationShort}〕` : ""}`,
      });
    }
    // 由實際數值觸發的門檻判定排在最前面，因為它們最具體。
    for (const hit of plan.labThresholds) {
      const rule = hit.ruleId ? RULES_BY_ID.get(hit.ruleId) : undefined;
      rows.push({
        severity: hit.severity,
        text: `${hit.clinicianMessage}${rule ? `　〔${citationShort(rule)}〕` : ""}`,
      });
    }
    // 帶實際數值的判定已經涵蓋通則版本，兩則並列等於同一件事講兩次。
    // 具體那則（帶實際數值）涵蓋通則版；完全沒有 HbA1c 時談它可不可信也沒有意義。
    const supersededFlags =
      plan.labThresholds.some((hit) => hit.code === "hba1c-unreliable" || hit.code === "hba1c-missing")
        ? new Set(["hba1c-reliability"])
        : new Set<string>();
    for (const flag of plan.targets.safetyFlags) {
      if (supersededFlags.has(flag.code)) continue;
      const rule = flag.ruleId ? RULES_BY_ID.get(flag.ruleId) : undefined;
      rows.push({
        severity: flag.severity,
        text: `${flag.message}${rule ? `　〔${citationShort(rule)}〕` : ""}`,
      });
    }
    rows.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
    for (const row of rows) lines.push(`  [${SEVERITY_LABEL[row.severity]}] ${row.text}`);
    // 稽核對程式判定的異議很少出現；一旦出現就是需要人看的訊號。
    for (const item of disagreements) {
      lines.push(`  [異議] ${item.topic}｜程式：${item.program_decision}`);
      lines.push(`    LLM：${item.your_view}`);
    }
    lines.push("");
  }

  /*
   * 資料稽核的結果。
   *
   * 先前這一整段被程式丟棄——付了一次呼叫的錢，然後把它抓到的東西扔掉。
   * 它實測抓得到「基本資料標示慢性腎臟病：否，但 eGFR 最低曾達 22.8」這種
   * 我們花了好幾輪才手動發現的矛盾。
   *
   * 放在最後：這些是需要人工判斷的線索，不是可以直接照做的結論，
   * 排在程式判定之前會喧賓奪主。
   */
  const auditNotes = plan.audit?.clinician_notes ?? [];
  const auditConcerns = plan.audit?.data_concerns ?? [];
  if (auditNotes.length || auditConcerns.length) {
    lines.push(section("資料稽核（由模型提出，未經程式驗證）"));
    for (const note of auditNotes) lines.push(`  [請確認] ${note}`);
    for (const concern of auditConcerns) lines.push(`  [資料疑慮] ${concern}`);
    lines.push("");
  }

  // 檢驗結果合併成一節。分成「程式依指引判的」與「判讀器判的」兩節，
  // 會讓血鈉、血鉀、血糖在同一份報告出現兩次——來源不同，但醫師看到的是同一個數字。
  if (plan.labNotesForClinician.length || options.labReview) {
    lines.push(section("檢驗結果"));
    if (plan.labNotesForClinician.length) {
      lines.push("  依指引門檻表逐條判定的核心指標：");
      for (const note of plan.labNotesForClinician) lines.push(`  ${note}`);
    }
    if (options.labReview) {
      lines.push(formatLabReview(options.labReview, new Set(plan.evaluatedAnalyteKeys)));
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/** 舊名保留，供既有呼叫端使用。 */
export const assembleClinicianTrace = assembleClinicianReport;

export { EDUCATION_MODULES };

/** 把程式已完成的主題判定寫成文字，讓輔助判讀器知道哪些已納入。 */
export function decisionsForPrompt(plan: ResolvedPlan): string {
  const lines: string[] = ["【程式已完成的主題判定（不可更改）】"];
  for (const item of plan.decisions) {
    const label =
      item.kind === "established"
        ? (item.provisional ? "已納入・需確認" : "已納入・已發生")
        : item.kind === "prevention-active"
          ? "已納入・積極照護"
            : item.kind === "prevention-moderate"
              ? "已納入・適度介入"
              : "未納入";
    lines.push(`${item.moduleId}（R${item.topic} ${item.topicName}）：${label}｜${item.reason}`);
  }
  lines.push("", "【程式已納入的自我照護模組】");
  for (const id of plan.selfCareModuleIds) lines.push(`${id}：${plan.selfCareReasons[id] ?? ""}`);
  lines.push("", "【程式推導的個別化目標】");
  for (const item of plan.targets.targets) {
    lines.push(`${item.metric}：${item.value ?? "需醫療團隊定案"}（${item.reason}）`);
  }
  if (plan.targets.undetermined.length) {
    lines.push("", "【資料不足無法判定】");
    for (const item of plan.targets.undetermined) lines.push(`- ${item}`);
  }
  return lines.join("\n");
}
