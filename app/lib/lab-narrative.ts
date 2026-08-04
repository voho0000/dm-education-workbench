/**
 * 病人版的檢驗說明：由 LLM 直接寫成連貫的段落。
 *
 * 為什麼不是固定句子：實測比較過兩種做法。只讓 LLM 從已核准的句子庫挑選與排序，
 * 得到的是把「曾出現偏低」和「曾出現偏高」並排的清單，讀者要自己合起來想；
 * 直接生成則會寫出「同一段期間內同時出現過高與過低，是值得討論的情況」。
 * 而且固定句子只涵蓋我們事先想到的項目——同一位病人的血鎂、血磷、白蛋白、
 * 尿蛋白完全不會被提到，因為程式層沒有對應規則。
 *
 * 代價要說清楚：**這一段文字沒有經過醫療團隊逐句核准**，和報告其他部分不同。
 * 因此草稿橫幅會標示它，而且程式對它做兩件事：
 *
 *   1. 逐一比對它引用的每一個數值確實出現在來源紀錄裡
 *   2. 掃描它有沒有踩到禁止事項（推測診斷、處置建議、聲稱時序）
 *
 * 檢查不會改寫它的文字——判定是它的職責。但不通過的部分會被標記出來，
 * 讓人知道哪幾句不可信。
 */

import { GUIDELINE_RULES } from "./guideline-rules.ts";
import { extractLabFindings, missingCoreAnalytes } from "./lab-findings.ts";
import { labSectionOf } from "./lab-llm.ts";
import type { PatientFacts } from "./patient-facts.ts";

export const LAB_NARRATIVE_PROMPT = `你要為一位第 2 型糖尿病人寫「檢驗數值」這一段衛教內容，讀者是病人本人，不是醫療人員。

輸入分三部分：這位病人的基本資料（含性別 gender 與生日 birthday）、健保申報檢驗紀錄原文、以及一份程式初步判定「可能完全沒有紀錄」的核心指標清單。輸入不含用藥資料，不要推測或提及任何藥物。

**那份清單是待你核對的假設，不是事實。** 它是程式用項目名稱比對出來的，而各院的名稱寫法差很多（同一個檢驗可能寫成 Glu-AC、GLU_AC 或血液及體液葡萄糖），程式曾經因此整批漏抓。請你自己在紀錄裡找一遍：確實找不到的才寫進文中；若你在紀錄裡找到了，就不要說它沒做，並把它列進 found_after_all。

寫作原則：
- 依生理系統分段，例如血糖、腎臟、血液、電解質。同一段裡把相關的數值串起來講，不要一項一句。
- 只寫與糖尿病長期照護有關的項目。與糖尿病無關的異常不要寫，即使數值再誇張。
- 只反映某一次急性事件當下狀態的項目不要寫：白血球與白血球分類、發炎指標、細菌培養、血液氣體與酸鹼、凝血功能。這批紀錄沒有採檢日期，寫了會讓人誤以為是目前狀態。
- 參考值若依年齡或性別分層，依基本資料算出本人的年齡層與性別，取對應的那一段判讀。
- 用一般人看得懂的話。醫學縮寫第一次出現時用中文說明。
- 經你核對後確實找不到的核心指標，每一項都要在文中提到，說明那是評估什麼用的、以及可以在回診時確認是否需要安排。缺檢和異常一樣值得病人知道。
- 清單以外的項目不要說「沒有做」——你只需要核對清單上那幾項。
- 不要寫開場白或結語，只寫這一段本身。

嚴格禁止：
- 不得使用輸入中沒有出現的數值。每一個數字都會被逐一比對來源。
- 不得推測診斷，不得寫出任何病名作為結論。
- 不得提出處置建議，不得叫病人開始、停止、調整任何藥物或治療。
- 不得敘述趨勢、先後順序、「最近一次」、「已改善」、「持續惡化」。這批紀錄只有費用年月、沒有採檢日期。
- 不得把數值寫成目前狀態；數值可能來自兩年前的急性事件。

輸出格式：只輸出一個 JSON 物件，不要加說明文字或程式碼圍籬。

{
  "narrative": "整段內容，段落之間用 \\n\\n 分隔",
  "cited_values": [
    { "item": "項目名稱，逐字照抄來源", "value": "你在文中引用的數值，逐字照抄" }
  ],
  "found_after_all": [
    { "item": "程式說沒有、但你在紀錄中找到的核心指標", "as": "它在紀錄中實際的項目名稱" }
  ]
}`;

/**
 * 敘述器的完整輸入。網頁與管線共用同一個組裝函式——先前兩邊各自拼字串，
 * 只要有一邊忘了加缺檢清單，那一邊的輸出就會少一段而沒有任何症狀。
 */
export function buildNarrativeInput(llmText: string, facts: PatientFacts): string {
  const missing = missingCoreAnalytes(extractLabFindings(facts));
  return [
    labSectionOf(llmText),
    "【程式初步判定：可能完全沒有紀錄的核心指標（待你核對）】",
    missing.length ? missing.map((item) => `- ${item}`).join("\n") : "（無，核心指標都有紀錄）",
  ].join("\n\n");
}

export type LabNarrativeCheck = {
  narrative: string;
  /**
   * 程式判定為缺檢、但敘述器在原始紀錄中找到的項目。
   *
   * 這是給我們看的訊號，不是給病人的：出現任何一筆就代表項目名稱比對有漏，
   * 而那個漏會同時影響門檻判定與模組觸發。實測就發生過 63 筆 Glu-AC 漏抓，
   * 導致報告寫「最低 68」而真正的最低是 20 mg/dL。
   */
  foundAfterAll: Array<{ item: string; as: string }>;
  /** 引用了來源中找不到的數值 */
  unverifiedValues: Array<{ item: string; value: string }>;
  /** 文中出現但沒有列進 cited_values 的數字 */
  uncitedNumbers: string[];
  /** 踩到禁止事項的句子 */
  bannedPhrases: string[];
};

