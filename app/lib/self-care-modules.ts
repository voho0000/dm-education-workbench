/**
 * 自我照護模組（DSMES／ADCES7 架構）。
 *
 * ⚠️ 狀態：DRAFT／自行撰寫／尚未經醫療團隊核准／不得直接對病人使用。
 *
 * 為什麼要有這一層：R1–R6 全部是「併發症主題」，而併發症主題回答的是
 * 「哪個器官要注意」，回答不了「我每天要做什麼」。糖尿病自我管理衛教
 * （DSMES）的內容骨架是七項自我照護行為，臨床照護指引本來就不是為它們寫的，
 * 所以這些文字不引指引，改由醫療團隊依院內衛教單張核定。
 *
 * 這裡的文字是為了讓流程可以跑通而自行撰寫的佔位內容，正式版應替換為
 * 院內已審核的衛教單張用語。
 */

import type { PatientFacts } from "./patient-facts.ts";

export const SELF_CARE_VERSION = "draft-0.1";
export const SELF_CARE_APPROVED = false;

export type SelfCareModule = {
  id: string;
  /** ADCES7 對應的自我照護行為 */
  behavior:
    | "healthy-eating"
    | "being-active"
    | "monitoring"
    | "taking-medication"
    | "problem-solving"
    | "reducing-risks"
    | "healthy-coping";
  title: string;
  /** 是否每份報告都納入 */
  core: boolean;
  appliesWhen: string;
  patientText: string;
  /**
   * 已知病人確實有該狀況時，用來替換 patientText 裡某一句假設句。
   *
   * 程式已經知道這位病人有腎臟與心臟問題，正文卻還寫「若同時有腎臟或心臟問題」，
   * 讀起來像是沒在看他的資料。替換是換字，不是加字。
   */
  definiteVariants?: Array<{ when: "kidney-or-heart" | "sick-day-hold-drugs" | "sglt2"; from: string; to: string }>;
  /** 需要立即或儘速就醫的情況；會被集中到報告末尾。 */
  urgentSigns?: string;
};

