/**
 * 組裝送給 Gemini 的輸入，並回報「實際」組出了什麼。
 *
 * 兩條硬規則：
 *   1. 絕不截斷。超過上限時由 blockers 擋下並說明超出多少，不在這裡偷偷切掉。
 *   2. `guidelineIncluded` 是實際組裝的結果，不是使用者的勾選意圖。
 *      使用者選了 B 但指引是空的，這裡回 false，UI 就會顯示「本次不會帶入」。
 */

import { charCount, estimateTokens, guidelineTokens, type TokenCount } from "./tokens.ts";

export const GUIDELINE_HEADING = "【參考指引全文：2022第2型糖尿病臨床照護指引】";

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
  /** 是否有任何一段是估算值 */
  hasEstimate: boolean;
  guidelineIncluded: boolean;
  /** 使用者選了帶入、但實際上沒有帶入 */
  guidelineRequestedButMissing: boolean;
};

function part(label: string, text: string, count?: TokenCount): InputPart {
  const resolved = count ?? { tokens: estimateTokens(text), method: "estimate" as const };
  return { label, chars: charCount(text), tokens: resolved.tokens, method: resolved.method };
}

function compose(
  systemPrompt: string,
  bodyParts: Array<{ label: string; text: string; count?: TokenCount }>,
  guideline: { include: boolean; text: string },
): ComposedInput {
  const guidelineText = guideline.text ?? "";
  const guidelineUsable = guidelineText.trim().length > 0;
  const guidelineIncluded = guideline.include && guidelineUsable;

  const bodySegments = bodyParts.map((item) => item.text);
  const text = guidelineIncluded
    ? `${bodySegments.join("\n\n")}\n\n${GUIDELINE_HEADING}\n${guidelineText}`
    : bodySegments.join("\n\n");

  const parts: InputPart[] = [
    part("system prompt", systemPrompt),
    ...bodyParts.map((item) => part(item.label, item.text, item.count)),
  ];
  if (guidelineIncluded) {
    parts.push(part("指引全文", guidelineText, guidelineTokens(guidelineText)));
  }

  const totalChars = parts.reduce((sum, item) => sum + item.chars, 0);
  const totalTokens = parts.reduce((sum, item) => sum + item.tokens, 0);

  return {
    text,
    systemPrompt,
    parts,
    totalChars,
    totalTokens,
    hasEstimate: parts.some((item) => item.method === "estimate"),
    guidelineIncluded,
    guidelineRequestedButMissing: guideline.include && !guidelineUsable,
  };
}

export type GenerationInputArgs = {
  systemPrompt: string;
  patientText: string;
  includeGuideline: boolean;
  guidelineText: string;
};

export function buildGenerationInput(args: GenerationInputArgs): ComposedInput {
  return compose(
    args.systemPrompt,
    [{ label: "病人資料", text: args.patientText }],
    { include: args.includeGuideline, text: args.guidelineText },
  );
}

export type EvalInputArgs = GenerationInputArgs & { report: string };

export function buildEvalInput(args: EvalInputArgs): ComposedInput {
  return compose(
    args.systemPrompt,
    [
      { label: "病人資料", text: `【病人資料】\n${args.patientText}` },
      { label: "待評估報告", text: `【待評估報告】\n${args.report}` },
    ],
    { include: args.includeGuideline, text: args.guidelineText },
  );
}

/** arm C：模組選擇器的輸入只有精簡事實，沒有原始申報明細，也沒有指引。 */
export function buildSelectorInput(args: { systemPrompt: string; factsText: string }): ComposedInput {
  return compose(args.systemPrompt, [{ label: "病人事實摘要", text: args.factsText }], { include: false, text: "" });
}

export function formatComposition(input: ComposedInput): string {
  return input.parts
    .map((item) => `${item.label}：${item.chars.toLocaleString("zh-TW")} 字／約 ${item.tokens.toLocaleString("zh-TW")} tokens`)
    .join("\n");
}
