/**
 * 指引門檻值規則表（取代把指引全文塞進 context）。
 *
 * 來源有兩份，各自標記在 citation.source：
 *   t2-2022　中華民國糖尿病學會《2022第2型糖尿病臨床照護指引》（全文 418 頁）
 *   t1-2022　中華民國糖尿病學會《2022第1型糖尿病臨床照護指引》（全文 363 頁）
 *
 * 這裡記錄的是**事實**（門檻數值、追蹤間隔、轉診急迫度），以自己的文字陳述，
 * 並附上可回查的出處；不重製指引原文。原文標示未授權不得轉載與散布，
 * 因此指引全文只由使用者在本頁臨時載入，不進入本檔、不進入版本控制。
 *
 * 維護方式：這張表要由醫療團隊逐條審閱與簽署，而不是散在 prompt 裡的散文。
 * 每次改動請更新 RULES_VERSION 並重新送審。
 *
 * citation.pdfPage 指 PDF 實體頁次，與書上印刷頁碼不同，但可直接跳頁核對。
 *
 * 頁次是對著學會網站上這兩個檔案逐頁核過的（2026-08-06）：
 *   t2-2022　/DB/book/88/11103指引_v6-2_all(內文).pdf　418 頁
 *   t1-2022　/DB/book/89/20220923-final-保全.pdf　　　　362 頁
 * 換成同一本指引的別版 PDF，頁次會整批對不上——0.4 版以前的頁次多數就差 1 頁，
 * 醫師照著跳過去會落在隔壁章。改頁次前請先確認手上的檔案是不是這兩份。
 */

export const RULES_VERSION = "2022-guideline-extract-0.5";
export const RULES_APPROVED = false;

export type GuidelineSourceId = "t2-2022" | "t1-2022";

export const GUIDELINE_SOURCES: Record<GuidelineSourceId, string> = {
  "t2-2022": "中華民國糖尿病學會《2022第2型糖尿病臨床照護指引》",
  "t1-2022": "中華民國糖尿病學會《2022第1型糖尿病臨床照護指引》",
};

/** 舊名保留給只需要「主要來源」的地方（例如內容庫的說明文字）。 */
export const RULES_SOURCE = GUIDELINE_SOURCES["t2-2022"];

export type DiabetesTypeGate = "any" | "type1-confirmed" | "type2-confirmed";

export type RuleCategory =
  | "glycemic-target"
  | "bp-target"
  | "lipid-target"
  | "kidney"
  | "medication-safety"
  | "screening-interval"
  | "referral-urgency"
  | "measurement-caveat";

export type GuidelineRule = {
  id: string;
  category: RuleCategory;
  /** 適用對象。程式依 PatientFacts 判定是否套用。 */
  appliesTo: string;
  /** 以自己的文字陳述的門檻或間隔。 */
  statement: string;
  /** 未標 source 時視為 t2-2022——這張表最早整份出自第 2 型指引。 */
  citation: { source?: GuidelineSourceId; table?: string; section?: string; pdfPage: number };
  /**
   * 這條規則適用的糖尿病型別。
   *
   * 未標時視為 any（兩型皆適用的事實，例如低血糖分級）。標成 type2-confirmed 的
   * 規則有第 1 型的對應版本，兩者數字未必相同——餐後血糖第 2 型是 80–160 mg/dL、
   * 第 1 型成人是低於 180 mg/dL。沒有這個欄位的話，一位第 1 型病人會拿到第 2 型
   * 的數字，還附上寫著「第2型糖尿病臨床照護指引」的出處。
   */
  typeGate?: DiabetesTypeGate;
  /**
   * 這條規則是否可以直接寫進病人可見內容。
   * false 代表它只用於醫師版或程式判定（例如藥物禁忌）。
   */
  patientFacing: boolean;
  /**
   * 目標值本身，不重述指標名稱。
   *
   * 醫師版的目標清單已經把指標名稱放在冒號前面（LDL-C：、TG（三酸甘油酯）：），
   * 若直接用 statement 就會變成「TG（三酸甘油酯）：三酸甘油酯目標為低於 150」，
   * 同一個名字出現三次。statement 本身維持原文不改寫，這裡只是另一種呈現。
   */
  targetValue?: string;
  /**
   * 給病人看的說法。statement 是要給醫師核對的事實陳述，
   * 有些會夾帶檢查技術名稱（單股纖維壓覺、128 Hz 音叉震動感），
   * 病人不需要知道也記不住。有這個欄位時病人版改用它。
   */
  patientStatement?: string;
};

