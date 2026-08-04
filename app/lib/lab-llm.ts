/**
 * 檢驗判讀：由 LLM 直接讀原始申報紀錄判斷異常。
 *
 * 為什麼是 LLM 而不是規則：健保申報的檢驗資料很髒。實測五位病人 9,001 筆紀錄，
 * 16.3% 的單位是 `無`／`NIL`／`N` 這類佔位字、16.1% 的值不是數字、29.1% 沒有可用
 * 參考值、還有亂碼項目名稱。參考值有 5 種寫法、值有 5 種形態。
 *
 * 更關鍵的是「不知道自己不知道」：開發過程中規則式解析連續踩了四個坑
 * （Sugar(One touch) 整批漏抓、`[7-25][7-25]` 被讀成 7~7、尿液 WBC 與血液 WBC
 * 併成同一項、eAG 換算值被當成實測血糖），每一個都是事後才發現，而其中一個是
 * 安靜地判錯而不是安靜地漏掉。3000 位病人不會有人去核對。
 *
 * 所以判定交給 LLM。程式只做一件不涉及判斷的事：**驗證它引用的數值與項目名稱
 * 確實出現在來源裡**。那是抄寫檢查，不是重新判讀——因為在這個量級，唯一比
 * 「漏掉」更糟的是「看起來合理但不存在的數字」。
 */

import { analyteForItemName } from "./lab-findings.ts";
import type { PatientFacts } from "./patient-facts.ts";

export const LAB_REVIEW_PROMPT = `你是協助整理檢驗報告的助手，讀者是忙碌的醫師。

輸入分兩部分：先是這位病人的基本資料（含性別 gender 與生日 birthday，以及已發生併發症 R 與風險預測 PR 的原始欄位），接著是健保申報檢驗紀錄原文，每一筆包含項目名稱、數值、單位與來源提供的參考值。

輸入不含用藥資料。不要推測或提及任何藥物。

請直接讀這些紀錄，判斷哪些項目異常，並整理成醫師 60 秒內看得完的形式。

**只列出與糖尿病長期照護有關的異常。**判斷標準有兩層，兩層都要通過：

第一層，這個異常要跟糖尿病有關——是糖尿病或其併發症造成的、會影響糖尿病治療決策、或會影響糖尿病用藥安全。包括血糖與糖化血色素、腎功能與尿液白蛋白、血脂、肝功能、電解質、與腎病變相關的貧血。

第二層，這個異常要能代表**持續的狀態**，而不是某一次急性事件的當下切片。這批紀錄沒有採檢日期，無法分辨一筆數值是本月測的還是兩年前住院時測的。因此只反映當下急性狀況的項目一律不列，即使數值再誇張：白血球與白血球分類、發炎指標、細菌培養、血液氣體與酸鹼、血液滲透壓、凝血功能。那些沒有時間點就無法判讀，列出來只會讓人誤以為是目前狀態。

其他與糖尿病無關的異常也不要列出：心肌指標、腫瘤標記、甲狀腺功能、與腎病變無關的血液學異常。醫師會另外看那些；放進這份報告只會讓真正要看的東西被淹沒。

判讀原則：
- 以每一筆自己帶的參考值為主要依據。參考值有多種寫法，例如上下限分放兩格、兩格各放整段區間、不等式、或純文字說明；也有很多筆根本沒有參考值。
- 糖尿病人的血糖與糖化血色素要用糖尿病控制目標判讀，不可直接套用健康人的參考範圍。空腹血糖目標 80–130 mg/dL、糖化血色素一般成人低於 7.0%（高齡者依健康狀態放寬）。
- 尿液檢查與血液檢查是不同東西。同名項目（例如 WBC、Glucose）出現在尿液與血液時，判讀依據完全不同，不可混為一談。
- 由 HbA1c 換算出來的估計平均血糖（eAG）不是實測血糖。
- 資料很髒。單位可能是「無」「NIL」這種佔位字、值可能是文字或陰陽性符號、項目名稱可能有亂碼。看不懂的就說看不懂，不要硬猜。

嚴格限制：
- 只能使用輸入中實際出現的項目名稱與數值。每一個數值都會被逐一比對來源，寫出來源沒有的數字會被標記出來。
- worst 欄位只放一個數值。把兩個值寫成一個字串會讓比對失敗，該筆會被標記為不可信。
- 半定量與定性結果（例如尿蛋白 3+、潛血 4+、(-)、Negative）也要判讀，不要因為不是數字就略過。
- 參考值若依年齡或性別分層（例如 [0-14d] … [15-30d] … [≧18y]M 4-5.52 F 3.78-4.99 這種寫法），必須依開頭基本資料的 gender 與 birthday 算出本人的年齡層與性別，取對應的那一段判讀，不要用第一段，也不要兩段都列。判讀理由中要寫出你用的是哪一段。
- 參考值若標註修訂日期（例如「2019/7/1起 ≧18years 變更為 …」），一律以修訂後的區間為準。
- 不得推測診斷，不得提出處置建議。
- 這些紀錄只有費用年月、沒有採檢日期，不得敘述趨勢、先後順序或「最近一次」。
- 數值可能來自兩年前的急性事件，不得當成目前狀態。
- 若某一組看起來是急性事件、檢體條件或資料標示問題而非臨床發現，就直說，不要硬掰意義。

輸出格式：只輸出一個 JSON 物件，不要加說明文字或程式碼圍籬。

{
  "abnormal": [
    {
      "item": "項目名稱，逐字照抄",
      "worst": "最偏離的那一個數值，逐字照抄。只放一個值，不要寫成「A (high) / B (low)」，高低都有時把較嚴重的放這裡、另一個放 worst_other",
      "worst_other": "另一個方向的極值，沒有就填空字串",
      "unit": "單位，沒有就填空字串",
      "reference": "該筆的參考值原文",
      "direction": "high | low | both",
      "why": "為什麼判為異常，30 字以內"
    }
  ],
  "groups": [
    { "system": "系統名稱", "items": ["項目名稱"], "pattern": "一句話描述整體型態，並說明它與糖尿病的關聯" }
  ],
  "worth_a_look": ["值得醫師優先看的組合與理由，每則 60 字以內"],
  "data_quality_notes": ["讀的過程中發現的資料品質問題，每則 60 字以內；沒有則留空陣列"]
}`;

