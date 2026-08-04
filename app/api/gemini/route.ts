import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const MAX_BODY_CHARS = 6_000_000;
const MODEL_PATTERN = /^[a-zA-Z0-9._-]+$/;
const RAW_SNIPPET_CHARS = 300;

type GeminiBlock = { type?: string; text?: string };
type GeminiStep = { type?: string; content?: GeminiBlock[] };

function noStore(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function snippet(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= RAW_SNIPPET_CHARS) return collapsed;
  return `${collapsed.slice(0, RAW_SNIPPET_CHARS)}…（原始回應共 ${collapsed.length} 字）`;
}

/**
 * 先取文字再解析。上游回 HTML 錯誤頁時不會丟出難懂的 SyntaxError，
 * 而是把狀態碼與原始片段一起帶回前端。
 */
async function safeJson(response: Response) {
  const rawBody = await response.text();
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { json: parsed as Record<string, unknown>, rawBody };
    }
  } catch {
    // 落到下面回傳 null
  }
  return { json: null, rawBody };
}

function extractText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string") return payload.output_text;
  if (typeof payload.outputText === "string") return payload.outputText;

  const steps = Array.isArray(payload.steps) ? (payload.steps as GeminiStep[]) : [];
  const stepText = [...steps]
    .reverse()
    .filter((step) => step.type === "model_output" && Array.isArray(step.content))
    .flatMap((step) => step.content ?? [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();
  if (stepText) return stepText;

  const outputs = Array.isArray(payload.outputs) ? (payload.outputs as GeminiStep[]) : [];
  const outputText = outputs
    .flatMap((output) => output.content ?? [])
    .filter((block) => typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();
  if (outputText) return outputText;

  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  return candidates
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object") return [];
      const content = (candidate as { content?: { parts?: GeminiBlock[] } }).content;
      return Array.isArray(content?.parts) ? content.parts : [];
    })
    .map((part) => part.text)
    .filter((text): text is string => typeof text === "string")
    .join("\n")
    .trim();
}

/**
 * 開發用的失敗模擬。只在 dev build 存在，正式建置時整段被移除
 * （tests/no-leak.test.mjs 會斷言正式建置不含此分支）。
 */
async function simulatedResponse(request: NextRequest): Promise<Response | null> {
  // 必須寫成字面上的 import.meta.env.DEV，vite 才會在正式建置替換成 false 並整段移除。
  if (!import.meta.env.DEV) return null;
  const mode = request.headers.get("x-dm-simulate");
  if (!mode) return null;

  if (mode === "html") {
    return new Response(
      "<!doctype html><html><head><title>524 A timeout occurred</title></head><body><h1>Error 524</h1><p>The origin web server timed out.</p></body></html>",
      { status: 524, headers: { "Content-Type": "text/html" } },
    );
  }
  if (mode === "400") {
    return NextResponse.json({ error: { message: "API key not valid. Please pass a valid API key." } }, { status: 400 });
  }
  if (mode === "429") {
    return NextResponse.json(
      { error: { message: "Resource has been exhausted (e.g. check quota)." } },
      { status: 429 },
    );
  }
  if (mode === "404") {
    return NextResponse.json({ error: { message: "models/does-not-exist is not found." } }, { status: 404 });
  }
  if (mode === "slow") {
    await new Promise((resolve) => setTimeout(resolve, 10 * 60 * 1000));
    return NextResponse.json({ text: "（模擬：這一則永遠不該被看到）" });
  }
  if (mode === "empty") {
    return NextResponse.json({ id: "sim", steps: [] });
  }
  if (mode === "selector") {
    // arm C 的合法輔助判讀器輸出，用來在沒有金鑰時驗證整條組裝流程。
    return NextResponse.json({
      text: JSON.stringify({
        priorities: [{ module_id: "EYE-CORE", why: "（模擬）已發生視網膜病變，優先安排眼底追蹤。" }],
        clinician_notes: ["（模擬）申報資料未見 eGFR 數值，無法核對腎功能相關用藥安全性。"],
        data_concerns: ["（模擬）檢驗只有費用年月，無法判定先後順序。"],
        disagreements: [],
      }),
    });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const simulated = await simulatedResponse(request);
  if (simulated) return simulated;

  let body: { apiKey?: unknown; model?: unknown; systemPrompt?: unknown; input?: unknown };
  try {
    body = await request.json();
  } catch {
    return noStore({ error: "請求內容不是有效的 JSON。" }, 400);
  }

  const suppliedApiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const apiKey = suppliedApiKey || process.env.GEMINI_API_KEY;
  const model = typeof body.model === "string" ? body.model.trim() : "";
  const systemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt.trim() : "";
  const input = typeof body.input === "string" ? body.input.trim() : "";

  if (!apiKey) {
    return noStore({ error: "請在頁面輸入 Gemini API 金鑰，或由管理者在伺服器設定金鑰。" }, 503);
  }
  if (apiKey.length > 512) {
    return noStore({ error: "Gemini API 金鑰格式不正確。" }, 400);
  }
  if (!model || !MODEL_PATTERN.test(model)) {
    return noStore({ error: "Gemini 模型名稱格式不正確。" }, 400);
  }
  if (!systemPrompt || !input) {
    return noStore({ error: "system prompt 與輸入內容不可為空白。" }, 400);
  }
  if (systemPrompt.length + input.length > MAX_BODY_CHARS) {
    return noStore(
      {
        error: `輸入內容共 ${(systemPrompt.length + input.length).toLocaleString("zh-TW")} 字元，超過本站代理層上限 ${MAX_BODY_CHARS.toLocaleString("zh-TW")} 字元。本站不會自動截斷，請改用不帶指引全文的設定。`,
      },
      413,
    );
  }

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model,
        input,
        system_instruction: systemPrompt,
        store: false,
      }),
    });

    const { json: payload, rawBody } = await safeJson(response);

    if (!response.ok) {
      const apiError = payload?.error;
      const message =
        apiError && typeof apiError === "object" && "message" in apiError
          ? String((apiError as { message: unknown }).message)
          : "";
      return noStore(
        {
          error: message || `Gemini API 回傳 ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`,
          rawStatus: response.status,
          rawStatusText: response.statusText,
          rawSnippet: payload ? "" : snippet(rawBody),
        },
        response.status,
      );
    }

    if (!payload) {
      return noStore(
        {
          error: `Gemini 回應不是 JSON（HTTP ${response.status}）。請求可能被中間的代理層攔截。`,
          rawStatus: response.status,
          rawStatusText: response.statusText,
          rawSnippet: snippet(rawBody),
        },
        502,
      );
    }

    const text = extractText(payload);
    if (!text) {
      return noStore(
        {
          error: "Gemini 已回應，但找不到文字輸出。",
          rawStatus: response.status,
          rawSnippet: snippet(rawBody),
        },
        502,
      );
    }

    return noStore({
      text,
      model,
      interactionId: payload.id ?? null,
      usage: payload.usage ?? payload.usage_metadata ?? null,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "無法連線至 Gemini API。";
    return noStore({ error: `本站伺服器無法完成對 Gemini 的請求：${message}`, rawStatus: null }, 502);
  }
}
