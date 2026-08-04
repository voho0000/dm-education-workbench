/**
 * 把「個別化目標」與「實際檢驗值」放在一起比對。
 *
 * 為什麼需要：獨立稽核指出，系統算出了 LDL<70、HbA1c 需定案等目標，也列出了
 * 病人的實際數值，但兩節從不對話。結果是 HbA1c 9.2%、HDL-C 14 mg/dL 這種
 * 明顯異常只以原始數字出現，沒有任何提示，而同一套系統對飯前血糖 266 卻會警示。
 * 覆蓋不一致比完全沒有覆蓋更危險，因為它讓人以為沒被標記就是正常。
 *
 * 這一層對每個有數值的指標都做比對，一個都不漏。
 *
 * 時序限制照舊：沒有採檢日，所以一律講「曾出現」，不講最近或趨勢。
 */

import { RULES_BY_ID, citationText, citationShort } from "./guideline-rules.ts";
import type { Analyte, AnalyteFinding } from "./lab-findings.ts";
import type { PatientFacts } from "./patient-facts.ts";

export type TargetComparison = {
  analyte: Analyte;
  label: string;
  /** 病人資料中最不利的一筆 */
  worst: number;
  /** 已解出的門檻描述；無法解出時為 null */
  target: string | null;
  outOfTarget: boolean;
  severity: "info" | "attention" | "urgent";
  clinicianMessage: string;
  patientMessage: string | null;
  citation: string | null;
  /** 行內出處用（章表＋頁次），與 citation 同一條規則 */
  citationShort: string | null;
  /** 目標值本身需要醫療團隊定案時為 true */
  targetNeedsConfirmation: boolean;
};

function cite(id: string): string | null {
  const rule = RULES_BY_ID.get(id);
  return rule ? citationText(rule) : null;
}

function citeShort(id: string): string | null {
  const rule = RULES_BY_ID.get(id);
  return rule ? citationShort(rule) : null;
}

/**
 * 已發生的心血管或腦血管疾病會把 LDL 目標從 100 收緊到 70。
 * 與 resolve-targets 用同一個判定，避免兩邊各算各的。
 */
function hasVascularDisease(facts: PatientFacts): boolean {
  const positives = facts.existingComplications
    .filter((item) => (item.value ?? 0) > 0)
    .map((item) => Number(item.code.slice(1)));
  return positives.includes(2) || positives.includes(5);
}