export type LabAbnormal = {
  item: string;
  worst: string;
  worstOther: string;
  unit: string;
  reference: string;
  direction: string;
  why: string;
};

export type LabReview = {
  abnormal: LabAbnormal[];
  groups: Array<{ system: string; items: string[]; pattern: string }>;
  worth_a_look: string[];
  data_quality_notes: string[];
};

export type LabReviewCheck = {
  review: LabReview;
  /** 引用了來源中找不到的數值 */
  unverifiedValues: LabAbnormal[];
  /** 引用了來源中沒有的項目名稱 */
  unknownItems: string[];
  /** 來源中實際存在的檢驗筆數，用來說明判讀涵蓋範圍 */
  sourceRecords: number;
};

function numeric(raw: string): string | null {
  const match = String(raw).trim().match(/-?\d+(?:\.\d+)?/);
  return match ? String(Number(match[0])) : null;
}

/**
 * 交給判讀器的輸入：基本資料 + 檢驗紀錄，**不含用藥**。
 *
 * 基本資料必須帶：這批資料的參考值是分層的，例如
 * `[≧18y]M 4-5.52 F 3.78-4.99`。不知道年齡與性別就選不出該用哪一段，
 * 而 prompt 又要求它選——先前是切在【檢驗與檢查紀錄】，把人口學資料
 * 整塊切掉了，等於下了一條做不到的指令。
 *
 * 用藥刻意不帶：metformin×eGFR 這類連動已經是規則表裡的確定性判定且附出處，
 * 讓判讀器也看到藥會產出第二份同主題意見而無仲裁機制；而且申報用藥可能
 * 停在兩年前，會誘導它推理「目前療法」——那正是 prompt 禁止的事。
 * 用藥段也是整份輸入最大的一塊（實測一位病人佔 93%）。
 */
export function labSectionOf(llmText: string): string {
  const start = llmText.indexOf("【檢驗與檢查紀錄】");
  if (start === -1) return "";
  const end = llmText.indexOf("【其他來源的非空紀錄】", start);
  const labs = llmText.slice(start, end === -1 ? undefined : end);

  // 用藥紀錄之前的所有區塊：基本資料、DCSI 與 R/PR、資料來源概況。
  const headerEnd = llmText.indexOf("【用藥紀錄】");
  const header = headerEnd === -1 ? "" : llmText.slice(0, headerEnd).trimEnd();
  return header ? `${header}\n\n${labs}` : labs;
}

/**
 * 解析並驗證 LLM 的判讀。
 *
 * 刻意**不刪除**它判定的異常——判定是它的職責，程式不覆寫。
 * 但引用不存在的數值或項目會被標記出來，讓醫師知道哪幾筆不可信。
 */