/**
 * 禁止事項的偵測樣式。
 *
 * 刻意只抓「明確違規」而不抓「可能違規」——誤報會讓標記失去意義，
 * 而這個標記的用途是告訴人「這幾句不可信」，必須夠準才有人看。
 */
const BANNED = [
  { pattern: /最近一次|最新一筆|目前的?數值為|已(改善|惡化)|持續(上升|下降|惡化)|趨勢/, label: "聲稱時序或趨勢" },
  { pattern: /建議(您)?(開始|停用|停止|加|減|換|調整).{0,6}(藥|劑量|治療)|應(停用|加藥|減量)/, label: "處置建議" },
  { pattern: /(診斷為|確診為|罹患了|您(有|患有)).{0,10}(症|病變|症候群)/, label: "推測診斷" },
];

/** 文中允許出現、不必列入 cited_values 的數字（分級、電話、份量等）。 */
const ALLOWED_NUMBERS = new Set(["1", "2", "3", "4", "5", "15", "24", "119", "1925"]);

/**
 * 指引門檻表裡出現過的數字。敘述提到「一般目標低於 7.0%」「飯前 80–130」時
 * 那些不是病人的檢驗值，但也不能無條件放行——它們必須真的來自門檻表，
 * 否則就是模型自己編的目標值。這和醫師版那條「印出的百分比必須在門檻表中
 * 找得到」是同一個檢查。
 */
const GUIDELINE_NUMBERS = new Set(
  GUIDELINE_RULES.flatMap((rule) =>
    [...`${rule.statement} ${rule.targetValue ?? ""} ${rule.patientStatement ?? ""}`.matchAll(
      /(?<![\d.])\d+(?:\.\d+)?(?![\d.])/g,
    )].map((match) => String(Number(match[0]))),
  ),
);

function numeric(raw: string): string | null {
  const match = String(raw).trim().match(/-?\d+(?:\.\d+)?/);
  return match ? String(Number(match[0])) : null;
}

export function parseLabNarrative(raw: string, facts: PatientFacts): LabNarrativeCheck {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first === -1 || last <= first) throw new Error("檢驗敘述器沒有回傳可解析的 JSON。");
    parsed = JSON.parse(candidate.slice(first, last + 1));
  }
  const record = (parsed ?? {}) as Record<string, unknown>;
  const narrative = String(record.narrative ?? "").trim();

  const cited = (Array.isArray(record.cited_values) ? record.cited_values : [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({ item: String(item.item ?? "").trim(), value: String(item.value ?? "").trim() }))
    .filter((item) => item.value);

  // 來源中實際存在的數值
  const sourceValues = new Set<string>();
  for (const item of facts.labItems) {
    for (const value of item.rawValues) {
      const n = numeric(value);
      if (n !== null) sourceValues.add(n);
    }
  }

  const unverifiedValues = cited.filter((item) => {
    const n = numeric(item.value);
    return n !== null && !sourceValues.has(n);
  });

  // 文中每一個數字都要能對應到 cited_values 或允許清單，否則就是沒被驗證過的數字
  const citedNumbers = new Set(cited.map((item) => numeric(item.value)).filter((n): n is string => n !== null));
  const uncitedNumbers = [
    ...new Set(
      [...narrative.matchAll(/(?<![\d.])\d+(?:\.\d+)?(?![\d.])/g)]
        .map((match) => match[0])
        .filter((raw) => {
          const n = numeric(raw);
          return n !== null && !citedNumbers.has(n) && !ALLOWED_NUMBERS.has(n) && !GUIDELINE_NUMBERS.has(n);
        }),
    ),
  ];

  const bannedPhrases = BANNED.filter((rule) => rule.pattern.test(narrative)).map((rule) => rule.label);

  const foundAfterAll = (Array.isArray(record.found_after_all) ? record.found_after_all : [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({ item: String(item.item ?? "").trim(), as: String(item.as ?? "").trim() }))
    .filter((item) => item.item);

  return { narrative, foundAfterAll, unverifiedValues, uncitedNumbers, bannedPhrases };
}

/** 病人版渲染。檢查不通過的部分會被標示出來，但文字本身不改寫。 */
export function formatLabNarrative(check: LabNarrativeCheck): string[] {
  const lines = [check.narrative];
  const problems: string[] = [];
  if (check.unverifiedValues.length) {
    problems.push(`引用了來源中找不到的數值：${check.unverifiedValues.map((v) => `${v.item} ${v.value}`).join("、")}`);
  }
  if (check.uncitedNumbers.length) {
    problems.push(`文中這些數字既不在引用清單也不在指引門檻表，未經比對：${check.uncitedNumbers.join("、")}`);
  }
  if (check.bannedPhrases.length) {
    problems.push(`可能踩到禁止事項：${check.bannedPhrases.join("、")}`);
  }
  if (check.foundAfterAll.length) {
    problems.push(
      `程式判定為缺檢但實際存在：${check.foundAfterAll.map((v) => `${v.item}（紀錄中寫作 ${v.as}）`).join("、")}——項目名稱比對有漏，需修正`,
    );
  }
  if (problems.length) {
    lines.push("", `⚠ 這一段未通過自動檢查，不可直接提供給病人：${problems.join("；")}`);
  }
  return lines;
}
