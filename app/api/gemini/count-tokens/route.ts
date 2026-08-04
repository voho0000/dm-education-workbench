import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const MAX_BODY_CHARS = 6_000_000;
const MODEL_PATTERN = /^[a-zA-Z0-9._-]+$/;

function noStore(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * countTokens 代理。用來把工作台顯示的估算值換成 Gemini 官方實測值。
 * 與 /api/gemini 相同：金鑰只在請求期間使用，不儲存、不記錄。
 */
export async function POST(request: NextRequest) {
  let body: { apiKey?: unknown; model?: unknown; text?: unknown };
  try {
    body = await request.json();
  } catch {
    return noStore({ error: "請求內容不是有效的 JSON。" }, 400);
  }

  const suppliedApiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const apiKey = suppliedApiKey || process.env.GEMINI_API_KEY;
  const model = typeof body.model === "string" ? body.model.trim() : "";
  const text = typeof body.text === "string" ? body.text : "";

  if (!apiKey) return noStore({ error: "請先在頁面輸入 Gemini API 金鑰，才能執行精算。" }, 503);
  if (apiKey.length > 512) return noStore({ error: "Gemini API 金鑰格式不正確。" }, 400);
  if (!model || !MODEL_PATTERN.test(model)) return noStore({ error: "Gemini 模型名稱格式不正確。" }, 400);
  if (!text.trim()) return noStore({ error: "沒有可計算的文字。" }, 400);
  if (text.length > MAX_BODY_CHARS) {
    return noStore({ error: `文字共 ${text.length.toLocaleString("zh-TW")} 字元，超過代理層上限。` }, 413);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:countTokens`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text }] }] }),
      },
    );

    const rawBody = await response.text();
    let payload: Record<string, unknown> | null = null;
    try {
      const parsed = JSON.parse(rawBody);
      if (parsed && typeof parsed === "object") payload = parsed as Record<string, unknown>;
    } catch {
      payload = null;
    }

    if (!response.ok || !payload) {
      const apiError = payload?.error;
      const message =
        apiError && typeof apiError === "object" && "message" in apiError
          ? String((apiError as { message: unknown }).message)
          : `countTokens 回傳 ${response.status}`;
      return noStore({ error: message, rawStatus: response.status }, response.status === 200 ? 502 : response.status);
    }

    const totalTokens = Number(payload.totalTokens ?? payload.total_tokens);
    if (!Number.isFinite(totalTokens)) {
      return noStore({ error: "countTokens 回應中沒有 totalTokens。" }, 502);
    }

    return noStore({ totalTokens, model });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "無法連線至 Gemini API。";
    return noStore({ error: `本站伺服器無法完成 countTokens 請求：${message}` }, 502);
  }
}
