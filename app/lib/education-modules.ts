/**
 * 併發症主題衛教模組（arm C）。
 *
 * 內容來源：`糖尿病衛教固定模組_R1-R6_草案.md` v0.1。
 *
 * 與草案的差異（結構調整，未增刪臨床訊息）：草案的每個模組都設計成可以單獨閱讀，
 * 所以每一份都自帶「照顧血糖血壓血脂」「戒菸」「定期檢查」「規律用藥」與足部照護。
 * 實際把六個主題串成一份報告時，同一份裡「足部」出現 18 次、「戒菸」9 次，
 * 病人讀到第三段就會開始跳過。
 *
 * 因此這裡只保留**該疾病特有**的內容：
 *   - 通用照護移到 shared-care.ts，整份報告各講一次
 *   - 追蹤間隔由 guideline-rules 產生單一清單，不再用散文重複十次
 *   - 就醫警訊抽成 urgentSigns，集中成報告末尾的單一紅旗清單
 *
 * ⚠️ 狀態：DRAFT／尚未經醫療團隊核准／不得直接對病人使用。
 */

export const MODULE_CATALOG_VERSION = "draft-0.3";
export const MODULE_CATALOG_APPROVED = false;

export type DiabetesTypeGate = "any" | "type1-confirmed" | "type2-confirmed";

export type EducationModule = {
  id: string;
  /** 內部主題代碼，不得顯示於病人版。 */
  topic: "BASE" | "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "TYPE";
  title: string;
  appliesWhen: string;
  typeGate: DiabetesTypeGate;
  /** 由程式決定、LLM 不得選取 */
  autoOnly: boolean;
  /** 該疾病特有的說明與行動。通用內容不放這裡。 */
  patientText: string;
  /** 需要立即或儘速就醫的情況；會被集中到報告末尾。 */
  urgentSigns?: string;
  /** 選到此模組時需要納入的共同區塊 */
  needsShared?: Array<"foot" | "smoking">;
};

