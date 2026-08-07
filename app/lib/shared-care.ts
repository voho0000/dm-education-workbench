/**
 * 跨主題的共同照護內容，以及由指引門檻表產生的追蹤時程。
 *
 * 為什麼需要這一層：原本每個併發症模組都是獨立撰寫、可單獨閱讀的，
 * 所以每一份都自帶「照顧血糖血壓血脂」「戒菸」「定期檢查」「規律用藥」。
 * 六個模組串起來之後，同一份報告裡「足部」出現 18 次、「戒菸」9 次，
 * 病人讀到第三段就會開始跳過。
 *
 * 解法：主題模組只保留該疾病特有的內容，通用內容集中在這裡各講一次；
 * 追蹤時程不再用散文重複，改成由 guideline-rules 產生的單一清單。
 */

import { GUIDELINE_RULES, citationShort, type GuidelineRule } from "./guideline-rules.ts";

export type SharedBlock = {
  id: string;
  title: string;
  /** 何時納入。none 表示固定納入。 */
  appliesWhen: "always" | "foot" | "smoking";
  text: string;
};

export const SHARED_CARE_BLOCKS: SharedBlock[] = [
  {
    id: "SHARED-TARGETS",
    title: "血糖、血壓與血脂",
    appliesWhen: "always",
    text: `這三項會一起影響眼睛、腎臟、神經、心臟與腦部的血管，只顧血糖不夠。每個人的目標會依年齡、共病與用藥調整，依醫療團隊訂的目標控制即可，不必和別人比較數字。`,
  },
  {
    id: "SHARED-FOOT",
    title: "每天花一分鐘照顧雙腳",
    appliesWhen: "foot",
    text: `1. 每天查看腳背、腳底、腳趾縫與腳跟，看不到腳底可用鏡子或請家人協助。留意水泡、破皮、裂傷、紅腫、變色、滲液、異味、厚繭或指甲周圍發炎。
2. 每天以溫水清潔並擦乾，尤其腳趾縫。水溫先用手肘確認，不要用熱水袋、電毯或暖暖包熱敷足部。
3. 不赤腳走路，也不要只穿襪子或薄底拖鞋。穿鞋前先摸鞋內是否有砂石、破損或凸起物。
4. 不要自行剪除厚繭、雞眼，也不要在傷口上使用來路不明的藥膏或偏方。`,
  },
  {
    id: "SHARED-SMOKING",
    title: "關於吸菸",
    appliesWhen: "smoking",
    text: `吸菸會同時傷害眼底、腎臟與全身大小血管，戒菸是對血管保護效益最大的一件事。可請醫療團隊轉介戒菸服務，或撥打戒菸專線。`,
  },
];

export const SHARED_BY_ID = new Map(SHARED_CARE_BLOCKS.map((item) => [item.id, item]));

/** 主題代碼 → 對應的追蹤項目規則 id。缺席代表該主題沒有固定間隔。 */
const TOPIC_INTERVAL_RULES: Record<number, string[]> = {
  1: ["interval-eye", "interval-retina-followup"],
  2: [],
  3: ["interval-kidney", "kidney-intensive-followup"],
  4: ["interval-neuropathy"],
  5: ["interval-lipid"],
  6: ["interval-foot"],
};

/** 第 1 型病人要換用的追蹤規則。左邊是第 2 型的 id，右邊是第 1 型的對應條目。 */
const TYPE1_INTERVAL_SWAP: Record<string, string> = {
  "interval-hba1c": "t1-interval-hba1c",
  "interval-kidney": "t1-interval-kidney",
  "interval-eye": "t1-interval-eye",
  "interval-neuropathy": "t1-interval-neuropathy",
  "interval-lipid": "t1-interval-lipid-adult",
  "kidney-intensive-followup": "t1-kidney-twice-yearly",
};

/**
 * 每份報告都適用的追蹤項目。
 *
 * 眼底與足部對所有糖尿病人適用（表九），不是只有已經有視網膜或周邊血管
 * 問題的人才做——視網膜病變在晚期之前沒有症狀，那正是篩檢存在的理由。
 * 原本只在對應主題命中時才列，等於只提醒已經出事的人去做篩檢。
 *
 * 主題命中時會被更具體的條目取代（眼底追蹤頻率、IWGDF 足檢分級），
 * 去重在下面處理。
 */
