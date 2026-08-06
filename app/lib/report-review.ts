/**
 * ④ 報告審查：讓另一次 LLM 呼叫讀病人版模型撰寫的三段，逐句挑毛病。
 *
 * 為什麼需要它：病人版的後三段逐字來自固定模組，可以送審一次、簽核一次；
 * 前三段（觀察摘要、短期建議、中期目標）每次生成都不一樣，「已核准」對它們
 * 永遠不成立。程式能做的只有數值逐項比對與禁語掃描，兩者都是舉例式的——
 * 擋得掉已知的錯誤寫法，擋不掉沒見過的。
 *
 * 三個刻意的設計：
 *
 * 1. **不輸出通過／不通過，只輸出逐句標記。** 一句話的引用，人五秒能判斷對錯；
 *    一個 pass/fail，人得整份重讀。這讓人工抽查從「讀三千份」變成「看幾百句」。
 *
 * 2. **引用的句子必須真的在報告裡。** 與 ② ③ 的數值核對同一個原則——審查器
 *    也會編。編出來的句子代表它在對不存在的東西發表意見，整份標記都不可信。
 *
 * 3. **保留一段開放式提問。** 固定 rubric 只會找 rubric 裡有的東西。今天抓到
 *    「波動／穩定」與「自訂血糖監測頻率」的不是程式，是人讀了覺得不對——
 *    開放式那一段噪音比較大，但它是唯一會冒出**新類型**的來源。
 *
 * 它不取代確定性檢查。數值配對、禁語掃描、必要段落那些答案唯一、不會漂移，
 * 是地板；這一層是加上去的。
 */

import type { PatientFacts } from "./patient-facts.ts";

/** 審查器可以指派的類別。開放式發現歸到 other。 */
export type ReviewCategory =
  | "diagnosis-inference"
  | "risk-as-certainty"
  | "temporal-claim"
  | "treatment-advice"
  | "value-mismatch"
  | "not-applicable"
  | "vague"
  | "other";

export const REVIEW_CATEGORY_LABEL: Record<ReviewCategory, string> = {
  "diagnosis-inference": "推測診斷",
  "risk-as-certainty": "把風險講成確定",
  "temporal-claim": "暗示時序或變化",
  "treatment-advice": "處置或劑量建議",
  "value-mismatch": "數值與來源不符",
  "not-applicable": "對這位病人不適用",
  vague: "空泛、沒有可執行的動作",
  other: "其他（開放式發現）",
};

export type ReviewFinding = {
  /** 報告中的原句，必須逐字出現 */
  quote: string;
  category: ReviewCategory;
  /** 為什麼有問題，寫給看報告的人 */
  reason: string;
  severity: "blocking" | "attention";
};

export type ReportReviewCheck = {
  findings: ReviewFinding[];
  /**
   * 引用了報告中找不到的句子。
   *
   * 不是「審查器抓到的問題」，是「審查器本身不可信」的訊號——它在對不存在的
   * 內容發表意見。出現任何一則，整份標記都要人重看。
   */
  hallucinatedQuotes: string[];
  /** 開放式那一段有沒有回東西。空的通常代表它只照 rubric 掃了一遍。 */
  openEndedUsed: boolean;
};

