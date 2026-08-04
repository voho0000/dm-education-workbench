/**
 * 指引門檻值規則表（取代把 652,078 字元的指引全文塞進 context）。
 *
 * 來源：中華民國糖尿病學會《2022第2型糖尿病臨床照護指引》。
 *
 * 這裡記錄的是**事實**（門檻數值、追蹤間隔、轉診急迫度），以自己的文字陳述，
 * 並附上可回查的出處；不重製指引原文。原文標示未授權不得轉載與散布，
 * 因此指引全文只由使用者在本頁臨時載入，不進入本檔、不進入版本控制。
 *
 * 維護方式：這張表要由醫療團隊逐條審閱與簽署，而不是散在 prompt 裡的散文。
 * 每次改動請更新 RULES_VERSION 並重新送審。
 *
 * citation.pdfPage 指 PDF 實體頁次（全文共 418 頁），與書上印刷頁碼不同，
 * 但可直接跳頁核對。
 */

export const RULES_VERSION = "2022-guideline-extract-0.2";
export const RULES_APPROVED = false;
export const RULES_SOURCE = "中華民國糖尿病學會《2022第2型糖尿病臨床照護指引》";

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
  citation: { table?: string; section?: string; pdfPage: number };
  /**
   * 這條規則是否可以直接寫進病人可見內容。
   * false 代表它只用於醫師版或程式判定（例如藥物禁忌）。
   */
  patientFacing: boolean;
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
    category: "glycemic-target",
    appliesTo: "一般成人",
    statement: "糖化血色素控制目標為低於 7.0%，並需個別化考量。",
    citation: { table: "表一 血糖控制目標", pdfPage: 13 },
    patientFacing: true,
  },
  {
    id: "fpg-general",
    category: "glycemic-target",
    appliesTo: "一般成人",
    statement: "空腹血糖控制目標為 80–130 mg/dL。",
    citation: { section: "第九章 血糖控制目標", pdfPage: 72 },
    patientFacing: true,
  },
  {
    id: "ppg-general",
    category: "glycemic-target",
    appliesTo: "一般成人",
    statement: "餐後血糖控制目標為 80–160 mg/dL。",
    citation: { section: "第九章 血糖控制目標", pdfPage: 72 },
    patientFacing: true,
  },
  {
    id: "hba1c-elderly-healthy",
    category: "glycemic-target",
    appliesTo: "65 歲以上、共病少且認知與身體機能正常",
    statement: "糖化血色素目標放寬為低於 7–7.5%。",
    citation: { table: "表二 高齡者血糖目標", pdfPage: 72 },
    patientFacing: true,
  },
  {
    id: "hba1c-elderly-intermediate",
    category: "glycemic-target",
    appliesTo: "65 歲以上、多種共病或認知與身體機能輕至中度異常",
    statement: "糖化血色素目標放寬為低於 8.0%。",
    citation: { table: "表二 高齡者血糖目標", pdfPage: 72 },
    patientFacing: true,
  },
  {
    id: "hba1c-elderly-poor",
    category: "glycemic-target",
    appliesTo: "65 歲以上、末期慢性病或認知與身體機能中至重度異常",
    statement:
      "不以糖化血色素作為唯一控制目標，重點在避免低血糖與有症狀的高血糖。",
    citation: { table: "表二 高齡者血糖目標", pdfPage: 72 },
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
    citation: { table: "表九 註 1", pdfPage: 19 },
    patientFacing: true,
  },

  // ── 血壓目標 ──────────────────────────────────────────────
  {
    id: "bp-treatment-threshold",
    category: "bp-target",
    appliesTo: "糖尿病人",
    statement: "血壓達到或超過 140/90 mmHg 通常即開始高血壓治療。",
    citation: { section: "第十四章 心血管併發症", pdfPage: 147 },
    patientFacing: true,
  },
  {
    id: "bp-target-general",
    category: "bp-target",
    appliesTo: "一般糖尿病人",
    statement: "血壓控制在 140/90 mmHg 以下。",
    citation: { section: "第十四章 心血管併發症", pdfPage: 147 },
    patientFacing: true,
  },
  {
    id: "bp-target-intensive",
    category: "bp-target",
    appliesTo: "可耐受且屬心血管或腦血管高危族群",
    statement: "在病人可承受的情況下可進一步控制至 130/80 mmHg。",
    citation: { section: "第十四章 心血管併發症", pdfPage: 147 },
    patientFacing: true,
  },

  // ── 血脂目標 ──────────────────────────────────────────────
  {
    id: "ldl-general",
    category: "lipid-target",
    appliesTo: "所有糖尿病人",
    statement: "低密度脂蛋白膽固醇目標為低於 100 mg/dL。",
    citation: { table: "表一 血脂的目標建議", pdfPage: 154 },
    patientFacing: true,
  },
  {
    id: "ldl-cvd",
    category: "lipid-target",
    appliesTo: "已有心血管疾病",
    statement: "低密度脂蛋白膽固醇目標為低於 70 mg/dL。",
    citation: { table: "表一 血脂的目標建議", pdfPage: 154 },
    patientFacing: true,
  },
  {
    id: "hdl-target",
    category: "lipid-target",
    appliesTo: "所有糖尿病人",
    statement: "高密度脂蛋白膽固醇目標為男性高於 40 mg/dL、女性高於 50 mg/dL。",
    citation: { table: "表一 血脂的目標建議", pdfPage: 154 },
    patientFacing: true,
  },
  {
    id: "tg-target",
    category: "lipid-target",
    appliesTo: "所有糖尿病人",
    statement: "三酸甘油酯目標為低於 150 mg/dL；達到或超過 500 mg/dL 時需藥物處理。",
    citation: { table: "表一 血脂的目標建議", pdfPage: 154 },
    patientFacing: true,
  },

  // ── 腎臟與用藥安全 ────────────────────────────────────────
  {
    id: "metformin-egfr-30",
    category: "medication-safety",
    appliesTo: "eGFR 低於 30 mL/min/1.73m²",
    statement: "此腎功能下 metformin 屬禁用。",
    citation: { section: "第十一章 藥物治療", pdfPage: 100 },
    patientFacing: false,
  },
  {
    id: "metformin-egfr-30-45",
    category: "medication-safety",
    appliesTo: "eGFR 介於 30–45 mL/min/1.73m²",
    statement: "metformin 應減量使用。",
    citation: { section: "第十一章 藥物治療", pdfPage: 100 },
    patientFacing: false,
  },
  {
    id: "albuminuria-diagnosis",
    category: "kidney",
    appliesTo: "尿液白蛋白/肌酸酐比值異常者",
    statement:
      "異常結果應於 3–6 個月內重複測定，3 次檢查中有 2 次異常才診斷為蛋白尿。",
    citation: { table: "表九 註 2", pdfPage: 19 },
    patientFacing: true,
  },
  {
    id: "kidney-intensive-followup",
    category: "screening-interval",
    appliesTo: "UACR 超過 300 mg/g 或 eGFR 介於 30–60 mL/min/1.73m²",
    statement: "至少每半年監測追蹤一次。",
    citation: { table: "表九 註 3", pdfPage: 19 },
    patientFacing: true,
  },

  // ── 監測與追蹤間隔（表九）────────────────────────────────
  {
    id: "interval-hba1c",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement: "糖化血色素與靜脈血漿血糖建議每 3 個月監測一次。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 19 },
    patientFacing: true,
  },
  {
    id: "interval-education",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement: "糖尿病衛教建議每 3 個月進行一次。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 19 },
    patientFacing: true,
  },
  {
    id: "interval-lipid",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement:
      "血脂建議每年檢查一次；若血脂異常或正在使用降血脂藥物，改為每 3–6 個月。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 19 },
    patientFacing: true,
  },
  {
    id: "interval-kidney",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement:
      "肌酸酐、eGFR、尿液常規與白蛋白尿建議每年檢查一次；異常需追蹤者改為每 3–6 個月。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 19 },
    patientFacing: true,
  },
  {
    id: "interval-eye",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement: "視力與眼底檢查建議每年一次。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 19 },
    patientFacing: true,
  },
  {
    id: "interval-foot",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement: "足部脈搏與踝臂動脈收縮壓比值建議每年檢查一次。",
    patientStatement: "建議每年檢查一次腳的血液循環。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 19 },
    patientFacing: true,
  },
  {
    id: "interval-neuropathy",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement:
      "神經病變評估（單股纖維壓覺、128 Hz 音叉震動感、肌腱反射）建議每年一次。",
    patientStatement: "建議每年做一次足部感覺檢查。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 19 },
    patientFacing: true,
  },
  {
    id: "interval-oral",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement: "口腔檢查建議每年一次。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 19 },
    patientFacing: true,
  },
  {
    id: "interval-self-management",
    category: "screening-interval",
    appliesTo: "糖尿病人",
    statement: "體重、血壓、血糖與足部的自我管理需經常進行。",
    citation: { table: "表九 臨床監測項目與建議頻率", pdfPage: 19 },
    patientFacing: true,
  },
  {
    id: "interval-retina-followup",
    category: "screening-interval",
    appliesTo: "已完成眼底檢查者",
    statement:
      "眼底沒有變化或僅輕微變化時每年一次；比上次檢查惡化時每 3–6 個月一次；懷孕時需更頻繁追蹤。",
    citation: { table: "表九 註 4", pdfPage: 19 },
    patientFacing: true,
  },
  {
    id: "screening-adult",
    category: "screening-interval",
    appliesTo: "40 歲以上一般民眾",
    statement:
      "40 歲以上建議每 3 年篩檢一次糖尿病，65 歲以上建議每年篩檢一次。",
    citation: { section: "第五章 糖尿病人的篩檢", pdfPage: 50 },
    patientFacing: true,
  },

  // ── 轉診急迫度 ────────────────────────────────────────────
  {
    id: "referral-eye-sameday",
    category: "referral-urgency",
    appliesTo: "突發性視力喪失或視網膜剝離徵象",
    statement: "當天轉診眼科專科醫師。",
    citation: { table: "表九 註 4", pdfPage: 19 },
    patientFacing: true,
  },
  {
    id: "referral-eye-week",
    category: "referral-urgency",
    appliesTo: "視網膜前或玻璃體出血、新生血管、虹膜炎",
    statement: "一週內轉診眼科專科醫師。",
    citation: { table: "表九 註 4", pdfPage: 19 },
    patientFacing: true,
  },
  {
    id: "referral-eye-months",
    category: "referral-urgency",
    appliesTo:
      "重度視網膜病變、無法解釋的視力衰退、黃斑部水腫、白內障或無法看見眼底",
    statement: "1–2 個月內轉診眼科專科醫師。",
    citation: { table: "表九 註 4", pdfPage: 19 },
    patientFacing: true,
  },
  {
    id: "referral-foot",
    category: "referral-urgency",
    appliesTo: "有足部潰瘍或感染",
    statement: "轉診至足部照護團隊。",
    citation: { table: "表九 註 5", pdfPage: 19 },
    patientFacing: true,
  },
];

export const RULES_BY_ID = new Map(GUIDELINE_RULES.map((rule) => [rule.id, rule]));

export function rulesByCategory(category: RuleCategory): GuidelineRule[] {
  return GUIDELINE_RULES.filter((rule) => rule.category === category);
}

/** 給 LLM 或報告使用的引用字串。 */
export function citationText(rule: GuidelineRule): string {
  const where = rule.citation.table ?? rule.citation.section ?? "";
  return `${RULES_SOURCE}${where ? `，${where}` : ""}（PDF 第 ${rule.citation.pdfPage} 頁）`;
}

/**
 * 行內出處。整份報告的指引來源只有一個，每一行都重印書名是雜訊；
 * 但章表與頁次必須逐條給，否則醫師無從核對。
 */
export function citationShort(rule: GuidelineRule): string {
  const where = rule.citation.table ?? rule.citation.section ?? "";
  return `${where ? `${where}，` : ""}p.${rule.citation.pdfPage}`;
}

export function formatRules(rules: GuidelineRule[]): string {
  return rules
    .map((rule) => `${rule.id}｜${rule.appliesTo}：${rule.statement}　出處：${citationText(rule)}`)
    .join("\n");
}