const BASE_INTERVAL_RULES = [
  "interval-hba1c",
  "interval-lipid",
  "interval-kidney",
  "interval-eye",
  "interval-foot",
  "interval-oral",
];

/**
 * 依納入的主題產生追蹤時程清單。
 * 取代原本散在十個模組裡的「一般至少每年評估一次」這類重複散文。
 */
export function followUpSchedule(
  topics: number[],
  options: {
    kidneyIntensive?: boolean;
    type1?: boolean;
    ckdMonitoringRuleId?: string | null;
    /** 已知為男性。用來拿掉眼底追蹤裡的懷孕子句。 */
    male?: boolean;
  } = {},
): { rules: GuidelineRule[]; text: string } {
  const wanted = new Set<string>(BASE_INTERVAL_RULES);
  for (const topic of topics) {
    for (const id of TOPIC_INTERVAL_RULES[topic] ?? []) wanted.add(id);
  }

  // 加密追蹤只有在實際數值達到門檻時才列出，否則會對沒有異常的病人虛報。
  if (!options.kidneyIntensive) wanted.delete("kidney-intensive-followup");
  // 一般腎臟間隔與加密追蹤同時出現會互相矛盾（每年 vs 每半年），保留較嚴的那一條。
  if (wanted.has("kidney-intensive-followup")) wanted.delete("interval-kidney");

  /*
   * 有實際 eGFR 落在表二的分段時，用分段的頻率取代上面兩條。
   *
   * 分段講的是同一件事但更具體：eGFR 45–60 每 6 個月、30–44 每 3 個月。
   * 原本對這兩位病人講的是同一句「每 3–6 個月」，而指引對他們的建議差
   * 三倍頻率。三條並列會出現三個不同的數字，病人不知道該聽哪一個。
   *
   * UACR 超標但 eGFR 正常的人不會有分段規則，加密追蹤照樣留著。
   */
  if (options.ckdMonitoringRuleId) {
    wanted.delete("interval-kidney");
    wanted.delete("kidney-intensive-followup");
    wanted.add(options.ckdMonitoringRuleId);
  }
  // 眼底追蹤頻率是眼底檢查的細化，兩條並列會重複。
  if (wanted.has("interval-retina-followup")) wanted.delete("interval-eye");

  /*
   * 第 1 型的追蹤間隔與起始時機都不一樣：糖化血色素看的是「一年幾次」而不是
   * 「每幾個月」，腎臟、眼底、神經則是發病滿幾年才開始。這裡整批換成第 1 型的
   * 條目——不換的話它們會因為 typeGate 被濾掉而整段消失。
   *
   * 換表必須在上面幾條去重之後做：去重比對的是第 2 型的 id，先換就對不上，
   * 眼底會同時出現「初次檢查時機」與「後續追蹤頻率」兩條。
   */
  /*
   * 足部檢查頻率依 IWGDF 分級（第十五章 2024 更新）。R4 神經病變對應
   * 保護感覺喪失、R6 周邊血管疾病對應周邊動脈疾病，兩者兼具升到第 2 類。
   * 這是推估——真正的分級要靠單股纖維壓覺與足部檢查——所以理由裡寫明。
   */
  const neuropathy = topics.includes(4);
  const pad = topics.includes(6);
  if (neuropathy || pad) {
    wanted.delete("interval-foot");
    /*
     * 也拿掉每年一次的神經病變評估：它問的是同一件事（足部感覺），
     * 但頻率較寬。兩條並列會變成「每年做一次足部感覺檢查」跟
     * 「每 6 到 12 個月檢查一次腳」同時出現，病人不知道該聽哪一個。
     * 這與上面腎臟的處理一致——保留較嚴的那一條。
     */
    wanted.delete("interval-neuropathy");
    wanted.add(neuropathy && pad ? "foot-exam-iwgdf-2" : "foot-exam-iwgdf-1");
  }

  if (options.type1) {
    for (const [t2, t1] of Object.entries(TYPE1_INTERVAL_SWAP)) {
      if (wanted.delete(t2)) wanted.add(t1);
    }
  }

  // 依 SUBJECT 的宣告順序輸出，不用規則表的陣列順序——第 1 型的條目寫在表尾，
  // 照陣列順序會讓「口腔」排在「血糖控制指標」前面。
  const order = Object.keys(SUBJECT);
  const rules = GUIDELINE_RULES.filter((rule) => wanted.has(rule.id) && rule.patientFacing).sort(
    (a, b) => order.indexOf(a.id) - order.indexOf(b.id),
  );
  if (!rules.length) return { rules: [], text: "" };

  /*
   * 男性病人不需要看到懷孕子句。
   *
   * 這條與上面那些「拿掉不適用的條目」是同一件事，只是粒度到子句。獨立審查
   * 抓到懷孕衛教被寫給男性病人——內容沒錯，是放錯人，而讀報告的人分不出
   * 「這句不適用我」和「這份報告不夠準」。
   *
   * 只動病人版的呈現，不動 GUIDELINE_RULES 本身：規則表是指引原文的引用，
   * 內容庫要照原樣攤給人看。這裡改的是這一位病人看到的那一行。
   */
  const rendered =
    options.male
      ? rules.map((rule) => {
          const text = rule.patientStatement ?? rule.statement;
          if (!PREGNANCY_CLAUSE.test(text)) return rule;
          return { ...rule, patientStatement: text.replace(PREGNANCY_CLAUSE, "") };
        })
      : rules;

  return { rules, text: buildText(rendered) };
}

