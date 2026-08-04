/**
 * Token 估算。
 *
 * 校準基準：《2022第2型糖尿病臨床照護指引》全文 TXT
 *   字元數 652,078（CJK 173,668／ASCII 非空白 276,717／空白 199,909／其他 1,784）
 *   Gemini 官方 countTokens = 283,353 tokens
 *   本公式估算 = 283,721，誤差 +0.13%
 *
 * 只有一個校準點，因此對「組成比例明顯不同」的文字（例如幾乎全中文的病人資料）
 * 誤差會大於此值。UI 一律標示為「估算」，需要精確值時請用 countTokens。
 */

export const GUIDELINE_KNOWN_CHARS = 652_078;
export const GUIDELINE_KNOWN_TOKENS = 283_353;

/** gemini-3.6-flash 的輸入上限。自訂模型時只作為參考值。 */
export const DEFAULT_INPUT_TOKEN_LIMIT = 1_048_576;

export type TokenCount = {
  tokens: number;
  /** estimate = 本公式推估；measured = Gemini countTokens 或已知實測值 */
  method: "estimate" | "measured";
};

export type CharBreakdown = {
  total: number;
  cjk: number;
  asciiVisible: number;
  whitespace: number;
  other: number;
};

function isCjk(codePoint: number): boolean {
  return (
    (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
    (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0x3000 && codePoint <= 0x303f) ||
    (codePoint >= 0xff00 && codePoint <= 0xffef)
  );
}

export function breakdownChars(text: string): CharBreakdown {
  let cjk = 0;
  let asciiVisible = 0;
  let whitespace = 0;
  let other = 0;
  let total = 0;

  for (const char of text) {
    total += 1;
    const codePoint = char.codePointAt(0) ?? 0;
    if (isCjk(codePoint)) cjk += 1;
    else if (codePoint < 128) {
      if (char === " " || char === "\t" || char === "\n" || char === "\r" || char === "\f" || char === "\v") whitespace += 1;
      else asciiVisible += 1;
    } else other += 1;
  }

  return { total, cjk, asciiVisible, whitespace, other };
}

/** 估算 token 數。見檔頭校準說明。 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const { cjk, asciiVisible, whitespace, other } = breakdownChars(text);
  return Math.round(cjk + asciiVisible / 4 + whitespace / 5 + other / 2);
}

/**
 * 指引全文的 token 數。字元數與已知全文完全相同時回傳官方實測值，
 * 否則回傳估算值。不猜、不四捨五入到已知值。
 */
export function guidelineTokens(guidelineText: string): TokenCount {
  if (!guidelineText) return { tokens: 0, method: "estimate" };
  if ([...guidelineText].length === GUIDELINE_KNOWN_CHARS) {
    return { tokens: GUIDELINE_KNOWN_TOKENS, method: "measured" };
  }
  return { tokens: estimateTokens(guidelineText), method: "estimate" };
}

export function charCount(text: string): number {
  return [...text].length;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("zh-TW");
}

export function methodLabel(method: TokenCount["method"]): string {
  return method === "measured" ? "實測" : "估算";
}
