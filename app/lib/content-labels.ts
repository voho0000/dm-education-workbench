/**
 * 內容庫檢視器用的中文標籤。
 *
 * 為什麼不寫在元件裡：這些對照表要能被測試檢查「有沒有漏」。
 * 資料裡新增一個主題代碼或規則類別時，若這裡忘了補，畫面上就會出現
 * 生的英文代碼（甚至整組規則排不進順序裡），而審閱的人不會知道少了什麼。
 */

import type { EducationModule } from "./education-modules.ts";
import type { RuleCategory } from "./guideline-rules.ts";
import type { SelfCareModule } from "./self-care-modules.ts";

export const TOPIC_LABEL: Record<EducationModule["topic"], string> = {
  BASE: "固定納入",
  TYPE: "糖尿病類型",
  R1: "R1 眼睛",
  R2: "R2 腦血管",
  R3: "R3 腎臟",
  R4: "R4 神經",
  R5: "R5 心臟",
  R6: "R6 下肢循環",
};

export const TYPE_GATE_LABEL: Record<EducationModule["typeGate"], string> = {
  any: "不限型別",
  "type1-confirmed": "僅第一型",
  "type2-confirmed": "僅第二型",
};

export const BEHAVIOR_LABEL: Record<SelfCareModule["behavior"], string> = {
  "healthy-eating": "健康飲食",
  "being-active": "規律活動",
  monitoring: "自我監測",
  "taking-medication": "規律用藥",
  "problem-solving": "問題處理",
  "reducing-risks": "降低風險",
  "healthy-coping": "情緒調適",
};

export const VARIANT_WHEN_LABEL: Record<string, string> = {
  "kidney-or-heart": "已知有腎臟或心臟問題",
  "sick-day-hold-drugs": "有生病日需暫停的藥物",
  sglt2: "使用 SGLT2 抑制劑",
};

export const CATEGORY_LABEL: Record<RuleCategory, string> = {
  "glycemic-target": "血糖目標",
  "bp-target": "血壓目標",
  "lipid-target": "血脂目標",
  kidney: "腎臟",
  "medication-safety": "用藥安全",
  "screening-interval": "篩檢間隔",
  "referral-urgency": "轉診急迫度",
  "measurement-caveat": "判讀注意事項",
};

/** 顯示順序。沒列到的類別不會被丟掉，由元件排在最後。 */
export const CATEGORY_ORDER: RuleCategory[] = [
  "glycemic-target",
  "bp-target",
  "lipid-target",
  "kidney",
  "screening-interval",
  "referral-urgency",
  "medication-safety",
  "measurement-caveat",
];
