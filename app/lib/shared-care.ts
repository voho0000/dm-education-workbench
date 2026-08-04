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
    text: `這三項會一起影響眼睛、腎臟、神經、心臟與腦部的血管，所以不是只顧血糖就夠。

1. 依醫療團隊共同訂定的目標控制，不必和別人比較數字。每個人的目標會依年齡、共病與用藥調整。
2. 這三項要一起看，只顧其中一項效果有限。`,
  },
  {
    id: "SHARED-FOOT",
    title: "每天花一分鐘照顧雙腳",
    appliesWhen: "foot",
    text: `1. 每天查看腳背、腳底、腳趾縫與腳跟。看不到腳底時，可使用鏡子或請家人協助。
2. 留意水泡、破皮、裂傷、紅腫、變色、滲液、異味、厚繭或指甲周圍發炎。
3. 每天以溫水清潔並擦乾，尤其要擦乾腳趾縫。水溫先用手肘確認，不要用熱水袋、電毯或暖暖包直接熱敷足部。
4. 不赤腳走路，也不要只穿襪子或薄底拖鞋行走。穿鞋前先摸摸鞋內是否有砂石、破損或凸起物。
5. 不要自行剪除厚繭、雞眼，也不要在傷口上使用來路不明的藥膏或偏方。`,
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

/** 每份報告都適用的追蹤項目。 */
const BASE_INTERVAL_RULES = ["interval-hba1c", "interval-lipid", "interval-kidney", "interval-oral"];

/**
 * 依納入的主題產生追蹤時程清單。
 * 取代原本散在十個模組裡的「一般至少每年評估一次」這類重複散文。
 */
export function followUpSchedule(
  topics: number[],
  options: { kidneyIntensive?: boolean } = {},
): { rules: GuidelineRule[]; text: string } {
  const wanted = new Set<string>(BASE_INTERVAL_RULES);
  for (const topic of topics) {
    for (const id of TOPIC_INTERVAL_RULES[topic] ?? []) wanted.add(id);
  }

  // 加密追蹤只有在實際數值達到門檻時才列出，否則會對沒有異常的病人虛報。
  if (!options.kidneyIntensive) wanted.delete("kidney-intensive-followup");
  // 一般腎臟間隔與加密追蹤同時出現會互相矛盾（每年 vs 每半年），保留較嚴的那一條。
  if (wanted.has("kidney-intensive-followup")) wanted.delete("interval-kidney");
  // 眼底追蹤頻率是眼底檢查的細化，兩條並列會重複。
  if (wanted.has("interval-retina-followup")) wanted.delete("interval-eye");

  const rules = GUIDELINE_RULES.filter((rule) => wanted.has(rule.id) && rule.patientFacing);
  if (!rules.length) return { rules: [], text: "" };

  return { rules, text: buildText(rules) };
}

const SUBJECT: Record<string, string> = {
    "interval-hba1c": "血糖控制指標",
    "interval-lipid": "血脂",
    "interval-kidney": "腎功能與尿液檢查",
    "interval-oral": "口腔",
    "interval-eye": "眼底",
    "interval-retina-followup": "眼底檢查",
    "interval-neuropathy": "神經與足部感覺",
    "interval-foot": "足部循環",
  "kidney-intensive-followup": "腎功能與尿液檢查（您的檢查結果顯示需要加強追蹤）",
};

/** 病人版：白話說法，不夾帶檢查技術名稱。 */
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