export function compareToTargets(findings: AnalyteFinding[], facts: PatientFacts): TargetComparison[] {
  const results: TargetComparison[] = [];
  const get = (analyte: Analyte) => findings.find((item) => item.analyte === analyte);
  const age = facts.ageYears.known ? facts.ageYears.value : null;
  const elderly = age !== null && age >= 65;

  // ── 糖化血色素 ──
  const hba1c = get("HbA1c");
  if (hba1c) {
    const worst = hba1c.max;
    // 高齡的健康狀態分級申報資料判定不了，所以目標本身待定。
    // 門檻表中最寬的**數值**門檻是 8.0%（健康狀況差者不以糖化血色素為唯一目標，
    // 沒有數字），因此以 8.0 作為比較基準。
    // 先前這裡寫 8.5%，那個數字在抽取出來的門檻表中不存在——是從 v14 帶進來的，
    // 稽核正確地指出它無法溯源。
    const loosest = elderly ? 8.0 : 7.0;
    const outOfTarget = worst > loosest;
    results.push({
      analyte: "HbA1c",
      label: "糖化血色素",
      worst,
      target: elderly ? "高齡者依健康狀態分為 <7–7.5%／<8.0%／不以此為唯一目標" : "低於 7.0%",
      outOfTarget,
      severity: worst >= 10 ? "urgent" : outOfTarget ? "attention" : "info",
      clinicianMessage: outOfTarget
        ? `HbA1c 曾出現 ${worst}%，超過${elderly ? "指引高齡分級中最寬的數值門檻 8.0%（健康狀況差者不以糖化血色素為唯一目標，需醫療團隊判定）" : "一般成人目標 7.0%"}。`
        : `HbA1c 曾出現 ${worst}%，未超過${elderly ? "高齡分級中最寬的數值門檻 8.0%" : "一般成人目標 7.0%"}。`,
      patientMessage: outOfTarget
        ? `您的資料中曾出現偏高的糖化血色素（${worst}%）。這是反映一段期間平均血糖的指標，請與醫療團隊確認適合您的目標值與下一步。`
        : null,
      citation: cite(elderly ? "hba1c-elderly-intermediate" : "hba1c-general"),
      citationShort: citeShort(elderly ? "hba1c-elderly-intermediate" : "hba1c-general"),
      targetNeedsConfirmation: elderly,
    });
  }

  // ── 餐後血糖 ──
  // 指引有 80–160 的目標，先前沒有對應的 analyte，所以這個目標從來沒被比對過。
  const postprandial = get("postprandial-glucose");
  if (postprandial) {
    const worst = postprandial.max;
    const outOfTarget = worst > 160;
    results.push({
      analyte: "postprandial-glucose",
      label: "餐後血糖",
      worst,
      target: "80–160 mg/dL",
      outOfTarget,
      severity: worst >= 250 ? "attention" : "info",
      clinicianMessage: `Glucose PC 曾出現 ${postprandial.min}–${postprandial.max} mg/dL${outOfTarget ? "，最高超過目標上限 160" : ""}。`,
      patientMessage: outOfTarget
        ? `您的資料中曾出現偏高的餐後血糖（最高 ${worst} mg/dL）。這些紀錄沒有附檢查日期，請在回診時和醫療團隊一起看實際結果。`
        : null,
      citation: cite("ppg-general"),
      citationShort: citeShort("ppg-general"),
      targetNeedsConfirmation: elderly,
    });
  }

  // ── 飯前血糖 ──
  const fasting = get("fasting-glucose");
  if (fasting) {
    const worst = fasting.max;
    const outOfTarget = worst > 130;
    results.push({
      analyte: "fasting-glucose",
      label: "飯前血糖",
      worst,
      target: "80–130 mg/dL（高齡或多重共病可放寬至 90–150）",
      outOfTarget,
      severity: worst >= 250 ? "attention" : "info",
      clinicianMessage: `Glucose AC 曾出現 ${fasting.min}–${fasting.max} mg/dL${outOfTarget ? `，最高超過一般成人目標上限 130` : ""}。`,
      patientMessage: outOfTarget
        ? `您的資料中曾出現偏高的飯前血糖（最高 ${worst} mg/dL）。這些紀錄沒有附檢查日期，請在回診時和醫療團隊一起看實際結果。`
        : null,
      citation: cite("fpg-general"),
      citationShort: citeShort("fpg-general"),
      targetNeedsConfirmation: elderly,
    });
  }

  // ── 低密度脂蛋白膽固醇 ──
  const ldl = get("LDL-C");
  if (ldl) {
    const vascular = hasVascularDisease(facts);
    const threshold = vascular ? 70 : 100;
    const worst = ldl.max;
    const outOfTarget = worst > threshold;
    results.push({
      analyte: "LDL-C",
      label: "低密度脂蛋白膽固醇",
      worst,
      target: `低於 ${threshold} mg/dL`,
      outOfTarget,
      severity: outOfTarget ? "attention" : "info",
      clinicianMessage: `LDL-C 曾出現 ${worst} mg/dL，目標低於 ${threshold}（${vascular ? "已有心血管或腦血管疾病" : "一般糖尿病人"}）。`,
      patientMessage: outOfTarget
        ? `您的資料中曾出現偏高的低密度脂蛋白膽固醇（${worst} mg/dL）。請與醫療團隊確認您的目標值。`
        : null,
      citation: cite(vascular ? "ldl-cvd" : "ldl-general"),
      citationShort: citeShort(vascular ? "ldl-cvd" : "ldl-general"),
      targetNeedsConfirmation: false,
    });
  }

  // ── 高密度脂蛋白膽固醇 ──
  const hdl = get("HDL-C");
  if (hdl) {
    const worst = hdl.min;
    // 目標依性別而異（男 >40、女 >50）。來源的性別代碼意義未經確認，
    // 因此低於 40 一定不合格；40–50 之間則標記為需依性別確認。
    const definitelyLow = worst < 40;
    const possiblyLow = worst < 50;
    results.push({
      analyte: "HDL-C",
      label: "高密度脂蛋白膽固醇",
      worst,
      target: "男性高於 40、女性高於 50 mg/dL",
      outOfTarget: possiblyLow,
      severity: definitelyLow ? "attention" : "info",
      clinicianMessage: definitelyLow
        ? `HDL-C 曾出現 ${worst} mg/dL，低於男女兩種目標值。`
        : possiblyLow
          ? `HDL-C 曾出現 ${worst} mg/dL，若為女性則低於目標（>50）；來源性別代碼意義未確認。`
          : `HDL-C 曾出現 ${worst} mg/dL。`,
      patientMessage: definitelyLow
        ? `您的資料中曾出現偏低的高密度脂蛋白膽固醇（${worst} mg/dL）。請與醫療團隊確認是否需要處理。`
        : null,
      citation: cite("hdl-target"),
      citationShort: citeShort("hdl-target"),
      targetNeedsConfirmation: !definitelyLow && possiblyLow,
    });
  }

  // ── 三酸甘油酯 ──
  const tg = get("triglyceride");
  if (tg) {
    const worst = tg.max;
    const outOfTarget = worst >= 150;
    results.push({
      analyte: "triglyceride",
      label: "三酸甘油酯",
      worst,
      target: "低於 150 mg/dL",
      outOfTarget,
      severity: worst >= 500 ? "urgent" : outOfTarget ? "attention" : "info",
      clinicianMessage: `三酸甘油酯曾出現 ${worst} mg/dL${worst >= 500 ? "，達到需藥物處理的門檻" : outOfTarget ? "，高於目標 150" : ""}。`,
      patientMessage: outOfTarget
        ? `您的資料中曾出現偏高的三酸甘油酯（${worst} mg/dL）。請與醫療團隊確認是否需要調整。`
        : null,
      citation: cite("tg-target"),
      citationShort: citeShort("tg-target"),
      targetNeedsConfirmation: false,
    });
  }

  return results;
}

/** 只回傳超出目標的比對結果，用來組安全提示。 */
export function outOfTargetOnly(comparisons: TargetComparison[]): TargetComparison[] {
  return comparisons.filter((item) => item.outOfTarget);
}

/** 分析物 → 對應的併發症主題模組，用來把數值嵌進器官段落。 */
export const ANALYTE_TO_MODULE: Partial<Record<Analyte, string>> = {
  eGFR: "KIDNEY-CORE",
  UACR: "KIDNEY-CORE",
  creatinine: "KIDNEY-CORE",
  "LDL-C": "HEART-CORE",
  "HDL-C": "HEART-CORE",
  triglyceride: "HEART-CORE",
};
