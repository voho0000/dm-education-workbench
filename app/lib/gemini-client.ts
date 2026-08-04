/**
 * Gemini 呼叫的共用邏輯。
 *
 * 關鍵修正：回應一律先以 text() 取出再嘗試 JSON.parse。
 * 舊版直接 `await response.json()`，代理層回 HTML 錯誤頁時會丟
 * `SyntaxError: Unexpected token '<'`，使用者完全無法判斷發生什麼事。
 */

import { describeGeminiFailure, type GeminiFailure } from "./gemini-errors.ts";

export const GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1/interactions";
export const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

export type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export type ParsedResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json: JsonRecord | null;
  rawBody: string;
};

/** 先取文字再解析，永遠不會因為回應不是 JSON 而丟出難懂的 SyntaxError。 */
export async function safeJson(response: Response): Promise<ParsedResponse> {
  const rawBody = await response.text();
  let json: JsonRecord | null = null;
  try {
    const parsed = JSON.parse(rawBody);
    if (isRecord(parsed)) json = parsed;
  } catch {
    json = null;
  }
  return { ok: response.ok, status: response.status, statusText: response.statusText, json, rawBody };
}

export function extractGeminiText(payload: JsonRecord): string {
  if (typeof payload.output_text === "string") return payload.output_text;
  if (typeof payload.outputText === "string") return payload.outputText;

  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  const stepText = [...steps]
    .reverse()
    .flatMap((step) => {
      if (!isRecord(step) || step.type !== "model_output" || !Array.isArray(step.content)) return [];
      return step.content;
    })
    .filter((block) => isRecord(block) && block.type === "text" && typeof block.text === "string")
    .map((block) => String((block as JsonRecord).text))
    .join("\n")
    .trim();
  if (stepText) return stepText;

  const outputs = Array.isArray(payload.outputs) ? payload.outputs : [];
  const outputText = outputs
    .flatMap((output) => (isRecord(output) && Array.isArray(output.content) ? output.content : []))
    .filter((block) => isRecord(block) && typeof block.text === "string")
    .map((block) => String((block as JsonRecord).text))
    .join("\n")
    .trim();
  if (outputText) return outputText;

  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  return candidates
    .flatMap((candidate) => {
      if (!isRecord(candidate)) return [];
      const content = candidate.content;
      return isRecord(content) && Array.isArray(content.parts) ? content.parts : [];
    })
    .filter((partValue) => isRecord(partValue) && typeof partValue.text === "string")
    .map((partValue) => String((partValue as JsonRecord).text))
    .join("\n")
    .trim();
}

export function apiErrorMessage(json: JsonRecord | null): string {
  if (!json) return "";
  const error = json.error;
  if (isRecord(error) && typeof error.message === "string") return error.message;
  if (typeof json.error === "string") return json.error;
  return "";
}

/** 把使用者的中止訊號和逾時訊號合成一個。回傳的 cleanup 一定要呼叫。 */
export function withTimeout(userSignal: AbortSignal, timeoutMs: number) {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(new DOMException("timeout", "TimeoutError")), timeoutMs);
  const signal = AbortSignal.any([userSignal, timeoutController.signal]);
  return {
    signal,
    timedOut: () => timeoutController.signal.aborted,
    cleanup: () => clearTimeout(timer),
  };
}

export class GeminiRequestError extends Error {
  failure: GeminiFailure;
  constructor(failure: GeminiFailure) {
    super(failure.title);
    this.name = "GeminiRequestError";
    this.failure = failure;
  }
}

export type CallArgs = {
  apiKey: string;
  model: string;
  systemPrompt: string;
  input: string;
  signal: AbortSignal;
  timeoutMs?: number;
  /** true 時直接打 Google，false 時走本站 /api/gemini 代理 */
  direct: boolean;
  /** 開發用：模擬失敗情境 */
  simulate?: string;
};

export type CallResult = {
  text: string;
  usage: JsonRecord | null;
  elapsedMs: number;
};