/** 鍵的順序就是報告裡的列出順序。同一個主題的兩型條目相鄰擺，換表不會改變位置。 */
const SUBJECT: Record<string, string> = {
  "interval-hba1c": "血糖控制指標",
  "t1-interval-hba1c": "血糖控制指標",
  "interval-lipid": "血脂",
  "t1-interval-lipid-adult": "血脂",
  "interval-kidney": "腎功能與尿液檢查",
  "t1-interval-kidney": "腎功能與尿液檢查",
  "kidney-intensive-followup": "腎功能與尿液檢查（您的檢查結果顯示需要加強追蹤）",
  "ckd-egfr-45-60": "腎功能（依您的 eGFR 分段）",
  "ckd-egfr-30-44": "腎功能（依您的 eGFR 分段）",
  "t1-kidney-twice-yearly": "腎功能與尿液檢查（您的檢查結果顯示需要加強追蹤）",
  "interval-eye": "眼底",
  "t1-interval-eye": "眼底",
  "interval-retina-followup": "眼底檢查",
  "interval-neuropathy": "神經與足部感覺",
  "t1-interval-neuropathy": "神經與足部感覺",
  "interval-foot": "足部循環",
  "foot-exam-iwgdf-1": "足部檢查（您的資料顯示有神經病變或周邊血管問題）",
  "foot-exam-iwgdf-2": "足部檢查（您的資料同時顯示神經病變與周邊血管問題）",
  "interval-oral": "口腔",
};

/** 病人版：白話說法，不夾帶檢查技術名稱。 */
/** 眼底追蹤間隔裡的懷孕子句。前面的分號一起帶走，免得留下空句。 */
const PREGNANCY_CLAUSE = /；懷孕時需更頻繁追蹤/;

function buildText(rules: GuidelineRule[]): string {
  if (!rules.length) return "";
  const lines = rules.map(
    (rule, index) => `${index + 1}. ${SUBJECT[rule.id] ?? ""}：${rule.patientStatement ?? rule.statement}`,
  );
  return `${lines.join("\n")}

實際的檢查時間由醫療團隊依您的狀況安排，上面是一般的參考間隔。`;
}

/**
 * 醫師版的主詞。多數 statement 本身就帶主詞（「血脂建議每年檢查一次」），
 * 只有少數沒有（腎臟加強追蹤是「至少每半年監測追蹤一次」，看不出在講什麼）。
 * 只在 statement 沒提到主詞時才補，否則會變成重述。
 */
const CLINICIAN_SUBJECT: Record<string, string> = {
  "kidney-intensive-followup": "腎功能與尿液白蛋白",
};

/**
 * 醫師版：用原本的事實陳述（含檢查技術名稱），並逐條附出處。
 * 這是要開單的依據，不能只給病人版的白話說法。
 */
export function followUpForClinician(rules: GuidelineRule[]): string[] {
  return rules.map((rule) => {
    const subject = CLINICIAN_SUBJECT[rule.id];
    const prefix = subject ? `${subject}：` : "";
    return `  ${prefix}${rule.statement}　〔${citationShort(rule)}〕`;
  });
}


