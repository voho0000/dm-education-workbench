/**
 * 「為什麼現在不能生成／稽核」。
 *
 * 設計重點：按鈕變灰不算說明。每個 blocker 都要能回答兩件事——
 * 發生什麼事，以及使用者接下來要做什麼。`hard` 才會讓按鈕停用；
 * 非 hard 的是警告，仍然可以送出。
 */

import type { ArmId } from "./arms.ts";

export type Blocker = {
  code: string;
  message: string;
  howToFix: string;
  hard: boolean;
};

export type WorkbenchState = {
  arm: ArmId;
  llmText: string;
  /** 使用者已上傳原始資料但還沒整理 */
  rawInput: string;
  generatorPrompt: string;
  evalPrompt: string;
  report: string;
  model: string;
  apiKey: string;
  /** GitHub Pages 版沒有伺服器可以代填金鑰 */
  requiresClientKey: boolean;
  guidelineText: string;
  totalTokens: number;
  tokenLimit: number;
};

function tokenBlocker(state: WorkbenchState): Blocker | null {
  if (state.totalTokens <= state.tokenLimit) return null;
  const over = state.totalTokens - state.tokenLimit;
  return {
    code: "token-limit",
    message: `估計輸入約 ${state.totalTokens.toLocaleString("zh-TW")} tokens，超過模型上限 ${state.tokenLimit.toLocaleString("zh-TW")} tokens 約 ${over.toLocaleString("zh-TW")} tokens。`,
    howToFix: "本工具不會自動截斷指引或病人資料。請改選不帶入指引的 A，或改用輸入上限更大的模型。",
    hard: true,
  };
}

function sharedBlockers(state: WorkbenchState): Blocker[] {
  const blockers: Blocker[] = [];

  if (!state.model) {
    blockers.push({
      code: "no-model",
      message: "還沒選定 Gemini 模型。",
      howToFix: "請在模型下拉選單選擇，或在自訂欄位輸入完整的模型 ID。",
      hard: true,
    });
  }

  if (state.requiresClientKey && !state.apiKey.trim()) {
    blockers.push({
      code: "no-api-key",
      message: "這個版本沒有伺服器可以代為保管金鑰，必須在頁面輸入 Gemini 金鑰。",
      howToFix: "請在上方「Gemini 臨時存取金鑰」貼上金鑰。重新整理頁面即清除，不會寫入任何儲存空間。",
      hard: true,
    });
  }

  if (state.arm === "B" && !state.guidelineText.trim()) {
    blockers.push({
      code: "guideline-missing",
      message: "已選 B（帶入指引全文），但目前沒有載入任何指引 TXT。",
      howToFix: "請先按「載入指引 TXT」選擇完整的指引檔案；否則請改選 A，以免以為帶入了其實沒有。",
      hard: true,
    });
  }

  return blockers;
}

export function generateBlockers(state: WorkbenchState): Blocker[] {
  const blockers: Blocker[] = [];

  if (!state.llmText.trim()) {
    blockers.push(
      state.rawInput.trim()
        ? {
            code: "not-formatted",
            message: "已經有原始病人資料，但還沒整理成 LLM 好讀文字。",
            howToFix: "請按上方步驟 01 的「整理為 LLM 好讀文字」。更換病人檔案後也需要重新整理一次。",
            hard: true,
          }
        : {
            code: "no-patient-data",
            message: "還沒有病人資料。",
            howToFix: "請在步驟 01 上傳 JSON／TXT、貼上文字，或按「載入去識別示範」，再按「整理為 LLM 好讀文字」。",
            hard: true,
          },
    );
  }

  if (state.arm !== "C" && !state.generatorPrompt.trim()) {
    blockers.push({
      code: "empty-generator-prompt",
      message: "生成用的 system prompt 是空白的。",
      howToFix: "請在下方貼上 prompt，或按「恢復工作台預設」載回預設版本。",
      hard: true,
    });
  }

  blockers.push(...sharedBlockers(state));

  const tokens = tokenBlocker(state);
  if (tokens) blockers.push(tokens);

  return blockers;
}

export function evalBlockers(state: WorkbenchState): Blocker[] {
  const blockers: Blocker[] = [];

  if (!state.llmText.trim()) {
    blockers.push({
      code: "no-patient-data",
      message: "稽核需要 LLM 好讀病人資料，目前是空的。",
      howToFix: "請先完成步驟 01 的整理。",
      hard: true,
    });
  }

  if (!state.report.trim()) {
    blockers.push({
      code: "no-report",
      message: "還沒有可稽核的報告。",
      howToFix: "請先執行「生成衛教報告」，或直接把要稽核的報告貼進報告欄位。",
      hard: true,
    });
  }

  if (!state.evalPrompt.trim()) {
    blockers.push({
      code: "empty-eval-prompt",
      message: "稽核用的 system prompt 是空白的。",
      howToFix: "請在下方貼上 prompt，或按「恢復工作台預設」載回預設版本。",
      hard: true,
    });
  }

  blockers.push(...sharedBlockers(state));

  const tokens = tokenBlocker(state);
  if (tokens) blockers.push(tokens);

  return blockers;
}

export function hasHardBlocker(blockers: Blocker[]): boolean {
  return blockers.some((item) => item.hard);
}