export async function callGemini(args: CallArgs): Promise<CallResult> {
  const { apiKey, model, systemPrompt, input, signal, direct, simulate } = args;
  const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeout = withTimeout(signal, timeoutMs);
  const startedAt = Date.now();

  try {
    if (direct && !apiKey.trim()) {
      throw new GeminiRequestError(
        describeGeminiFailure({ status: null, apiMessage: "這個版本需要在頁面輸入 Gemini API 金鑰。" }),
      );
    }

    const response = direct
      ? await fetch(GEMINI_INTERACTIONS_URL, {
          method: "POST",
          signal: timeout.signal,
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey.trim() },
          body: JSON.stringify({ model, input, system_instruction: systemPrompt, store: false }),
        })
      : await fetch("/api/gemini", {
          method: "POST",
          signal: timeout.signal,
          headers: {
            "Content-Type": "application/json",
            // 只有 dev build 會保留這一段；正式建置由 vite 替換成 false 後整段移除。
            ...(import.meta.env.DEV && simulate ? { "x-dm-simulate": simulate } : {}),
          },
          body: JSON.stringify({ apiKey, model, systemPrompt, input }),
        });

    const parsed = await safeJson(response);

    if (!parsed.ok) {
      throw new GeminiRequestError(
        describeGeminiFailure({
          status: parsed.status,
          statusText: parsed.statusText,
          apiMessage: apiErrorMessage(parsed.json),
          rawBody: parsed.json ? "" : parsed.rawBody,
        }),
      );
    }

    if (!parsed.json) {
      throw new GeminiRequestError(
        describeGeminiFailure({
          status: parsed.status,
          statusText: parsed.statusText,
          rawBody: parsed.rawBody,
        }),
      );
    }

    const text = direct ? extractGeminiText(parsed.json) : String(parsed.json.text ?? "");
    if (!text.trim()) {
      throw new GeminiRequestError(
        describeGeminiFailure({
          status: parsed.status,
          apiMessage: apiErrorMessage(parsed.json) || "Gemini 已回應，但回應中找不到文字輸出。",
          rawBody: parsed.json ? "" : parsed.rawBody,
        }),
      );
    }

    const usage = isRecord(parsed.json.usage)
      ? parsed.json.usage
      : isRecord(parsed.json.usage_metadata)
        ? parsed.json.usage_metadata
        : null;

    return { text, usage, elapsedMs: Date.now() - startedAt };
  } catch (cause) {
    if (cause instanceof GeminiRequestError) throw cause;
    throw new GeminiRequestError(describeGeminiFailure({ cause, timedOut: timeout.timedOut() }));
  } finally {
    timeout.cleanup();
  }
}

/** Gemini countTokens：用來把估算值換成實測值。 */
export async function countTokens(args: {
  apiKey: string;
  model: string;
  text: string;
  direct: boolean;
  signal: AbortSignal;
}): Promise<number> {
  const { apiKey, model, text, direct, signal } = args;
  const url = direct
    ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:countTokens`
    : "/api/gemini/count-tokens";

  const response = direct
    ? await fetch(url, {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey.trim() },
        body: JSON.stringify({ contents: [{ parts: [{ text }] }] }),
      })
    : await fetch(url, {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, model, text }),
      });

  const parsed = await safeJson(response);
  if (!parsed.ok || !parsed.json) {
    throw new GeminiRequestError(
      describeGeminiFailure({
        status: parsed.status,
        statusText: parsed.statusText,
        apiMessage: apiErrorMessage(parsed.json),
        rawBody: parsed.json ? "" : parsed.rawBody,
      }),
    );
  }

  const total = parsed.json.totalTokens ?? parsed.json.total_tokens ?? parsed.json.tokens;
  const numeric = Number(total);
  if (!Number.isFinite(numeric)) {
    throw new GeminiRequestError(
      describeGeminiFailure({ status: parsed.status, apiMessage: "countTokens 回應中沒有 totalTokens。" }),
    );
  }
  return numeric;
}
