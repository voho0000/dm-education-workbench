/**
 * 超出資料能支持範圍的說法。病人版與醫師版共用同一套樣式。
 *
 * 為什麼共用：這些樣式原本只寫在病人版的解析器裡，醫師版只查了「引用的數字
 * 存不存在」。外部稽核指出五份醫師版全都出現資料支持不了的診斷、趨勢與處置
 * ——「符合糖尿病腎病變」「腎功能顯著惡化」「僅由尿酮 1+ 推到酮酸中毒風險」
 * ——而那些一個都沒被擋。分開維護的結果就是這樣：一邊補了另一邊沒補。
 *
 * **醫師版不因為讀者是專業人員就放寬。** 讀者專業與否，改變的是「要不要
 * 解釋」，不是「這句話成不成立」。申報資料沒有採檢日期，就是推不出時序；
 * 一次尿酮 1+ 就是推不出酮酸中毒。把未成立的推論寫成結論，對醫師的成本是
 * 他得回頭查病歷才能推翻它——那正是這份報告想省下來的時間。
 *
 * 樣式一律要求**指向數據或病名**才算。「吃得穩定」講的是行為，擋下來只會
 * 讓標記變成雜訊，而這個標記的用途是告訴人「這幾句不可信」。
 */

export type UnsupportedClaim = {
  label: string;
  /** 命中的原句，讓人五秒判斷對錯而不必整份重讀 */
  sentence: string;
};

type Pattern = { label: string; pattern: RegExp };

const PATTERNS: ReadonlyArray<Pattern> = [
  {
    /*
     * 明說時間點。「曾出現」不在裡面——那是這個系統規定要用的寫法，
     * 講的是存在而不是先後。
     */
    label: "聲稱時序",
    pattern: /最近一次|最新一筆|目前的?數值為|已(改善|惡化)|持續(上升|下降|惡化)|趨勢(顯示|為|是|向)|(呈|有|出現).{0,4}趨勢/,
  },
  {
    /*
     * 用變化描述數值。同一組數值可能是同一天測三次，也可能橫跨兩年。
     * 可以說範圍（「介於 65 至 500」），不能說波動。
     */
    label: "以變化或穩定度描述數值",
    pattern:
      /(血糖|血壓|數值|指標|指數|檢驗|結果|控制|腎功能|肝功能|電解質|糖化血色素|醣化血紅素|HbA1c)[^。\n]{0,12}(波動|起伏|忽高忽低|時高時低|不穩|變異較?大|(急速|快速|明顯|顯著)(變化|上升|下降|惡化|衰退)|(相對|尚算|大致|整體)?(平)?穩定)|(波動|起伏)[^。\n]{0,8}(較大|很大|明顯|劇烈)/,
  },
  {
    /*
     * 把檢驗結果講成疾病。數值異常不等於診斷——診斷要由醫師下，而且多數
     * 需要時序或鑑別診斷，這批資料兩者都給不出來。
     */
    label: "推測診斷",
    pattern:
      /(符合|提示|顯示|指向|考慮)[^。\n]{0,10}(病變|腎病|貧血|症候群|中毒|衰竭|硬化)|(診斷為|確診為|罹患了)|(腎臟病|腎病|病變|CKD|糖尿病|視網膜|神經)[^。\n]{0,4}(進展|惡化)/,
  },
  {
    /*
     * 從單一異常推到急症風險。實測出現「尿酮 1+」推到「酮酸中毒風險」——
     * 酮酸中毒要看血酮、血糖、酸鹼與臨床狀況，尿酮一項推不出來，而這批
     * 資料連採檢日期都沒有。
     */
    label: "推論急症風險",
    pattern: /(酮酸中毒|高血糖高滲透壓|乳酸中毒|低血糖昏迷)[^。\n]{0,6}(風險|之虞|可能|傾向)/,
  },
  {
    label: "處置或劑量建議",
    pattern:
      /建議(您)?(開始|停用|停止|加|減|換|調整).{0,6}(藥|劑量|治療)|應(停用|加藥|減量)|[^。\n]{0,8}(藥物|用藥)調整/,
  },
];

/**
 * 自訂血糖監測頻率。只對病人版適用——每天量幾次是臨床決定，寫給病人就是
 * 越線；寫給醫師則是建議事項，由他自己判斷。
 */
const PATIENT_ONLY: ReadonlyArray<Pattern> = [
  {
    label: "自訂血糖監測頻率",
    pattern:
      /(每日|每天|一天|每週)[^。\n]{0,12}(量測|測量|監測|記錄|驗)[^。\n]{0,10}血糖|血糖[^。\n]{0,8}(每日|每天|一天)[^。\n]{0,6}(\d|[一二三四五六七八九])\s*(次|回)/,
  },
];

/**
 * 掃出所有超出資料支持範圍的說法。
 *
 * @param audience 病人版多一條「自訂血糖監測頻率」。其餘完全相同——
 *                 讀者專業與否不改變一句話成不成立。
 */
export function findUnsupportedClaims(text: string, audience: "patient" | "clinician"): UnsupportedClaim[] {
  const patterns = audience === "patient" ? [...PATTERNS, ...PATIENT_ONLY] : PATTERNS;
  const claims: UnsupportedClaim[] = [];
  const seen = new Set<string>();

  for (const sentence of text.split(/[。\n]/)) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    for (const { label, pattern } of patterns) {
      if (!pattern.test(trimmed)) continue;
      const key = `${label}｜${trimmed}`;
      if (seen.has(key)) continue;
      seen.add(key);
      claims.push({ label, sentence: `${trimmed}。` });
    }
  }
  return claims;
}

/** 只要標籤，用在需要簡短摘要的地方（例如批次清單的統計）。 */
export function claimLabels(claims: UnsupportedClaim[]): string[] {
  return [...new Set(claims.map((item) => item.label))];
}