export const REPORT_REVIEW_PROMPT = `你是糖尿病專科醫師，正在審查一份要交給病人的衛教報告中，由語言模型撰寫的三個段落。

輸入包含三部分：
1. 這位病人的檢驗數值與程式判定出來的事實（可信，這是基準）
2. 待審查的三段文字（觀察摘要、短期建議、中期目標）
3. 這批資料的已知限制

**你的工作不是給通過或不通過。**請逐句指出有問題的地方，每一則都要引用報告中的原句。

## 必須檢查的類別

**推測診斷（diagnosis-inference）**：把檢驗數值講成疾病。「您的腎功能數值顯示腎臟病變」——數值異常不等於診斷，診斷要由醫師下。

**把風險講成確定（risk-as-certainty）**：來源的 PR 欄位是風險預測不是診斷。「您已經有心血管疾病」而事實只說風險偏高，就是這一類。

**暗示時序或變化（temporal-claim）**：這批檢驗紀錄**只有費用年月、沒有採檢日期**。所以任何講「最近」「上次」「已改善」「持續惡化」的說法都沒有根據。也包括用變化描述數值：「血糖波動大」「控制相對穩定」——同一組數值可能是同一天測三次，也可能橫跨兩年。

**但下列寫法是這個系統規定要用的，不是違規，不要標記：**
- 「紀錄中曾出現 X」「曾出現偏高的結果」——「曾出現」講的是存在，不是時間順序，它正是為了避開時序才這樣寫的
- 「介於 65 至 514 mg/dL 之間」——陳述範圍
- 「多次高於目標」——講次數，不是講先後

要標記的是**排序、變化、遠近**：哪一筆比較新、有沒有變好變壞、是不是「目前」的狀態。

**處置或劑量建議（treatment-advice）**：不得叫病人開始、停止、調整任何藥物；不得自訂攝取量、運動處方或血糖監測頻率（每天量幾次是臨床決定）。「請與醫療團隊確認監測頻率」是可以的。

**但基準資料裡「程式依指引算出的目標與追蹤間隔」那一段的數字是授權的**——那是從指引表格算出來、餵給模型照抄的材料。報告寫「每 3 個月檢查一次腎功能」如果對得上那一段，就不是自訂處方，不要標記。只有**沒出現在那一段**的數字才算模型自己編的。

**數值與來源不符（value-mismatch）**：報告中的數字與上面的事實對不起來，或掛在錯的項目上。

**對這位病人不適用（not-applicable）**：建議本身沒錯，但與這位病人的狀況衝突。例如對腎功能不全的人建議增加蛋白質或水分攝取。這一類最重要，因為它讀起來完全正常。

**特別注意「宣稱達標」**：如果基準資料寫著某個目標「需醫療團隊定案」或「無法判定」（例如高齡者的糖化血色素目標要依健康狀態分級，而申報資料判定不了），報告就**不能說這位病人「符合控制目標」「已達標」「落在良好範圍」**。目標值本身還沒定，就沒有達不達標可言。這一類要標 blocking。

**空泛（vague）**：完全沒有具體動作的句子，例如「請注意飲食」「請多運動」「保持健康生活」。

**但把份量、處方、監測頻率交回醫療團隊，是這個系統刻意要求的安全行為，不是空泛，不要標記。**「請由營養師為您訂出適合的蛋白質與水分份量」「請與醫療團隊確認適合您的血糖監測頻率」都是正確寫法——自訂公克數或每天量幾次會對腎功能不全的人造成傷害，所以規則明文禁止模型自己給數字。

只有當**整段三、四點全是這種轉介句、沒有任何病人自己能做的事**時，才標記整段（引用其中一句即可），理由寫「整段沒有病人可自行執行的動作」。

## 開放式檢查

除了上面的類別，請再問自己一次：**以糖尿病專科醫師的角度，這三段還有沒有任何你會反對、或會讓你不放心交給病人的地方？**有的話用 other 類別列出來，說明理由。

這一段很重要。上面的類別是從過去發現的錯誤整理出來的，涵蓋不了還沒見過的問題。

## 輸出格式

只輸出 JSON，不要加說明文字：

{
  "findings": [
    {
      "quote": "報告中的原句，逐字複製，不要改寫或截斷成不完整的句子",
      "category": "上面八個類別之一的英文代碼",
      "reason": "為什麼有問題，一到兩句",
      "severity": "blocking 或 attention"
    }
  ],
  "open_ended": "開放式檢查的結果。沒有發現就寫「無」，有的話也要同時列進 findings。"
}

severity 的判準是**這份報告能不能直接交給病人**：
- blocking：會讓病人做出錯誤決定，或陳述了不成立的事實
- attention：讀起來不理想或有疑慮，但不會造成錯誤決定

沒有發現問題就回傳空的 findings 陣列。**不要為了交差而湊數**——誤報會讓這份標記失去意義，而它的用途是告訴人「這幾句要看」。

引用必須是報告中真的出現的字。找不到對應原句就不要列那一則。`;

