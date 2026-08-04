/**
 * 「為什麼現在不能執行」。
 *
 * 設計重點：按鈕變灰不算說明。每個 blocker 都要能回答兩件事——
 * 發生什麼事，以及使用者接下來要做什麼。`hard` 才會讓按鈕停用；
 * 非 hard 的是警告，仍然可以送出。
 */

export type Blocker = {
  code: string;
  message: string;
  howToFix: string;
  hard: boolean;
};

export type RunState = {
  /** 使用者貼上或上傳的原始內容 */
  rawInput: string;
  /** 原始內容是否為可解析的 JSON */
  parsedJson: boolean;
  model: string;
  apiKey: string;
  /** GitHub Pages 版沒有伺服器可以代填金鑰 */
  requiresClientKey: boolean;
  totalTokens: number;
  tokenLimit: number;
};

export function runBlockers(state: RunState): Blocker[] {
  const blockers: Blocker[] = [];

  if (!state.rawInput.trim()) {
    blockers.push({
      code: "no-input",
      message: "還沒有病人資料。",
      howToFix: "上傳健保申報 JSON、貼上 JSON 內容，或按「載入去識別示範」。",
      hard: true,
    });
  } else if (!state.parsedJson) {
    blockers.push({
      code: "not-json",
      message: "這份內容不是可解析的 JSON。",
      howToFix:
        "這條流程需要結構化欄位（R／PR／CKD／檢驗紀錄）才能判定主題與門檻，純文字無法使用。請改上傳原始 JSON。",
      hard: true,
    });
  }

  if (!state.model.trim()) {
    blockers.push({
      code: "no-model",
      message: "沒有選擇模型。",
      howToFix: "在下方選一個模型，或填入自訂模型 ID。",
      hard: true,
    });
  }

  if (state.requiresClientKey && !state.apiKey.trim()) {
    blockers.push({
      code: "no-key",
      message: "這個版本需要在頁面輸入 Gemini API 金鑰。",
      howToFix: "在下方貼上金鑰。金鑰只留在這一頁的記憶體，重新整理即清除。",
      hard: true,
    });
  }

  if (state.totalTokens > state.tokenLimit) {
    blockers.push({
      code: "over-limit",
      message: `輸入約 ${state.totalTokens.toLocaleString("zh-TW")} tokens，超過模型上限 ${state.tokenLimit.toLocaleString("zh-TW")}。`,
      howToFix: "本工具不會自動截斷病人資料。請改用可接受更長輸入的模型，或減少送入的紀錄。",
      hard: true,
    });
  }

  return blockers;
}

export function hasHardBlocker(blockers: Blocker[]): boolean {
  return blockers.some((item) => item.hard);
}