export const GUIDELINE_RULES: GuidelineRule[] = [
  // ── 血糖目標 ──────────────────────────────────────────────
  {
    id: "hba1c-general",
    typeGate: "type2-confirmed",
    targetValue: "低於 7.0%，並需個別化考量。",
    category: "glycemic-target",
    appliesTo: "一般成人",
    statement: "糖化血色素控制目標為低於 7.0%，並需個別化考量。",
    patientStatement: "糖化血色素建議控制在 7.0% 以下。實際目標會依您的年齡、病程與其他疾病調整，請以醫療團隊為您訂的數字為準。",
    citation: { table: "表六 非懷孕成年人糖尿病的治療目標", pdfPage: 12 },
    patientFacing: true,
  },
  {
    id: "fpg-general",
    typeGate: "type2-confirmed",
    targetValue: "80–130 mg/dL。",
    category: "glycemic-target",
    appliesTo: "一般成人",
    statement: "空腹血糖控制目標為 80–130 mg/dL。",
    citation: { section: "第九章 第 2 型糖尿病的血糖治療目標", pdfPage: 71 },
    patientFacing: true,
  },
  {
    id: "ppg-general",
    typeGate: "type2-confirmed",
    targetValue: "80–160 mg/dL。",
    category: "glycemic-target",
    appliesTo: "一般成人",
    statement: "餐後血糖控制目標為 80–160 mg/dL。",
    citation: { section: "第九章 第 2 型糖尿病的血糖治療目標", pdfPage: 71 },
    patientFacing: true,
  },
  {
    id: "hba1c-elderly-healthy",
    targetValue: "放寬為低於 7–7.5%。",
    category: "glycemic-target",
    appliesTo: "65 歲以上、共病少且認知與身體機能正常",
    statement: "糖化血色素目標放寬為低於 7–7.5%。",
    citation: { table: "表七 老年糖尿病人（≥65 歲）的治療目標", pdfPage: 13 },
    patientFacing: true,
  },
  {
    id: "hba1c-elderly-intermediate",
    targetValue: "放寬為低於 8.0%。",
    category: "glycemic-target",
    appliesTo: "65 歲以上、多種共病或認知與身體機能輕至中度異常",
    statement: "糖化血色素目標放寬為低於 8.0%。",
    citation: { table: "表七 老年糖尿病人（≥65 歲）的治療目標", pdfPage: 13 },
    patientFacing: true,
  },
  {
    id: "hba1c-elderly-poor",
    targetValue: "不以糖化血色素作為唯一控制目標，重點在避免低血糖與有症狀的高血糖。",
    category: "glycemic-target",
    appliesTo: "65 歲以上、末期慢性病或認知與身體機能中至重度異常",
    statement:
      "不以糖化血色素作為唯一控制目標，重點在避免低血糖與有症狀的高血糖。",
    citation: { table: "表七 老年糖尿病人（≥65 歲）的治療目標", pdfPage: 13 },
    patientFacing: true,
  },
  {
    // 指引表一把低血糖分成三級，第一級 <70 mg/dL、第二級 <54 mg/dL。
    // 程式的門檻直接取自這裡，不是自訂的。
    id: "hypoglycemia-levels",
    category: "glycemic-target",
    appliesTo: "所有糖尿病人",
    statement: "血糖低於 70 mg/dL 為第一級低血糖，低於 54 mg/dL 為第二級低血糖。",
    citation: { table: "表一 低血糖分級", pdfPage: 141 },
    patientFacing: true,
  },
  {
    id: "hba1c-unreliable",
    category: "measurement-caveat",
    appliesTo: "貧血、變異血色素、慢性腎病變或懷孕",
    statement:
      "糖化血色素可能無法代表平均血糖，可加測糖化白蛋白與自我血糖監測輔助判讀。",
    citation: { table: "表九 註 1", pdfPage: 18 },
    patientFacing: true,
  },

  // ── 血壓目標 ──────────────────────────────────────────────
  {
    id: "bp-treatment-threshold",
    category: "bp-target",
    appliesTo: "糖尿病人",
    statement: "血壓達到或超過 140/90 mmHg 通常即開始高血壓治療。",
    citation: { section: "第十四章 心血管併發症與其危險因子的處理", pdfPage: 146 },
    patientFacing: true,
  },
  {
    id: "bp-target-general",
    typeGate: "type2-confirmed",
    targetValue: "140/90 mmHg 以下。",
    category: "bp-target",
    appliesTo: "一般糖尿病人",
    statement: "血壓控制在 140/90 mmHg 以下。",
    patientStatement: "血壓建議控制在 140/90 mmHg 以下。",
    citation: { section: "第十四章 心血管併發症與其危險因子的處理", pdfPage: 146 },
    patientFacing: true,
  },
  {
    id: "bp-target-intensive",
    typeGate: "type2-confirmed",
    targetValue: "在病人可承受的情況下可進一步控制至 130/80 mmHg。",
    category: "bp-target",
    appliesTo: "高心血管疾病風險或已有蛋白尿",
    statement: "血壓進一步控制至 130/80 mmHg 以下；需同時注意降壓帶來的併發風險。",
    patientStatement: "血壓建議控制在 130/80 mmHg 以下。若您有頭暈或站起來時眼前發黑，請回診時告訴醫療團隊，目標可以調整。",
    citation: { section: "第十四章 心血管併發症與其危險因子的處理", pdfPage: 146 },
    patientFacing: true,
  },

  // ── 血脂目標 ──────────────────────────────────────────────
  {
    id: "ldl-general",
    targetValue: "低於 100 mg/dL。",
    category: "lipid-target",
    appliesTo: "所有糖尿病人",
    statement: "低密度脂蛋白膽固醇目標為低於 100 mg/dL。",
    citation: { table: "表一 血脂的目標建議", pdfPage: 153 },
    patientFacing: true,
  },
  {
    id: "ldl-cvd",
    targetValue: "低於 70 mg/dL。",
    category: "lipid-target",
    appliesTo: "已有心血管疾病",
    statement: "低密度脂蛋白膽固醇目標為低於 70 mg/dL。",
    citation: { table: "表一 血脂的目標建議", pdfPage: 153 },
    patientFacing: true,
  },
  {
    id: "hdl-target",
    targetValue: "男性高於 40 mg/dL、女性高於 50 mg/dL。",
    category: "lipid-target",
    appliesTo: "所有糖尿病人",
    statement: "高密度脂蛋白膽固醇目標為男性高於 40 mg/dL、女性高於 50 mg/dL。",
    citation: { table: "表一 血脂的目標建議", pdfPage: 153 },
    patientFacing: true,
  },
  {
    id: "tg-target",
    targetValue: "低於 150 mg/dL；達到或超過 500 mg/dL 時需藥物處理。",
    category: "lipid-target",
    appliesTo: "所有糖尿病人",
    statement: "三酸甘油酯目標為低於 150 mg/dL；達到或超過 500 mg/dL 時需藥物處理。",
    patientStatement: "三酸甘油酯建議控制在 150 mg/dL 以下。",
    citation: { table: "表一 血脂的目標建議", pdfPage: 153 },
    patientFacing: true,
  },

  // ── 腎臟與用藥安全 ────────────────────────────────────────
  {
    id: "metformin-egfr-30",
    category: "medication-safety",
    appliesTo: "eGFR 低於 30 mL/min/1.73m²",
    statement: "此腎功能下 metformin 屬禁用。",
    citation: { section: "第十一章 口服抗糖尿病藥物（臨床建議表）", pdfPage: 97 },
    patientFacing: false,
  },
  {
    id: "metformin-egfr-30-45",
    category: "medication-safety",
    appliesTo: "eGFR 介於 30–45 mL/min/1.73m²",
    statement: "metformin 應減量使用。",
    citation: { section: "第十一章 口服抗糖尿病藥物（臨床建議表）", pdfPage: 97 },
    patientFacing: false,
  },
  {
    id: "albuminuria-diagnosis",
    category: "kidney",
    appliesTo: "尿液白蛋白/肌酸酐比值異常者",
    statement:
      "異常結果應於 3–6 個月內重複測定，3 次檢查中有 2 次異常才診斷為蛋白尿。",
    citation: { table: "表九 註 2", pdfPage: 18 },
    patientFacing: true,
  },
  {
    id: "kidney-intensive-followup",
    category: "screening-interval",
    appliesTo: "UACR 超過 300 mg/g 或 eGFR 介於 30–60 mL/min/1.73m²（低於 30 不在本註範圍）",
    statement: "至少每半年監測追蹤一次。",
    citation: { table: "表九 註 3", pdfPage: 18 },
    patientFacing: true,
  },

  // ── 監測與追蹤間隔（表九）────────────────────────────────
  {
    id: "interval-hba1c",
    typeGate: "type2-confirmed",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement: "糖化血色素與血糖建議每 3 個月監測一次。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 18 },
    patientFacing: true,
  },
  {
    id: "interval-education",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement: "糖尿病衛教建議每 3 個月進行一次。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 18 },
    patientFacing: true,
  },
  {
    id: "interval-lipid",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement:
      "血脂建議每年檢查一次；若血脂異常或正在使用降血脂藥物，改為每 3–6 個月。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 18 },
    patientFacing: true,
  },
  {
    id: "interval-kidney",
    typeGate: "type2-confirmed",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement:
      "肌酸酐、eGFR、尿液常規與白蛋白尿建議每年檢查一次；異常需追蹤者改為每 3–6 個月。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 18 },
    patientFacing: true,
  },
  {
    id: "interval-eye",
    typeGate: "type2-confirmed",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement: "視力與眼底檢查建議每年一次。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 18 },
    patientFacing: true,
  },
  {
    id: "interval-foot",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement: "足部脈搏與踝臂動脈收縮壓比值建議每年檢查一次。",
    patientStatement: "建議每年檢查一次腳的血液循環。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 18 },
    patientFacing: true,
  },
  {
    id: "interval-neuropathy",
    typeGate: "type2-confirmed",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement:
      "神經病變評估（單股纖維壓覺、128 Hz 音叉震動感、肌腱反射）建議每年一次。",
    patientStatement: "建議每年做一次足部感覺檢查。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 18 },
    patientFacing: true,
  },
  {
    id: "interval-oral",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement: "口腔檢查建議每年一次。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 18 },
    patientFacing: true,
  },
  {
    id: "interval-self-management",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement: "體重、血壓、血糖與足部的自我管理需經常進行。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 18 },
    patientFacing: true,
  },
  {
    id: "interval-retina-followup",
    category: "screening-interval",
    appliesTo: "已完成眼底檢查者",
    statement:
      "眼底沒有變化或僅輕微變化時每年一次；比上次檢查惡化時每 3–6 個月一次；懷孕時需更頻繁追蹤。",
    citation: { table: "表九 註 4", pdfPage: 18 },
    patientFacing: true,
  },
  {
    id: "screening-adult",
    category: "screening-interval",
    appliesTo: "40 歲以上一般民眾",
    statement:
      "40–64 歲建議每 3 年篩檢一次糖尿病，65 歲以上建議每年篩檢一次。",
    citation: { section: "第五章 糖尿病人的篩檢", pdfPage: 49 },
    patientFacing: true,
  },

  // ── 轉診急迫度 ────────────────────────────────────────────
  {
    /**
     * 指引在糖尿病腎臟疾病那一章明確給了 eGFR<30 的處置：轉介，不是某個追蹤頻率。
     * 同一段還把貧血與電解質不平衡列為轉介條件，這批病人常常同時符合好幾項。
     */
    id: "referral-nephrology",
    category: "referral-urgency",
    appliesTo: "eGFR 低於 30，或腎病病因不明、貧血、次發性副甲狀腺功能過高症、代謝性骨疾病、頑抗性高血壓、電解質不平衡",
    statement: "建議轉介腎臟專科醫師，以增進醫療照護品質並延緩透析時機。",
    citation: { section: "糖尿病腎臟疾病－轉介腎臟專科醫師", pdfPage: 199 },
    patientFacing: false,
  },

  {
    id: "referral-eye-sameday",
    category: "referral-urgency",
    appliesTo: "突發性視力喪失或視網膜剝離徵象",
    statement: "當天轉診眼科專科醫師。",
    citation: { table: "表九 註 4", pdfPage: 18 },
    patientFacing: true,
  },
  {
    id: "referral-eye-week",
    category: "referral-urgency",
    appliesTo: "視網膜前或玻璃體出血、新生血管、虹膜炎",
    statement: "一週內轉診眼科專科醫師。",
    citation: { table: "表九 註 4", pdfPage: 18 },
    patientFacing: true,
  },
  {
    id: "referral-eye-months",
    category: "referral-urgency",
    appliesTo:
      "重度視網膜病變、無法解釋的視力衰退、黃斑部水腫、白內障或無法看見眼底",
    statement: "1–2 個月內轉診眼科專科醫師。",
    citation: { table: "表九 註 4", pdfPage: 18 },
    patientFacing: true,
  },
  {
    id: "referral-foot",
    category: "referral-urgency",
    appliesTo: "有足部潰瘍或感染",
    statement: "轉診至足部照護團隊。",
    citation: { table: "表九 註 5", pdfPage: 18 },
    patientFacing: true,
  },

  // ── 第 1 型糖尿病（《2022第1型糖尿病臨床照護指引》）─────────────
  //
  // 只收與第 2 型**實際不同**的條目，以及第 2 型指引沒有的兒少項目。
  // 兩型相同的事實（例如低血糖 <70／<54 分級）不重複收，維持 typeGate 未標。
  {
    id: "t1-hba1c-general",
    targetValue: "低於 7.0%。",
    category: "glycemic-target",
    appliesTo: "第 1 型糖尿病，大部分病人",
    // 指引在兩處給了兩個寫法：p.67 臨床建議表寫「<7.0 %　對大部份病人」，
    // p.68 內文寫「一般的成人若沒有嚴重的低血糖…<7%」。取表格那一句，數字才對得上。
    statement: "糖化血色素控制目標為低於 7.0%，對大部分病人是合理的目標。",
    patientStatement: "糖化血色素建議控制在 7.0% 以下。實際目標會依您的病程、低血糖經驗與其他疾病調整，請以醫療團隊為您訂的數字為準。",
    citation: { source: "t1-2022", section: "第五章 血糖治療目標（臨床建議表）", pdfPage: 67 },
    patientFacing: true,
    typeGate: "type1-confirmed",
  },
  {
    id: "t1-hba1c-hypo-unaware",
    targetValue: "放寬為低於 7.5%。",
    category: "glycemic-target",
    appliesTo: "第 1 型糖尿病，無法清楚表達低血糖症狀、低血糖無感、無法接受胰島素類似物治療或無法規則自我監測血糖",
    statement: "糖化血色素目標放寬為低於 7.5%。",
    citation: { source: "t1-2022", section: "第五章 血糖治療目標", pdfPage: 67 },
    patientFacing: true,
    typeGate: "type1-confirmed",
  },
  {
    id: "t1-hba1c-severe-hypo",
    targetValue: "放寬為低於 8.0%。",
    category: "glycemic-target",
    appliesTo: "第 1 型糖尿病，過去有嚴重低血糖病史、預期壽命受限，或嚴格治療的害處明顯大於好處",
    statement: "糖化血色素目標放寬為低於 8.0%。",
    citation: { source: "t1-2022", section: "第五章 血糖治療目標", pdfPage: 68 },
    patientFacing: true,
    typeGate: "type1-confirmed",
  },
  {
    id: "t1-fpg-adult",
    targetValue: "80–130 mg/dL。",
    category: "glycemic-target",
    appliesTo: "第 1 型糖尿病成人",
    statement: "空腹血糖控制目標為 80–130 mg/dL。",
    citation: { source: "t1-2022", section: "第五章 血糖治療目標", pdfPage: 70 },
    patientFacing: true,
    typeGate: "type1-confirmed",
  },
  {
    /*
     * 這一條是兩型差最多的數字：第 2 型指引寫 80–160 mg/dL，第 1 型寫低於 180。
     * 套錯會讓一位餐後 170 的第 1 型病人被判成超標。
     */
    id: "t1-ppg-adult",
    targetValue: "低於 180 mg/dL。",
    category: "glycemic-target",
    appliesTo: "第 1 型糖尿病成人",
    statement: "餐後血糖控制目標為低於 180 mg/dL，測量時機為餐後 1–2 小時。",
    citation: { source: "t1-2022", section: "第五章 血糖治療目標", pdfPage: 70 },
    patientFacing: true,
    typeGate: "type1-confirmed",
  },
  {
    id: "t1-glucose-youth",
    targetValue: "飯前 90–130 mg/dL、飯後 90–180 mg/dL、睡前 90–150 mg/dL。",
    category: "glycemic-target",
    appliesTo: "第 1 型糖尿病兒童與青少年",
    statement: "飯前血糖 90–130 mg/dL、飯後血糖 90–180 mg/dL、睡前血糖 90–150 mg/dL 為合理目標。",
    citation: { source: "t1-2022", section: "第五章 血糖治療目標", pdfPage: 68 },
    patientFacing: true,
    typeGate: "type1-confirmed",
  },
  {
    id: "t1-interval-hba1c",
    category: "screening-interval",
    appliesTo: "第 1 型糖尿病",
    statement: "控制穩定且達標者一年至少監測 2 次糖化血色素；近期改變治療方式或未達控制目標者一年至少 4 次。",
    patientStatement: "糖化血色素建議一年至少檢查 2 次；如果最近換了治療方式或還沒達到目標，建議一年 4 次。",
    citation: { source: "t1-2022", section: "第五章 血糖治療目標", pdfPage: 67 },
    patientFacing: true,
    typeGate: "type1-confirmed",
  },
  {
    id: "t1-bp-target-general",
    targetValue: "收縮壓低於 140 mmHg、舒張壓低於 90 mmHg。",
    category: "bp-target",
    appliesTo: "第 1 型糖尿病合併高血壓",
    statement: "收縮壓控制於 140 mmHg 以下、舒張壓控制於 90 mmHg 以下。",
    citation: { source: "t1-2022", section: "第九章 高血壓藥物控制及目標", pdfPage: 162 },
    patientFacing: true,
    typeGate: "type1-confirmed",
  },
  {
    id: "t1-bp-target-intensive",
    targetValue: "低於 130/80 mmHg。",
    category: "bp-target",
    appliesTo: "第 1 型糖尿病合併心血管疾病或蛋白尿",
    statement: "血壓控制於 130/80 mmHg 以下；合併心血管疾病可達到次級預防，合併蛋白尿可延緩腎病變的發生和惡化。",
    citation: { source: "t1-2022", section: "第九章 高血壓藥物控制及目標", pdfPage: 162 },
    patientFacing: true,
    typeGate: "type1-confirmed",
  },
  {
    id: "t1-interval-lipid-adult",
    category: "screening-interval",
    appliesTo: "第 1 型糖尿病成人",
    statement: "每年至少接受 1 次血脂檢查，包括總膽固醇、低密度脂蛋白膽固醇、高密度脂蛋白膽固醇與三酸甘油酯。",
    citation: { source: "t1-2022", section: "第九章 血脂異常的控制及目標", pdfPage: 168 },
    patientFacing: true,
    typeGate: "type1-confirmed",
  },
  {
    id: "t1-interval-kidney",
    category: "screening-interval",
    appliesTo: "第 1 型糖尿病，發病滿 5 年以上",
    statement: "發病滿 5 年以上者，應於青春期或大於 10 歲時開始，每年檢驗早晨尿液白蛋白／肌酸酐比值（UACR）。",
    patientStatement: "糖尿病滿 5 年之後，建議每年檢查一次早晨尿液的白蛋白／肌酸酐比值。",
    citation: { source: "t1-2022", section: "第十章 糖尿病腎臟疾病", pdfPage: 198 },
    patientFacing: true,
    typeGate: "type1-confirmed",
  },
  {
    id: "t1-kidney-twice-yearly",
    category: "screening-interval",
    appliesTo: "第 1 型糖尿病，UACR 大於 300 mg/g 或 eGFR 介於 30–60 mL/min/1.73m²",
    statement: "應每年至少檢驗兩次 UACR。",
    citation: { source: "t1-2022", section: "第十章 糖尿病腎臟疾病", pdfPage: 199 },
    patientFacing: true,
    typeGate: "type1-confirmed",
  },
  {
    id: "t1-referral-nephrology",
    category: "referral-urgency",
    appliesTo: "第 1 型糖尿病，eGFR 低於 30 mL/min/1.73m²、原因不明的腎臟病，或難以控制／快速惡化的腎功能",
    statement: "應即時轉介腎臟科醫師評估。",
    citation: { source: "t1-2022", section: "第十章 糖尿病腎臟疾病", pdfPage: 199 },
    patientFacing: false,
    typeGate: "type1-confirmed",
  },
  {
    id: "t1-interval-eye",
    category: "screening-interval",
    appliesTo: "第 1 型糖尿病",
    statement: "第 1 型糖尿病人於 11 歲以上診斷後 2 年，或 9 歲診斷後 5 年，應接受初次完整的眼科檢查（含散瞳），之後依建議安排追蹤。",
    // 不把兩個分支併成「2 到 5 年」——那會讓 9 歲診斷的人以為第 2 年就該做，
    // 也讓 11 歲以上診斷的人以為可以拖到第 5 年。
    patientStatement: "第 1 型糖尿病的第一次完整眼睛檢查（含散瞳），11 歲以上診斷的人建議在診斷後 2 年完成，9 歲診斷的人建議在診斷後 5 年完成，之後定期追蹤。",
    citation: { source: "t1-2022", section: "第十章 視網膜病變", pdfPage: 186 },
    patientFacing: true,
    typeGate: "type1-confirmed",
  },
  {
    id: "t1-referral-eye-vision",
    category: "referral-urgency",
    appliesTo: "第 1 型糖尿病，矯正視力低於 0.5（20/40）或自覺視力變化",
    statement: "應轉介眼科醫師。",
    citation: { source: "t1-2022", section: "第十章 視網膜病變", pdfPage: 186 },
    patientFacing: true,
    typeGate: "type1-confirmed",
  },
  {
    id: "t1-interval-neuropathy",
    category: "screening-interval",
    appliesTo: "第 1 型糖尿病",
    statement: "第 1 型糖尿病人應於罹病後 2–5 年、青春期或年齡大於 10 歲時開始，每年接受完整的神經病變篩檢。",
    patientStatement: "第 1 型糖尿病建議在罹病 2 到 5 年後、或滿 10 歲之後開始，每年做一次完整的神經檢查。",
    citation: { source: "t1-2022", section: "第十章 神經病變", pdfPage: 214 },
    patientFacing: true,
    typeGate: "type1-confirmed",
  },
];

