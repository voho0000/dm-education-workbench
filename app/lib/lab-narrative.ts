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

export const LAB_NARRATIVE_PROMPT = `你要為一位糖尿病人寫「檢驗數值」這一段衛教內容，讀者是病人本人，不是醫療人員。

輸入分三部分：這位病人的基本資料（含性別 gender 與生日 birthday）、健保申報檢驗紀錄原文、以及一份程式初步判定「可能完全沒有紀錄」的核心指標清單。輸入不含用藥資料，不要推測或提及任何藥物。

**那份清單是待你核對的假設，不是事實。** 它是程式用項目名稱比對出來的，而各院的名稱寫法差很多（同一個檢驗可能寫成 Glu-AC、GLU_AC 或血液及體液葡萄糖），程式曾經因此整批漏抓。請你自己在紀錄裡找一遍：確實找不到的才寫進文中；若你在紀錄裡找到了，就不要說它沒做，並把它列進 found_after_all。

寫作原則：
- 依生理系統分段，例如血糖、腎臟、血液、電解質。同一段裡把相關的數值串起來講，不要一項一句。
- **先講結論，數字只用來佐證。** 每一段開頭要先說這組數值代表什麼（穩定、偏高、波動大、需要注意），再舉數字。
- **同一個項目最多舉兩個數字**——通常是最低與最高，或最能說明問題的那一個。逐筆列出所有數值是把資料倒出來，不是摘要，病人讀不下去。多筆數值請改用「介於 X 到 Y 之間」或「多數落在 X 附近，但曾出現 Y」這種寫法。
- 同一項檢驗在不同院所有不同名稱時（例如 Glucose AC、Glucose AC (POCT)、Sugar AC 都是飯前血糖），合併成一項講，不要並列成好幾個名稱。
- 一段以四到六句為度。
- **觀察摘要只描述數值代表什麼，不給行動建議**。要病人做什麼一律留到短期建議那一段，這裡寫了會和後面重複，也容易在沒有足夠資訊時給錯建議。
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

除了「觀察摘要」，你還要寫兩段：

**短期建議**：病人這一兩週內就能開始做的事，側重生活形態調整與用藥安全提醒。**用編號清單，一點一個動作**，寫清楚做什麼、什麼時候做，不要寫「注意飲食」這種沒有動作的句子，也不要寫成一整段文字。用藥只能提「安全提醒」——例如生病無法進食時哪類藥要先與醫療團隊確認——不得叫病人自行開始、停止或調整任何藥物。

**不得自訂任何具體的攝取量或運動處方**：毫升、公克、大卡、分鐘、公斤、次數都不行。這些對不同病人可能相反——例如腎功能不全的人水分、蛋白質、鹽分與鉀往往需要限制而非補充，寫「每日喝 1500–2000 毫升」對他們可能有害。要提這類事情，請寫成「請醫療團隊或營養師為您訂出適合的份量」。

**中期目標**：下一階段（約三個月至下次回診）要達到的控制指標。輸入會給你一份「程式依指引推出的目標值」，**目標數字一律照抄那份清單，不得自己訂、不得換算、不得補上清單沒有的指標**。你的工作是把它寫成病人的話，並依這位病人的檢驗數值說明離目標還有多遠。清單是空的就不要編。

比較時的說法要注意：這批紀錄沒有採檢日期，**不能說「目前是 X」「現在的數值為 X」「最近一次是 X」**——我們無法確認哪一筆是現在的狀態。請改寫成「紀錄中曾出現 X」「紀錄中的 X 已在目標範圍內」「紀錄中最低／最高曾到 X」。若某項指標在紀錄中完全沒有，就說明還沒有這項數據、建議回診時安排，不要留空也不要猜。

三段都適用上面的寫作原則與嚴格禁止事項。

輸出格式：只輸出一個 JSON 物件，不要加說明文字或程式碼圍籬。

{
  "narrative": "觀察摘要整段內容，段落之間用 \\n\\n 分隔",
  "short_term": "短期建議整段內容",
  "mid_term": "中期目標整段內容",
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
export function buildNarrativeInput(
  llmText: string,
  facts: PatientFacts,
  /**
   * 程式依門檻表推出的目標與追蹤間隔。
   *
   * 中期目標的數字由程式決定、模型只負責寫成病人的話——讓模型自己訂目標值
   * 會失去可追溯性，也可能跟醫師版對不上。清單為空時提示模型不要編。
   */
  goals?: { targets: Array<{ metric: string; value: string }>; followUp: string },
): string {
  const missing = missingCoreAnalytes(extractLabFindings(facts));
  return [
    labSectionOf(llmText),
    "【程式初步判定：可能完全沒有紀錄的核心指標（待你核對）】",
    missing.length ? missing.map((item) => `- ${item}`).join("\n") : "（無，核心指標都有紀錄）",
    "【程式依指引推出的目標值（中期目標一律照抄，不得自訂）】",
    goals?.targets.length
      ? goals.targets.map((item) => `- ${item.metric}：${item.value}`).join("\n")
      : "（無，這位病人解不出可用的目標值——請不要在中期目標段編任何數字）",
    "【程式依指引推出的追蹤間隔】",
    goals?.followUp?.trim() ? goals.followUp.trim() : "（無）",
  ].join("\n\n");
}

export type LabNarrativeCheck = {
  narrative: string;
  /** 短期建議：一兩週內能開始做的事 */
  shortTerm: string;
  /** 中期目標：數字由程式給，模型只負責寫成病人的話 */
  midTerm: string;
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
  {
    /*
     * 「趨勢」單獨一個詞太寬。實測擋下了「糖化血色素能反映長期血糖趨勢」——
     * 那是在說這個指標是什麼，沒有對這位病人主張任何時序。
     *
     * 這個標記的用途是告訴人「這幾句不可信」，誤報會讓它失去意義（見上方註解），
     * 所以改成要求真的有時序主張的動詞。
     */
    pattern: /最近一次|最新一筆|目前的?數值為|已(改善|惡化)|持續(上升|下降|惡化)|趨勢(顯示|為|是|向)|(呈|有|出現).{0,4}趨勢/,
    label: "聲稱時序或趨勢",
  },
  { pattern: /建議(您)?(開始|停用|停止|加|減|換|調整).{0,6}(藥|劑量|治療)|應(停用|加藥|減量)/, label: "處置建議" },
  { pattern: /(診斷為|確診為|罹患了|您(有|患有)).{0,10}(症|病變|症候群)/, label: "推測診斷" },
];

/**
 * 文中允許出現、不必列入 cited_values 的數字（分級、電話、單位常數等）。
 *
 * 1.73 是 eGFR 單位「mL/min/1.73m²」的一部分，不是病人的數值。把它當成
 * 未核實數字會在每一份有 eGFR 的報告上掛警語——誤報多了就沒有人看警語，
 * 真正的問題反而被稀釋掉。
 */
const ALLOWED_NUMBERS = new Set(["1", "2", "3", "4", "5", "15", "24", "119", "1925", "1.73"]);

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

/*
 * 模型有時會把清單寫成「- 項目：…」。病人版禁止任何一行以 - * + • ‧ 開頭
 * （純文字輸出混進標記語法），而那是純呈現問題，內容本身沒有錯——實測一份
 * 報告因此整份被判成不可使用。
 *
 * 只去掉行首的符號，不動任何一個字。去掉之後那一行本身就是完整句子。
 */
function stripBullets(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*[-*+•‧]\s+/, ""))
    .join("\n");
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
  const narrative = stripBullets(String(record.narrative ?? "").trim());
  const shortTerm = stripBullets(String(record.short_term ?? "").trim());
  const midTerm = stripBullets(String(record.mid_term ?? "").trim());
  // 核實與禁止事項掃描對三段一視同仁。只驗觀察摘要的話，另外兩段等於沒人看，
  // 而短期建議正是最容易滑出「叫病人自行停藥」的一段。
  const allText = [narrative, shortTerm, midTerm].filter(Boolean).join("\n\n");

  const cited = (Array.isArray(record.cited_values) ? record.cited_values : [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({ item: String(item.item ?? "").trim(), value: String(item.value ?? "").trim() }))
    .filter((item) => item.value);

  /*
   * 逐「項目＋數值」比對，不是只比數值。
   *
   * 先前只確認數字曾出現在病人的**任一**檢驗裡，於是模型把血糖 315 mg/dL
   * 寫成「糖化血色素 315 %」照樣通過——315 確實存在，只是屬於另一個項目。
   * 外部審查實測到這個洞，我重現了：unverified=[]、uncited=[]，完全放行。
   *
   * 現在要求兩件事同時成立：項目名稱在來源找得到，而且那個數值屬於**那個項目**。
   * 名稱比對放寬到雙向包含（模型常寫「糖化血色素（HbA1c）」而來源是「HbA1c」），
   * 但不放寬到「任一項目」——那正是這個洞的成因。
   */
  const normalise = (text: string) =>
    text
      .toLowerCase()
      .replace(/[（）()\[\]｜|、，,。.\s_-]/g, "")
      .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));

  /*
   * 項目名與醫令名都算數。
   *
   * 送給模型的好讀文字是依醫令分組呈現的，所以模型引用時常寫醫令名稱
   * （醣化血紅素）而不是項目名稱（HbA1c）——實測一份完全正確的引用因此
   * 被判成「找不到來源」。這不是放寬檢查：兩個名稱來自同一筆紀錄，
   * 數值仍然必須是那一項自己的值。
   */
  const sourceByItem = facts.labItems.map((item) => ({
    keys: [item.itemName, ...item.orderNames].map(normalise).filter(Boolean),
    values: new Set(item.rawValues.map(numeric).filter((n): n is string => n !== null)),
  }));

  const unverifiedValues = cited.filter((item) => {
    const n = numeric(item.value);
    if (n === null) return false;
    const key = normalise(item.item);
    if (!key) return true;
    const owners = sourceByItem.filter((row) =>
      row.keys.some((name) => name === key || name.includes(key) || key.includes(name)),
    );
    // 名稱完全找不到，或找得到但那個項目沒有這個數值——兩種都不算核實
    return !owners.some((row) => row.values.has(n));
  });

  // 文中每一個數字都要能對應到 cited_values 或允許清單，否則就是沒被驗證過的數字
  const citedNumbers = new Set(cited.map((item) => numeric(item.value)).filter((n): n is string => n !== null));
  const uncitedNumbers = [
    ...new Set(
      [...allText.matchAll(/(?<![\d.])\d+(?:\.\d+)?(?![\d.])/g)]
        .map((match) => match[0])
        .filter((raw) => {
          const n = numeric(raw);
          return n !== null && !citedNumbers.has(n) && !ALLOWED_NUMBERS.has(n) && !GUIDELINE_NUMBERS.has(n);
        }),
    ),
  ];

  const bannedPhrases = BANNED.filter((rule) => rule.pattern.test(allText)).map((rule) => rule.label);

  const foundAfterAll = (Array.isArray(record.found_after_all) ? record.found_after_all : [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({ item: String(item.item ?? "").trim(), as: String(item.as ?? "").trim() }))
    .filter((item) => item.item);

  return { narrative, shortTerm, midTerm, foundAfterAll, unverifiedValues, uncitedNumbers, bannedPhrases };
}

/**
 * 檢查不通過的說明。三段共用同一份——問題是整份回應的，不是某一段的。
 */
export function narrativeProblems(check: LabNarrativeCheck): string[] {
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
  return problems;
}

/** 病人版渲染。檢查不通過的部分會被標示出來，但文字本身不改寫。 */
export function formatLabNarrative(check: LabNarrativeCheck): string[] {
  const lines = [check.narrative];
  const problems = narrativeProblems(check);
  if (problems.length) {
    lines.push("", `⚠ 這一段未通過自動檢查，不可直接提供給病人：${problems.join("；")}`);
  }
  return lines;
}