export const SELF_CARE_MODULES: SelfCareModule[] = [
  {
    id: "SC-MONITOR",
    behavior: "monitoring",
    title: "掌握自己的數字",
    core: true,
    appliesWhen: "每份報告固定納入。",
    patientText: `知道自己的數字，回診時才問得出重點。

1. 找出最近一次的糖化血色素、血壓、血脂與腎功能檢查結果與日期。若不確定，可在回診時請醫療團隊協助查詢。
2. 若醫療團隊建議您在家測血糖，請記錄測量的時間點（空腹、飯後或睡前）與數值，回診時一起帶去。
3. 在家量血壓時，先坐著休息五分鐘，手臂與心臟同高，同一時間每天量，並把數值記下來。
4. 不要只看單一次的數字。一段時間的變化比單次結果更能反映真實狀況。`,
  },
  {
    id: "SC-MEDS",
    behavior: "taking-medication",
    title: "把藥用對、用得安全",
    core: true,
    appliesWhen: "每份報告固定納入。",
    patientText: `規律用藥是控制糖尿病最直接的一環，而任何調整都應該由醫師決定。

1. 依醫師指示的時間與劑量服藥。若經常忘記，可使用藥盒、手機提醒，或請醫療團隊協助簡化用藥。
2. 服藥後若出現不舒服，先聯絡醫療團隊或藥師確認，不要自行停藥、減藥或更換藥品。
3. 每次看診、看牙或到藥局時，主動出示目前所有正在使用的藥品清單，包含中草藥、保健食品與別家醫院開立的藥。
4. 不要自行購買來路不明的藥品、偏方或宣稱可以取代處方的產品。`,
  },
  {
    id: "SC-EAT",
    behavior: "healthy-eating",
    title: "吃得穩定，不必吃得痛苦",
    core: true,
    appliesWhen: "每份報告固定納入。",
    patientText: `糖尿病的飲食不是不能吃，而是讓份量與時間穩定下來。

1. 三餐時間盡量固定，不要為了控制血糖而跳過正餐。
2. 主食（飯、麵、麵包、根莖類、水果）是影響血糖最主要的來源。份量比種類更重要，可請營養師協助換算適合您的份量。
3. 每餐先吃蔬菜與蛋白質，再吃主食，有助於減緩血糖上升。
4. 含糖飲料是最容易被忽略的來源，包含手搖飲、罐裝飲料與運動飲料。改喝白開水或無糖茶是最快見效的一步。
5. 若同時有腎臟或心臟問題，鹽分、蛋白質與水分的限制需要依個人狀況設計，不要自行套用網路上的飲食法。`,
    definiteVariants: [
      {
        when: "kidney-or-heart",
        from: "5. 若同時有腎臟或心臟問題，鹽分、蛋白質與水分的限制需要依個人狀況設計，不要自行套用網路上的飲食法。",
        to: "5. 您的資料顯示已有腎臟或心臟方面的狀況，鹽分、蛋白質與水分的份量需要由營養師與醫療團隊為您個別設計，不要自行套用網路上的飲食法。",
      },
    ],
  },
  {
    id: "SC-ACTIVE",
    behavior: "being-active",
    title: "動起來，從做得到的強度開始",
    core: true,
    appliesWhen: "每份報告固定納入。",
    patientText: `規律活動能同時改善血糖、血壓與血脂，重點是能持續。

1. 從您現在做得到的強度開始，逐步增加。走路是最容易開始也最容易持續的方式。
2. 盡量減少長時間久坐。每坐約一小時起來活動幾分鐘，累積起來也有效果。
3. 若活動時出現胸悶、胸痛、明顯喘不過氣、頭暈或冒冷汗，請立即停止並儘速就醫。
4. 若已有足部傷口、視網膜病變、心臟疾病或平衡問題，開始新的運動前請先與醫療團隊討論適合的方式與強度。`,
  },
  {
    id: "SC-RISK-REDUCE",
    behavior: "reducing-risks",
    title: "疫苗與口腔",
    core: true,
    appliesWhen: "每份報告固定納入。",
    patientText: `1. 依醫療團隊建議接種疫苗。
2. 維持口腔清潔並定期洗牙。牙周發炎與血糖控制會互相影響。`,
  },
  {
    id: "SC-HYPO",
    behavior: "problem-solving",
    title: "認識低血糖並知道怎麼處理",
    core: false,
    appliesWhen:
      "資料中有胰島素或促胰島素分泌劑（如 sulfonylurea、glinide）的申報紀錄時納入。",
    patientText: `某些糖尿病藥物可能造成低血糖，事先知道怎麼處理就不會慌張。

1. 常見症狀包含發抖、冒冷汗、心悸、飢餓感、頭暈、視線模糊、注意力不集中或突然情緒改變。
2. 懷疑低血糖時，若手邊有血糖機請先測量。無法測量時，先當作低血糖處理。
3. 立即補充約 15 公克的醣類，例如半杯果汁、含糖飲料或方糖。等待 15 分鐘後再測一次，若仍偏低可再補充一次。
4. 症狀改善後，若距離下一餐還久，可再吃一份含澱粉的點心。
5. 隨身攜帶糖果或含糖飲料，並讓家人、同事知道您可能發生低血糖以及該怎麼幫您。`,
    urgentSigns: "低血糖時出現意識不清、抽搐或無法自行吞嚥：旁人不可強行餵食，請立即撥打 119。",
  },
  {
    id: "SC-SICKDAY",
    behavior: "problem-solving",
    title: "生病或使用類固醇期間的照護",
    core: false,
    appliesWhen:
      "資料中有全身性類固醇的申報紀錄，或年齡 65 歲以上，或已發生併發症項目較多時納入。",
    patientText: `感染、發燒或使用類固醇期間，血糖可能明顯上升。

1. 生病期間不要自行停用糖尿病藥物，除非醫師另有指示。
2. 這段期間血糖可能比平常高，若醫療團隊有教您自我監測，建議增加測量頻率。
3. 注意補充水分。發燒、腹瀉或嘔吐時特別容易脫水。
4. 使用類固醇期間血糖上升是常見反應，停藥後可能回降。用藥前後請主動告知糖尿病照護團隊。`,
    definiteVariants: [
      {
        // 指引表 3「糖尿病用藥注意事項」：metformin 與 SGLT2 抑制劑在患病期間
        // 建議停用並遵守生病日守則。但我們不能叫病人自行停藥，所以轉成
        // 「事先問清楚」——行動落在病人身上，決定權留給醫療團隊。
        when: "sick-day-hold-drugs",
        from: "1. 生病期間不要自行停用糖尿病藥物，除非醫師另有指示。",
        to: `1. 生病期間不要自行停用糖尿病藥物，除非醫師另有指示。
2. 您使用的藥物中，有些在發燒、嚴重腹瀉嘔吐或無法進食而脫水時可能需要暫停。請事先和醫療團隊確認「哪幾種要停、什麼情況停、什麼時候恢復」，把答案記下來備用，不要等生病當下才問。`,
      },
      {
        when: "sglt2",
        from: "3. 注意補充水分。發燒、腹瀉或嘔吐時特別容易脫水。",
        to: `3. 注意補充水分並保持會陰部清潔。您使用的藥物中有一類會讓糖分從尿液排出，較容易發生泌尿道或生殖器感染。
4. 特別注意：這類藥物在少數情況下，即使血糖不高也可能發生酮酸中毒。若出現持續噁心嘔吐、腹痛、呼吸變喘或呼氣有水果味，即使血糖看起來正常也要儘速就醫。`,
      },
    ],
    urgentSigns: "生病期間持續嘔吐無法進食、血糖持續偏高不下、呼吸變喘、意識改變或明顯脫水：儘速就醫。",
  },
  {
    id: "SC-COPING",
    behavior: "healthy-coping",
    title: "照顧情緒也是照顧糖尿病",
    core: false,
    appliesWhen: "已發生併發症較多或整體疾病負擔較高時納入。",
    patientText: `長期管理慢性病本來就累，情緒低落或倦怠並不代表您做得不好。

1. 覺得疲乏、沮喪或對自我照護失去動力，是常見且可以被協助的狀況，不是意志力的問題。
2. 一次只調整一件事。設定小而具體的目標，比一次改變全部更容易持續。
3. 讓家人或朋友知道您正在做的事，需要時請他們協助提醒或陪同回診。
4. 若情緒低落持續超過兩週、影響睡眠或日常生活，請主動告訴醫療團隊，可安排進一步評估與轉介。`,
    urgentSigns: "若出現傷害自己的念頭：請立即告訴身邊的人並尋求協助，或撥打 1925 安心專線。",
  },
];