export const RULES_BY_ID = new Map(GUIDELINE_RULES.map((rule) => [rule.id, rule]));

export function rulesByCategory(category: RuleCategory): GuidelineRule[] {
  return GUIDELINE_RULES.filter((rule) => rule.category === category);
}

/** 給 LLM 或報告使用的引用字串。 */
export function citationText(rule: GuidelineRule): string {
  const where = rule.citation.table ?? rule.citation.section ?? "";
  return `${GUIDELINE_SOURCES[rule.citation.source ?? "t2-2022"]}${where ? `，${where}` : ""}（PDF 第 ${rule.citation.pdfPage} 頁）`;
}

/**
 * 行內出處。章表與頁次必須逐條給，否則醫師無從核對。
 *
 * 兩份指引的頁次會撞號（第 1 型的 p.198 與第 2 型的 p.198 是不同的東西），
 * 所以第 1 型的規則要標出來；第 2 型是預設來源，不標以免每一行都變長。
 */
export function citationShort(rule: GuidelineRule): string {
  const where = rule.citation.table ?? rule.citation.section ?? "";
  const book = rule.citation.source === "t1-2022" ? "第1型指引，" : "";
  return `${book}${where ? `${where}，` : ""}p.${rule.citation.pdfPage}`;
}

/**
 * 依病人的糖尿病型別過濾規則。
 *
 * 型別判不出來（absent／conflicting）時回傳第 2 型那一套——申報資料裡絕大多數
 * 是第 2 型，而完全不給目標會讓報告變成空的。呼叫端必須把這個假設寫進報告，
 * 不能靜默套用（resolve-targets 會推一則 undetermined）。
 */
export function rulesForType(verdict: string): GuidelineRule[] {
  const wanted = verdict === "type1-confirmed" ? "type1-confirmed" : "type2-confirmed";
  return GUIDELINE_RULES.filter((rule) => (rule.typeGate ?? "any") === "any" || rule.typeGate === wanted);
}

export function formatRules(rules: GuidelineRule[]): string {
  return rules
    .map((rule) => `${rule.id}｜${rule.appliesTo}：${rule.statement}　出處：${citationText(rule)}`)
    .join("\n");
}
