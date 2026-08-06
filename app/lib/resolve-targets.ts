/**
 * 第二層：把門檻值規則套到病人事實上，產出個別化目標。
 *
 * 這一層完全由程式決定，LLM 不參與。設計原則是**寧可說不知道，不要猜**：
 * 指引的高齡放寬需要「健康狀態」分級，而申報資料判定不了認知功能與預期餘命，
 * 因此這裡只輸出候選目標並標記需要醫療團隊確認，不自行分級。
 */

import { GUIDELINE_RULES, RULES_BY_ID, citationText, type GuidelineRule } from "./guideline-rules.ts";
import { kidneyLabEvidence } from "./lab-findings.ts";
import type { PatientFacts } from "./patient-facts.ts";

export type ResolvedTarget = {
  metric: string;
  /** 已解出的目標值；無法解出時為 null。 */
  value: string | null;
  ruleId: string | null;
  reason: string;
  /** 需要醫療團隊確認才能定案 */
  needsClinicianConfirmation: boolean;
  citation: string | null;
};

export type SafetyFlag = {
  code: string;
  severity: "info" | "attention" | "urgent";
  message: string;
  ruleId: string | null;
  citation: string | null;
};

export type ResolvedPlanTargets = {
  targets: ResolvedTarget[];
  safetyFlags: SafetyFlag[];
  /** 因為資料不足而無法判定的項目 */
  undetermined: string[];
};

function rule(id: string): GuidelineRule {
  const found = RULES_BY_ID.get(id);
  if (!found) throw new Error(`規則不存在：${id}`);
  return found;
}

function target(metric: string, ruleId: string, reason: string, needsConfirm = false): ResolvedTarget {
  const r = rule(ruleId);
  return {
    metric,
    value: r.statement,
    ruleId,
    reason,
    needsClinicianConfirmation: needsConfirm,
    citation: citationText(r),
  };
}

function positiveComplications(facts: PatientFacts): number[] {
  return facts.existingComplications.filter((item) => (item.value ?? 0) > 0).map((item) => Number(item.code.slice(1)));
}