export const SELF_CARE_BY_ID = new Map(SELF_CARE_MODULES.map((item) => [item.id, item]));

/**
 * 自我照護模組的適用判定。
 * 核心模組固定納入；條件模組依申報用藥分類、年齡與疾病負擔判定。
 * 這一層是確定性的，LLM 不參與。
 */
export function selectSelfCareModules(
  facts: PatientFacts,
  /**
   * 已發生併發症的項目數，必須由 decideTopics 提供。
   * 自己再數一次 R>0 會漏掉 CKD 旗標驅動的腎臟判定，造成同一份報告裡
   * 一處寫 4 項、一處寫 3 項——稽核就是這樣抓到的。
   */
  establishedCount: number,
  /**
   * 資料中實測到的最低血糖（mg/dL），沒有就傳 null。
   *
   * 只看申報用藥分類會漏掉人：申報用藥可能是兩年前的（實測有一位病人差 765 天），
   * 而血糖 55 mg/dL 是當下就存在的事實。實測值低於 70 一律納入低血糖處理，
   * 不管申報用藥寫什麼。
   */
  lowestGlucose: number | null = null,
): {
  moduleIds: string[];
  reasons: Record<string, string>;
} {
  const reasons: Record<string, string> = {};
  const chosen: string[] = [];

  for (const item of SELF_CARE_MODULES) {
    if (!item.core) continue;
    chosen.push(item.id);
    reasons[item.id] = "核心自我照護模組，固定納入。";
  }

  const classes = facts.medicationClasses.map((item) => item.atcClass).join(" ");
  const hypoDrug = /胰島素|insulin|磺醯脲|sulfonyl|glinide|瑞格列|格列/i.test(classes);
  const hypoMeasured = lowestGlucose !== null && lowestGlucose < 70;
  if (hypoDrug || hypoMeasured) {
    chosen.push("SC-HYPO");
    reasons["SC-HYPO"] = [
      hypoMeasured ? `資料中實測血糖最低 ${lowestGlucose} mg/dL，低於 70` : "",
      hypoDrug ? "申報用藥分類中出現胰島素或促胰島素分泌劑" : "",
    ]
      .filter(Boolean)
      .join("；") + "，需納入低血糖處理。";
  }

  const steroid = /腎上腺素|類固醇|corticoster|prednis|dexameth/i.test(classes);
  // 指引表 3 為 metformin、SGLT2i、SU、胰島素分別列了生病日注意事項。
  // 先前只靠類固醇／年齡／併發症數觸發，一位 50 歲、單一併發症的 SGLT2i
  // 使用者會完全拿不到生病日衛教。
  const ingredients = facts.medicationIngredients.join(" ");
  const holdDrugs = /metformin|雙胍|gliflozin/i.test(ingredients);
  const age = facts.ageYears.known ? facts.ageYears.value : null;
  const positives = establishedCount;
  if (steroid || holdDrugs || (age !== null && age >= 65) || positives >= 3) {
    chosen.push("SC-SICKDAY");
    reasons["SC-SICKDAY"] = [
      steroid ? "申報用藥分類中出現全身性類固醇" : "",
      age !== null && age >= 65 ? `年齡 ${age} 歲` : "",
      holdDrugs ? "申報用藥含生病期間可能需要暫停的類別（metformin 或 SGLT2 抑制劑）" : "",
      positives >= 3 ? `已發生併發症 ${positives} 項` : "",
    ]
      .filter(Boolean)
      .join("；") + "。";
  }

  const dcsi = facts.dcsiTotal.known ? facts.dcsiTotal.value : null;
  if ((dcsi !== null && dcsi >= 4) || positives >= 3) {
    chosen.push("SC-COPING");
    reasons["SC-COPING"] = `疾病負擔較高（DCSI ${dcsi ?? "未知"}，已發生併發症 ${positives} 項）。`;
  }

  return { moduleIds: chosen, reasons };
}