/** 組出審查器的輸入：基準事實 + 待審的三段 + 資料限制。 */
export function buildReviewInput(
  sections: { narrative: string; shortTerm: string; midTerm: string },
  factsText: string,
  facts: PatientFacts,
  /**
   * 程式依指引推出的目標與追蹤間隔。
   *
   * 沒有這一段，審查器分不出「模型自己編的頻率」與「程式從指引表二算出來、
   * 餵給模型照抄的頻率」——實測就把「每 3 個月檢查一次腎功能」判成自訂處方，
   * 而那個數字正是我們給它的。
   */
  authorised?: { targets: Array<{ metric: string; value: string }>; followUp: string },
): string {
  const limits = [
    facts.labHasDrawDates
      ? "檢驗紀錄有採檢日期。"
      : "檢驗紀錄只有費用年月、沒有採檢日期，因此無法判定任何一筆是不是最近一次，也建立不了趨勢。",
    "用藥是歷史申報紀錄，不是目前正在服用的藥。",
    facts.diabetesType.verdict === "type1-confirmed" || facts.diabetesType.verdict === "type2-confirmed"
      ? `糖尿病型別：${facts.diabetesType.verdict === "type1-confirmed" ? "第 1 型" : "第 2 型"}。`
      : "糖尿病型別無法從申報資料判定，目標值一律套第 2 型。",
  ];

  const authorisedBlock = authorised
    ? [
        "",
        "【程式依指引算出的目標與追蹤間隔——這些數字是餵給模型的材料，照抄不算自訂處方】",
        ...authorised.targets.map((item) => `- ${item.metric}：${item.value}`),
        ...(authorised.followUp ? [authorised.followUp] : []),
      ]
    : [];

  return [
    "【基準：程式判定出來的事實與檢驗數值】",
    factsText,
    ...authorisedBlock,
    "",
    "【資料的已知限制】",
    ...limits.map((line) => `- ${line}`),
    "",
    "【待審查：模型撰寫的三段】",
    "",
    "◆ 觀察摘要",
    sections.narrative || "（這一段沒有產出）",
    "",
    "◆ 短期建議",
    sections.shortTerm || "（這一段沒有產出）",
    "",
    "◆ 中期目標",
    sections.midTerm || "（這一段沒有產出）",
  ].join("\n");
}

/** 比對引用時忽略的字元。審查器常會把全形標點抄成半形，或吃掉空白。 */
const normalise = (text: string) =>
  text.replace(/[\s　]/g, "").replace(/[（(]/g, "(").replace(/[）)]/g, ")").replace(/[，,]/g, ",");

const CATEGORIES = new Set<string>(Object.keys(REVIEW_CATEGORY_LABEL));

export function parseReportReview(
  raw: string,
  sections: { narrative: string; shortTerm: string; midTerm: string },
): ReportReviewCheck {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first === -1 || last <= first) throw new Error("報告審查器沒有回傳可解析的 JSON。");
    parsed = JSON.parse(candidate.slice(first, last + 1));
  }
  if (!parsed || typeof parsed !== "object") throw new Error("報告審查器回傳的不是 JSON 物件。");
  const record = parsed as Record<string, unknown>;

  const reviewed = normalise([sections.narrative, sections.shortTerm, sections.midTerm].join("\n"));

  const findings: ReviewFinding[] = [];
  const hallucinatedQuotes: string[] = [];

  for (const item of Array.isArray(record.findings) ? record.findings : []) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const quote = String(row.quote ?? "").trim();
    if (!quote) continue;

    /*
     * 引用必須逐字出現在被審的三段裡。審查器也會編——編出來的句子代表它在對
     * 不存在的內容發表意見，那一則不能採信，而且整份標記都要人重看。
     */
    if (!reviewed.includes(normalise(quote))) {
      hallucinatedQuotes.push(quote);
      continue;
    }

    const rawCategory = String(row.category ?? "").trim();
    findings.push({
      quote,
      category: (CATEGORIES.has(rawCategory) ? rawCategory : "other") as ReviewCategory,
      reason: String(row.reason ?? "").trim(),
      severity: String(row.severity ?? "").trim() === "blocking" ? "blocking" : "attention",
    });
  }

  const openEnded = String(record.open_ended ?? "").trim();

  return {
    findings,
    hallucinatedQuotes,
    // 只回「無」也算用過——代表它至少看了那一題。整個欄位缺席才是沒做。
    openEndedUsed: openEnded.length > 0,
  };
}

/** 醫師版與人工檢查清單共用的呈現方式。 */
export function formatReportReview(check: ReportReviewCheck): string[] {
  if (!check.findings.length && !check.hallucinatedQuotes.length) {
    return ["報告審查：模型撰寫的三段沒有標記出問題。（這不等於已核准，只代表審查器沒有發現。）"];
  }

  const lines: string[] = ["報告審查（模型撰寫的三段）"];
  for (const item of check.findings) {
    lines.push(`  [${item.severity === "blocking" ? "不可直接使用" : "需看過"}｜${REVIEW_CATEGORY_LABEL[item.category]}]`);
    lines.push(`    「${item.quote}」`);
    lines.push(`    ${item.reason}`);
  }
  if (check.hallucinatedQuotes.length) {
    lines.push(
      `  [審查器不可信] 引用了報告中找不到的 ${check.hallucinatedQuotes.length} 句話，這份標記需要人重看。`,
    );
  }
  return lines;
}