export function parseLabReview(raw: string, facts: PatientFacts): LabReviewCheck {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first === -1 || last <= first) throw new Error("檢驗判讀器沒有回傳可解析的 JSON。");
    parsed = JSON.parse(candidate.slice(first, last + 1));
  }
  const record = (parsed ?? {}) as Record<string, unknown>;

  const strings = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item) => typeof item === "string").map(String) : [];

  const abnormal: LabAbnormal[] = (Array.isArray(record.abnormal) ? record.abnormal : [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      item: String(item.item ?? "").trim(),
      worst: String(item.worst ?? "").trim(),
      worstOther: String(item.worst_other ?? "").trim(),
      unit: String(item.unit ?? "").trim(),
      reference: String(item.reference ?? "").trim(),
      direction: String(item.direction ?? "").trim(),
      why: String(item.why ?? "").trim(),
    }))
    .filter((item) => item.item);

  // 來源中實際存在的項目名稱與數值
  const sourceItems = new Set(facts.labItems.map((item) => item.itemName));
  const sourceValues = new Set<string>();
  let sourceRecords = 0;
  for (const item of facts.labItems) {
    for (const value of item.rawValues) {
      sourceRecords += 1;
      const n = numeric(value);
      if (n !== null) sourceValues.add(n);
    }
  }

  // 只檢查「有解析出數字」的引用。定性結果（3+、(-)、Negative）沒有數字可比，
  // 不能因此判為不可信——那是判讀器的職責範圍，不是抄寫問題。
  const unverifiedValues = abnormal.filter((item) => {
    for (const field of [item.worst, item.worstOther]) {
      if (!field) continue;
      const n = numeric(field);
      if (n !== null && !sourceValues.has(n)) return true;
    }
    return false;
  });
  const unknownItems = [...new Set(abnormal.map((item) => item.item).filter((name) => !sourceItems.has(name)))];

  return {
    review: {
      abnormal,
      groups: (Array.isArray(record.groups) ? record.groups : [])
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => ({
          system: String(item.system ?? "").trim(),
          items: (Array.isArray(item.items) ? item.items : []).map(String),
          pattern: String(item.pattern ?? "").trim(),
        }))
        .filter((item) => item.system),
      worth_a_look: strings(record.worth_a_look),
      data_quality_notes: strings(record.data_quality_notes),
    },
    unverifiedValues,
    unknownItems,
    sourceRecords,
  };
}

/**
 * @param alreadyShown 上一區已經逐條判定過的核心指標，這裡不重複列。
 */
export function formatLabReview(check: LabReviewCheck, alreadyShown: Set<string> = new Set()): string {
  const { review } = check;
  const lines: string[] = [];
  const shown = review.abnormal.filter((item) => {
    const analyte = analyteForItemName(item.item, item.unit || null);
    return !(analyte && alreadyShown.has(analyte));
  });
  lines.push(
    `  以下由輔助判讀器讀取 ${check.sourceRecords} 筆原始紀錄判定，只列與糖尿病相關且非急性事件當下的異常。`,
  );

  if (shown.length) {
    for (const item of shown) {
      const unit = item.unit ? ` ${item.unit}` : "";
      const other = item.worstOther ? `／另一端 ${item.worstOther}` : "";
      const flag = check.unverifiedValues.includes(item) ? "  ⚠ 此數值在來源中找不到" : "";
      lines.push(`  ${item.item}：${item.worst}${unit}${other}（參考 ${item.reference || "來源未提供"}）${item.why ? `｜${item.why}` : ""}${flag}`);
    }
  } else {
    lines.push("  （無其他與糖尿病相關的異常）");
  }

  for (const group of review.groups) {
    lines.push(`  ${group.system}：${group.pattern}`);
  }

  if (review.worth_a_look.length) {
    lines.push("  值得優先看：");
    for (const item of review.worth_a_look) lines.push(`    - ${item}`);
  }

  if (review.data_quality_notes.length) {
    lines.push("  判讀器提到的資料品質問題：");
    for (const item of review.data_quality_notes) lines.push(`    - ${item}`);
  }

  if (check.unverifiedValues.length || check.unknownItems.length) {
    lines.push("  ⚠ 抄寫檢查：");
    if (check.unverifiedValues.length) {
      lines.push(`    ${check.unverifiedValues.length} 筆引用的數值在來源中找不到（已於上方逐筆標示）。`);
    }
    if (check.unknownItems.length) {
      lines.push(`    來源沒有這些項目名稱：${check.unknownItems.join("、")}`);
    }
  }

  return lines.join("\n");
}
