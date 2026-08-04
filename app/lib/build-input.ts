/**
 * 組裝送給 Gemini 的輸入，並回報實際組出了什麼。
 *
 * 硬規則：**絕不截斷**。超過上限時由 blockers 擋下並說明超出多少，
 * 不在這裡偷偷切掉——被截斷的病人資料不會有任何症狀。
 */

import { charCount, estimateTokens, type TokenCount } from "./tokens.ts";

export type InputPart = {
  label: string;
  chars: number;
  tokens: number;
  /** 這一段的 token 是估算還是實測 */
  method: TokenCount["method"];
};

export type ComposedInput = {
  /** 送給 Gemini 的 user input（不含 system prompt） */
  text: string;
  /** system prompt，單獨計算 */
  systemPrompt: string;
  parts: InputPart[];
  totalChars: number;
  totalTokens: number;
};

/**
 * 一次按下會並行送出三個請求，估算必須是三者的總和。
 * 先前只算了模組挑選那一次，把實際成本低估了一半以上。
 */
function part(label: string, text: string, count?: TokenCount): InputPart {
  const resolved = count ?? { tokens: estimateTokens(text), method: "estimate" as const };
  return { label, chars: charCount(text), tokens: resolved.tokens, method: resolved.method };
}

export function buildRunInput(args: {
  selectorPrompt: string;
  factsText: string;
  labReviewPrompt: string;
  labText: string;
  narrativePrompt: string;
  narrativeText: string;
}): ComposedInput {
  const calls = [
    { label: "① 模組挑選：system prompt", text: args.selectorPrompt },
    { label: "① 模組挑選：病人事實摘要", text: args.factsText },
    { label: "② 檢驗判讀：system prompt", text: args.labReviewPrompt },
    { label: "② 檢驗判讀：檢驗紀錄", text: args.labText },
    { label: "③ 檢驗敘述：system prompt", text: args.narrativePrompt },
    { label: "③ 檢驗敘述：檢驗紀錄與缺檢清單", text: args.narrativeText },
  ];
  const parts = calls.map((item) => part(item.label, item.text));
  return {
    text: calls.map((item) => item.text).join("\n\n"),
    systemPrompt: args.selectorPrompt,
    parts,
    totalChars: parts.reduce((sum, item) => sum + item.chars, 0),
    totalTokens: parts.reduce((sum, item) => sum + item.tokens, 0),
  };
}

export function formatComposition(input: ComposedInput): string {
  return input.parts
    .map((item) => `${item.label}：${item.chars.toLocaleString("zh-TW")} 字／約 ${item.tokens.toLocaleString("zh-TW")} tokens`)
    .join("\n");
}
