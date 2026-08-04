/**
 * 三種流程 arm，用於 token 與表現比較。
 *
 * A：現行流程，system prompt + 病人資料
 * B：現行流程，system prompt + 病人資料 + 指引全文（283,353 tokens）
 * C：模組選擇流程（草案）。LLM 只輸出 module_id 與理由，病人可見正文由程式以
 *    已核准固定文字組合。依 `糖尿病衛教固定模組_R1-R6_草案.md` 第十節設計。
 */

export type ArmId = "A" | "B" | "C";

export type ArmDefinition = {
  id: ArmId;
  label: string;
  description: string;
  /** 是否可以帶入指引全文 */
  usesGuideline: boolean;
  /** LLM 是否產生病人可見正文 */
  llmWritesPatientText: boolean;
};

export const ARMS: ArmDefinition[] = [
  {
    id: "A",
    label: "A｜現行流程・不帶入指引",
    description: "生成 LLM 收到 system prompt 與病人資料；不附指引全文。",
    usesGuideline: false,
    llmWritesPatientText: true,
  },
  {
    id: "B",
    label: "B｜現行流程・帶入指引全文",
    description: "生成與稽核都額外附上整份《2022第2型糖尿病臨床照護指引》。需先載入指引 TXT。",
    usesGuideline: true,
    llmWritesPatientText: true,
  },
  {
    id: "C",
    label: "C｜一鍵產出兩份報告（草案・未經醫療團隊核准）",
    description:
      "並行呼叫三次：模組挑選、檢驗判讀（進醫師版）、檢驗敘述（進病人版）。併發症主題與指引目標完全由程式判定，任何一次呼叫失敗都會退回程式輸出。",
    usesGuideline: false,
    llmWritesPatientText: false,
  },
];

export function armById(id: ArmId): ArmDefinition {
  const arm = ARMS.find((item) => item.id === id);
  if (!arm) throw new Error(`未知的流程 arm：${id}`);
  return arm;
}
