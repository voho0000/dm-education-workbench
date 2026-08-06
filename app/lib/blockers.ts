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
  /**
   * 從解析後的病人事實數出來的訊號量。JSON 解析得過不代表裡面有東西——
   * 空物件 {} 也是合法 JSON，而它會產出一份 1,900 字、看起來很正常的報告。
   * 未提供時（例如還沒解析完）不做這項判定。
   */
  signals?: {
    /** 申報紀錄裡認得出來的糖尿病與腎病變診斷碼數 */
    diagnosisCodes: number;
    /** 有值的 R／PR 欄位數 */
    riskFields: number;
    /** 檢驗紀錄筆數 */
    labRecords: number;
  };
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

  /*
   * 什麼訊號都沒有就擋下來。
   *
   * 門檻刻意設在「三種訊號全空」，而不是「一定要有診斷碼」：真實匯出可能
   * 缺 ICD 卻有 R／PR 或檢驗值，把那種病人擋掉比放行一份空檔更糟。
   * 全空的情況只有一種可能——檔案不是這條流程要的東西。
   */
  const signals = state.signals;
  if (state.parsedJson && signals) {
    const total = signals.diagnosisCodes + signals.riskFields + signals.labRecords;
    if (total === 0) {
      blockers.push({
        code: "no-clinical-signal",
        message: "這份 JSON 解析得過，但裡面沒有任何可用的臨床訊號：沒有診斷碼、沒有 R／PR 欄位、也沒有檢驗紀錄。",
        howToFix:
          "確認上傳的是健保申報的病人資料匯出檔。空的或欄位結構不同的檔案仍然是合法 JSON，照樣能組出一份看起來正常的報告，所以這裡直接擋下。",
        hard: true,
      });
    } else if (signals.diagnosisCodes === 0) {
      blockers.push({
        code: "no-diagnosis-code",
        message: "資料裡沒有糖尿病或腎病變的診斷碼。",
        howToFix:
          "糖尿病型別、腎病變與其他共病的判定都靠診斷碼，缺了它這幾項只能落回 R／PR 欄位或檢驗值。可以繼續產出，但報告會少掉這些依據。",
        hard: false,
      });
    }
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