export function resolveTargets(
  facts: PatientFacts,
  /**
   * 已發生併發症的項目數，由 decideTopics 提供。自己再數一次會漏掉
   * CKD 旗標驅動的腎臟判定，導致同一份報告出現兩個不同的數字。
   */
  establishedCount?: number,
): ResolvedPlanTargets {
  const targets: ResolvedTarget[] = [];
  const safetyFlags: SafetyFlag[] = [];
  const undetermined: string[] = [];

  const positives = positiveComplications(facts);
  const establishedTotal = establishedCount ?? positives.length;
  const hasCardiovascular = positives.includes(5);
  const hasCerebrovascular = positives.includes(2);
  const hasKidney = positives.includes(3) || (facts.comorbidityFlags.ckd.known && facts.comorbidityFlags.ckd.value);
  const age = facts.ageYears.known ? facts.ageYears.value : null;
  const elderly = age !== null && age >= 65;

  /*
   * 兩型的門檻不一樣（餐後血糖第 2 型 80–160、第 1 型成人低於 180），
   * 而規則表的預設來源是第 2 型指引，出處字串就寫著「第2型」。
   * 型別判不出來時仍走第 2 型那套——申報資料裡絕大多數是第 2 型，
   * 而不給任何目標會讓報告空掉——但這個假設必須寫進報告，不能靜默套用。
   */
  const isType1 = facts.diabetesType.verdict === "type1-confirmed";
  const t = (t1: string, t2: string) => (isType1 ? t1 : t2);

  // ── 血糖 ──
  if (!elderly) {
    targets.push(
      target(
        "糖化血色素",
        t("t1-hba1c-general", "hba1c-general"),
        age === null ? "年齡未知，先套用一般成人通則" : `年齡 ${age} 歲，未達 65 歲高齡放寬條件`,
        age === null,
      ),
    );
    targets.push(target("空腹血糖", t("t1-fpg-adult", "fpg-general"), "一般成人通則"));
    targets.push(target("餐後血糖", t("t1-ppg-adult", "ppg-general"), "一般成人通則"));
  } else {
    // 指引的三級放寬需要健康狀態分級；申報資料無法判定認知功能與預期餘命。
    const burden = `DCSI ${facts.dcsiTotal.known ? facts.dcsiTotal.value : "未知"}，已發生併發症 ${establishedTotal} 項`;
    targets.push({
      metric: "糖化血色素",
      value: null,
      ruleId: null,
      reason: `年齡 ${age} 歲屬高齡，指引依健康狀態分為三級（低於 7–7.5%／低於 8.0%／不以糖化血色素為唯一目標）。健康狀態需評估共病、認知與身體機能及預期餘命，申報資料無法判定。目前可得的負擔指標：${burden}。`,
      needsClinicianConfirmation: true,
      citation: citationText(rule("hba1c-elderly-intermediate")),
    });
    undetermined.push("高齡者的健康狀態分級，因此糖化血色素、空腹與餐後血糖目標都需醫療團隊定案。");
  }

  if (facts.comorbidityFlags.ckd.known && facts.comorbidityFlags.ckd.value) {
    const r = rule("hba1c-unreliable");
    safetyFlags.push({
      code: "hba1c-reliability",
      severity: "attention",
      message: r.statement,
      ruleId: r.id,
      citation: citationText(r),
    });
  }

  // ── 血壓 ──
  /*
   * 指引表六寫的是「高心血管疾病風險**及蛋白尿**患者 <130/80」。
   * 原本只看已發生的心血管／腦血管疾病，於是一位只有蛋白尿的病人會拿到
   * 一般目標 140/90——而加嚴血壓正是延緩腎病變惡化的手段。
   */
  const hasProteinuria = hasKidney || kidneyLabEvidence(facts).triggered;
  const intensiveBp = hasCardiovascular || hasCerebrovascular || hasProteinuria;
  const bpReason = hasCardiovascular || hasCerebrovascular
    ? `資料顯示已有${hasCardiovascular ? "心血管" : ""}${hasCardiovascular && hasCerebrovascular ? "與" : ""}${hasCerebrovascular ? "腦血管" : ""}疾病，屬可考慮加嚴的族群；是否可耐受需醫療團隊評估。`
    : "資料顯示有腎臟問題或蛋白尿，指引對這一族群建議加嚴血壓目標；是否可耐受需醫療團隊評估。";
  if (intensiveBp) {
    targets.push(
      target(
        "血壓",
        t("t1-bp-target-intensive", "bp-target-intensive"),
        bpReason,
        true,
      ),
    );
    if (elderly) {
      safetyFlags.push({
        code: "orthostatic-risk",
        severity: "attention",
        message: "高齡合併心血管或腦血管疾病，降壓過於嚴格可能增加姿勢性低血壓與跌倒風險，血壓目標需個別化。",
        ruleId: t("t1-bp-target-intensive", "bp-target-intensive"),
        citation: citationText(rule(t("t1-bp-target-intensive", "bp-target-intensive"))),
      });
    }
  } else {
    targets.push(target("血壓", t("t1-bp-target-general", "bp-target-general"), "未見已發生的心血管或腦血管疾病，也未見腎臟問題或蛋白尿，套用一般目標"));
  }

  // ── 血脂 ──
  if (hasCardiovascular || hasCerebrovascular) {
    targets.push(target("低密度脂蛋白膽固醇", "ldl-cvd", "資料顯示已有心血管或腦血管疾病"));
  } else {
    targets.push(target("低密度脂蛋白膽固醇", "ldl-general", "一般糖尿病人通則"));
  }
  targets.push(
    target(
      "高密度脂蛋白膽固醇",
      "hdl-target",
      facts.sex.known ? facts.sex.value : "性別未知，兩個目標值都列出",
      !facts.sex.known,
    ),
  );
  targets.push(target("三酸甘油酯", "tg-target", "一般糖尿病人通則"));

  // ── 腎臟與用藥安全 ──
  // 腎臟追蹤與 metformin 的腎功能安全性都改由 lab-findings 依「實際數值」判定，
  // 這裡不再產生通用版旗標——兩者並列會讓同一條規則在報告裡出現兩次，
  // 而且通用版還會寫「實際數值需由檢驗結果確認」，但數值就在旁邊。
  const egfrItem = facts.labItems.find((item) => /eGFR/i.test(item.itemName));
  const usesMetformin = facts.medicationClasses.some((item) => /抗糖尿病|metformin|雙胍/i.test(item.atcClass));
  if (usesMetformin && !egfrItem) {
    undetermined.push(
      "資料中有抗糖尿病藥物的申報紀錄，但沒有可用的 eGFR 數值，因此無法依指引判定 metformin 的腎功能安全性。",
    );
  }
  if (hasKidney && !egfrItem) {
    undetermined.push("資料標記腎臟相關問題，但沒有可用的 eGFR 或 UACR 數值可供判定追蹤頻率。");
  }

  // ── 資料層限制 ──
  if (!facts.labHasDrawDates && facts.labRecordCount > 0) {
    undetermined.push(
      "檢驗資料只有費用年月、沒有採檢日，因此無法判定任何一項是否為「最近一次」，也無法建立趨勢。",
    );
  }
  if (facts.diabetesType.verdict !== "type1-confirmed" && facts.diabetesType.verdict !== "type2-confirmed") {
    undetermined.push(
      `糖尿病類型判定為 ${facts.diabetesType.verdict}，上列目標一律套用第 2 型指引的數值。兩型的數值有實際差異（例如餐後血糖第 2 型為 80–160 mg/dL、第 1 型成人為低於 180 mg/dL），若這位病人是第 1 型，餐後血糖與追蹤起始時機都需重新判定。`,
    );
  }
  if (isType1) {
    undetermined.push(
      "已依申報診斷碼判定為第 1 型，目標與追蹤間隔改用第 1 型指引。第 1 型的腎臟、眼底與神經篩檢起始時機取決於發病年份與年齡（發病滿 5 年、青春期或大於 10 歲），而申報資料判定不了發病年份，因此起始時機需醫療團隊確認。",
    );
  }

  return { targets, safetyFlags, undetermined };
}

/** 只回傳可以寫進病人可見內容的規則。 */
export function patientFacingRules(): GuidelineRule[] {
  return GUIDELINE_RULES.filter((rule) => rule.patientFacing);
}