export const EDUCATION_MODULES: EducationModule[] = [
  {
    id: "BASE-01",
    topic: "BASE",
    title: "關於這份報告",
    appliesWhen: "每份報告固定顯示，由程式自動加入。",
    typeGate: "any",
    autoOnly: true,
    patientText: `這份內容是依報告產生當時可取得的既往健康資料整理，不會隨您之後的檢查、症狀或用藥變化自動更新。請先查看上方的「資料截至日期」；如果您最近的健康狀況已有改變，請以最新檢查結果及醫療團隊的評估為準。

本報告用來幫助您準備自我照護，不能取代診斷或處方。請勿只依本報告自行停藥、換藥、增減藥量或改變胰島素劑量。`,
  },
  {
    id: "TYPE-UNCLEAR",
    topic: "TYPE",
    title: "關於您的糖尿病類型",
    appliesWhen: "診斷碼、用藥或病史指向不一致，或無法確認類型時由程式自動加入。",
    typeGate: "any",
    autoOnly: true,
    patientText:
      "目前資料無法一致確認您的糖尿病類型。第一型與第二型糖尿病在胰島素使用、低血糖與生病期間的照護方式可能不同，請在下次回診時向醫師確認診斷類型及適合您的自我照護方式。",
  },
  {
    id: "EYE-CORE",
    topic: "R1",
    title: "眼睛與視力",
    appliesWhen: "R1 大於 0，或 PR1 為 1（適度介入）或 2（積極照護）。",
    typeGate: "any",
    autoOnly: false,
    patientText: `糖尿病可能影響眼底的小血管。早期視網膜病變常沒有不舒服，視力正常也不代表眼底正常，所以定期眼底檢查很重要。

1. 記下最近一次眼底或散瞳檢查的日期與結果。若只做過一般視力檢查，回診時確認是否也做了眼底檢查。
2. 計畫懷孕、已懷孕，或近期血糖快速改變時，請告知眼科與糖尿病照護團隊。`,
    urgentSigns: "突然看不見、視力快速下降，或突然出現明顯黑影、重影：當天儘速就醫。",
    needsShared: ["smoking"],
  },
  {
    id: "EYE-T1",
    topic: "R1",
    title: "第一型糖尿病眼底檢查補充",
    appliesWhen: "已選 EYE-CORE，且糖尿病類型已明確確認為第一型。",
    typeGate: "type1-confirmed",
    autoOnly: false,
    patientText: "第一型糖尿病在發病五年內，應完成第一次包含散瞳的完整眼科檢查。",
  },
  {
    id: "EYE-T2",
    topic: "R1",
    title: "第二型糖尿病眼底檢查補充",
    appliesWhen: "已選 EYE-CORE，且糖尿病類型已明確確認為第二型。",
    typeGate: "type2-confirmed",
    autoOnly: false,
    patientText:
      "第二型糖尿病在確診時可能已存在一段時間，因此診斷後應儘快完成第一次包含散瞳的完整眼科檢查。",
  },
  {
    id: "STROKE-CORE",
    topic: "R2",
    title: "腦血管",
    appliesWhen: "R2 大於 0，或 PR2 為 1（適度介入）或 2（積極照護）。",
    typeGate: "any",
    autoOnly: false,
    patientText: `血糖、血壓、血脂、吸菸與心律問題都可能影響腦血管。重點是持續管理可改善的因素，並讓自己和家人認得中風警訊。

1. 曾有短暫單側無力、嘴歪、說話不清、突然視力異常或走路不穩，即使症狀已消失也要儘速告訴醫師。
2. 若曾被告知有心房顫動或頸動脈問題，回診時確認是否需要進一步追蹤。`,
    urgentSigns:
      "記住「微笑、舉手、說你好」：微笑時臉部不對稱、雙手舉起時一側無力下垂，或說話突然不清楚，只要出現其中一項，就記下發生時間並立即撥打 119。不要等症狀自行消失，也不要自行開車就醫。",
    needsShared: ["smoking"],
  },
  {
    id: "KIDNEY-CORE",
    topic: "R3",
    title: "腎臟",
    appliesWhen: "R3 大於 0、CKD 欄位為 1、申報診斷碼有慢性腎臟病、檢驗證據達門檻，或 PR3 為 1（適度介入）或 2（積極照護）。",
    typeGate: "any",
    autoOnly: false,
    patientText: `糖尿病腎臟病變早期通常沒有症狀，不能只靠水腫或不舒服來判斷；要看尿液白蛋白／肌酸酐比值（UACR）、血清肌酸酐與腎絲球過濾率（eGFR）。

1. 看診、看牙或領藥時主動告知自己的腎功能狀況。
2. 不長期自行服用非處方消炎止痛藥，也不用成分不明的中草藥、保健品或偏方。這不代表要停用醫師開立的藥；處方調整由醫師決定。
3. 飲水量、鹽分、蛋白質與鉀的限制須依個人腎功能、心臟狀況與營養評估決定，不要自行套用網路上的腎臟飲食。`,
    urgentSigns:
      "尿量突然明顯變少、腳或臉突然腫起、呼吸變喘、持續噁心嘔吐或意識變得不清楚：儘速就醫；若呼吸困難或意識改變明顯，立即撥打 119。",
  },
  {
    id: "KIDNEY-T1",
    topic: "R3",
    title: "第一型糖尿病腎臟檢查補充",
    appliesWhen: "已選 KIDNEY-CORE，且糖尿病類型已明確確認為第一型。",
    typeGate: "type1-confirmed",
    autoOnly: false,
    patientText: "第一型糖尿病通常從發病五年後開始定期接受 UACR、血清肌酸酐與 eGFR 檢查。",
  },
  {
    id: "KIDNEY-T2",
    topic: "R3",
    title: "第二型糖尿病腎臟檢查補充",
    appliesWhen: "已選 KIDNEY-CORE，且糖尿病類型已明確確認為第二型。",
    typeGate: "type2-confirmed",
    autoOnly: false,
    patientText: "第二型糖尿病在診斷時就應開始接受 UACR、血清肌酸酐與 eGFR 檢查。",
  },
  {
    id: "NERVE-CORE",
    topic: "R4",
    title: "神經與感覺",
    appliesWhen: "R4 大於 0，或 PR4 為 1（適度介入）或 2（積極照護）。",
    typeGate: "any",
    autoOnly: false,
    patientText: `糖尿病神經病變可能出現麻木、刺痛、灼熱、疼痛、感覺變鈍或平衡變差，早期也可能沒有症狀。感覺變差時小傷口不容易被發現，所以麻木不等於沒問題。類似症狀也可能來自其他疾病或營養問題，需由醫療人員評估。

1. 不要因為腳不痛就忽略傷口，也不要用熱水、電毯或熱敷測試足部感覺。
2. 若出現姿勢性頭暈、心跳異常、反覆噁心或腹瀉便祕、排尿困難、性功能改變，或低血糖越來越沒有警訊，請告訴醫療團隊——這些可能和自主神經有關。
3. 不要自行長期服用止痛藥或神經痛藥物。`,
    urgentSigns: "新出現明顯無力、走路突然不穩，或足部有傷口、紅腫、化膿、發燒、明顯變色：儘速就醫。",
    needsShared: ["foot"],
  },
  {
    id: "NERVE-T1",
    topic: "R4",
    title: "第一型糖尿病神經檢查補充",
    appliesWhen: "已選 NERVE-CORE，且糖尿病類型已明確確認為第一型。",
    typeGate: "type1-confirmed",
    autoOnly: false,
    patientText: "第一型糖尿病在發病五年後開始每年評估；有症狀時不必等待滿五年，應提早提出。",
  },
  {
    id: "NERVE-T2",
    topic: "R4",
    title: "第二型糖尿病神經檢查補充",
    appliesWhen: "已選 NERVE-CORE，且糖尿病類型已明確確認為第二型。",
    typeGate: "type2-confirmed",
    autoOnly: false,
    patientText: "第二型糖尿病從診斷開始每年評估；若已有麻、痛、灼熱或感覺變差，請在回診時主動提出。",
  },
  {
    id: "HEART-CORE",
    topic: "R5",
    title: "心臟",
    appliesWhen: "R5 大於 0，或 PR5 為 1（適度介入）或 2（積極照護）。",
    typeGate: "any",
    autoOnly: false,
    patientText: `糖尿病常和高血壓、血脂異常、吸菸、腎功能問題與心血管疾病互相影響。保護心臟不是只看血糖。

1. 留意是否比以前容易喘、平躺時喘、腳腫、心悸、容易疲倦，或短時間內體重快速增加，並告訴醫療團隊。
2. 運動強度依體力、心臟狀況與醫療團隊建議逐步增加；活動時胸悶或喘就先停止並接受評估。`,
    urgentSigns:
      "突然胸悶或胸痛、喘不過氣、冒冷汗、噁心、頭暈或昏厥，或不尋常的背部疼痛併隨不適：立即撥打 119。不要自行開車，也不要嘗試以大力咳嗽取代就醫。",
    needsShared: ["smoking"],
  },
  {
    id: "LEG-CIRCULATION-CORE",
    topic: "R6",
    title: "下肢循環",
    appliesWhen: "R6 大於 0，或 PR6 為 1（適度介入）或 2（積極照護）。",
    typeGate: "any",
    autoOnly: false,
    patientText: `周邊動脈疾病是腿部與足部的動脈循環變差。可能沒有症狀，也可能走一段路後小腿痠痛、休息後改善，或足部冰冷、顏色變淡、傷口不易癒合。這和神經麻木不同，但兩者可能同時存在。

1. 留意走路時是否固定在相近距離出現小腿、臀部或大腿疼痛、休息後是否改善。把位置、距離與持續時間記下來，回診時提供。
2. 已有足部傷口、休息時也疼痛、明顯變色或疑似嚴重缺血時，先接受醫療評估再決定運動方式。
3. 不要自行購買抗血小板藥物。`,
    urgentSigns:
      "一隻腳突然劇烈疼痛、變得明顯冰冷或蒼白、發紫、麻木或無力：立即就醫。若有傷口、紅腫、流膿、異味或發燒，也要儘快就醫。",
    needsShared: ["foot", "smoking"],
  },
];

export const MODULE_BY_ID = new Map(EDUCATION_MODULES.map((item) => [item.id, item]));
