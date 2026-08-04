/**
 * 把 Gemini／代理層的失敗轉成使用者看得懂的訊息，同時保留原始錯誤重點。
 *
 * 原則：`raw` 永遠保留可辨識的原文（Gemini 的 error.message，或非 JSON 回應的前段），
 * 不吞掉、不改寫。`title` 與 `advice` 才是白話轉譯。
 */

export type GeminiFailure = {
  /** 一句話說明發生什麼事 */
  title: string;
  /** 使用者接下來可以做什麼 */
  advice: string;
  /** 原始錯誤重點；沒有可用原文時為空字串 */
  raw: string;
  /** HTTP 狀態碼；非 HTTP 失敗（網路層、逾時）為 null */
  status: number | null;
  /** 是使用者主動中止，UI 不應顯示為錯誤 */
  aborted: boolean;
  /** 是逾時而非使用者中止 */
  timedOut: boolean;
  /**
   * 值得原樣重送。
   *
   * Gemini 會對同一份輸入間歇性回 400「Request contains an invalid argument」，
   * 重送就會成功；金鑰錯或模型名稱錯同樣是 400，重送幾次都一樣。兩者要分開。
   */
  retryable: boolean;
};

const RAW_SNIPPET_CHARS = 300;

export function snippet(text: string, limit = RAW_SNIPPET_CHARS): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= limit) return collapsed;
  return `${collapsed.slice(0, limit)}…（原始回應共 ${collapsed.length} 字，此處僅顯示前 ${limit} 字）`;
}

/**
 * 這個狀態＋原文值不值得原樣重送。
 *
 * 只認 Gemini 那個間歇性的 400「Request contains an invalid argument」——實測同一份
 * 輸入連送八次會掛一到兩次，重送就會過。金鑰錯、模型錯同樣是 400，重送沒有意義。
 */
function retryableForStatus(status: number, raw: string): boolean {
  const lower = raw.toLowerCase();
  if (status === 429 || status >= 500) return true;
  if (status === 400 && (lower.includes("api key not valid") || lower.includes("api_key_invalid"))) return false;
  if (status === 400 && (lower.includes("invalid argument") || lower.includes("invalid_request"))) return true;
  return false;
}

function adviceForStatus(status: number, raw: string): { title: string; advice: string } {
  const lower = raw.toLowerCase();

  if (status === 400 && (lower.includes("api key not valid") || lower.includes("api_key_invalid"))) {
    return {
      title: "Gemini 不接受這把 API 金鑰（HTTP 400）",
      advice: "請確認貼上的是完整、未過期的金鑰，且該金鑰已啟用 Generative Language API。重新貼一次時注意不要含到前後空白。",
    };
  }
  if (status === 400) {
    return {
      title: "Gemini 認為這次請求的內容或參數有問題（HTTP 400）",
      advice: "常見原因是模型 ID 不支援目前的請求格式，或輸入內容含有無法處理的欄位。請對照下方原始錯誤，先試著改用預設模型。",
    };
  }
  if (status === 401 || status === 403) {
    return {
      title: "這把金鑰沒有呼叫此模型的權限（HTTP " + status + "）",
      advice: "請確認金鑰所屬專案已啟用 Generative Language API、未被限制來源網域，且帳單設定允許使用這個模型。",
    };
  }
  if (status === 404) {
    return {
      title: "找不到這個模型 ID（HTTP 404）",
      advice: "請確認模型名稱拼寫正確且你的金鑰有權存取。可先切回預設的 gemini-3.6-flash 確認流程本身正常。",
    };
  }
  if (status === 413) {
    return {
      title: "請求內容過大，被拒絕（HTTP 413）",
      advice: "檢驗紀錄很多的病人，②③ 兩次呼叫的輸入會很大。本工具不會自動截斷病人資料，需要縮減請由你決定，或改用可接受更長輸入的模型。",
    };
  }
  if (status === 429) {
    return {
      title: "超過配額或速率上限（HTTP 429）",
      advice: "每產出一份報告會送出三次呼叫，免費層級的額度用得很快。下方原文會寫明是哪一項配額、上限多少、建議多久後重試。請等額度恢復、改用其他模型，或換一把有額度的金鑰。",
    };
  }
  if (status === 408 || status === 504 || status === 524 || status === 522) {
    return {
      title: `請求逾時（HTTP ${status}）`,
      advice: "檢驗紀錄多的病人，單次回應可能需要數分鐘，中間的代理層可能先行斷線。可延長逾時上限，或改用回應較快的模型。",
    };
  }
  if (status === 499) {
    return {
      title: "連線在回應完成前被中斷（HTTP 499）",
      advice: "多半是瀏覽器或中間代理層提前關閉連線。若發生在輸入很大的病人身上，請比照逾時處理。",
    };
  }
  if (status >= 500) {
    return {
      title: `Gemini 端暫時性錯誤（HTTP ${status}）`,
      advice: "這不是你的輸入造成的。請稍候重試；若持續發生，改用另一個模型或稍後再跑。",
    };
  }
  return {
    title: `Gemini 回傳 HTTP ${status}`,
    advice: "請參考下方原始錯誤內容判斷原因。",
  };
}

export type FailureInput = {
  status?: number | null;
  statusText?: string;
  /** 已解析的 Gemini error.message */
  apiMessage?: string;
  /** 無法解析為 JSON 時的原始回應本文 */
  rawBody?: string;
  /** fetch 或其他層丟出的例外 */
  cause?: unknown;
  /** 這次中止是逾時造成的 */
  timedOut?: boolean;
};

/** 有些執行環境會把空的 statusText 填成 "unknown"，顯示出來只會讓人更困惑。 */
function usefulStatusText(value: string): string {
  const trimmed = value.trim();
  return trimmed && trimmed.toLowerCase() !== "unknown" ? trimmed : "";
}

export function describeGeminiFailure(input: FailureInput): GeminiFailure {
  const { status = null, apiMessage = "", rawBody = "", cause, timedOut = false } = input;
  const statusText = usefulStatusText(input.statusText ?? "");

  if (cause instanceof Error && cause.name === "AbortError" && !timedOut) {
    return {
      title: "已依你的要求停止這次請求",
      advice: "沒有送出任何後續請求；你可以調整設定後重新執行。",
      raw: "",
      status: null,
      aborted: true,
      timedOut: false,
      retryable: false,
    };
  }

  if (timedOut || (cause instanceof Error && cause.name === "TimeoutError")) {
    return {
      title: "等待 Gemini 回應超過設定的時間上限",
      advice:
        "檢驗紀錄多的病人回應時間會明顯拉長。可以延長逾時上限，或改用較快的模型。請求已中止，沒有部分結果。",
      raw: cause instanceof Error ? cause.message : "",
      status: null,
      aborted: false,
      timedOut: true,
      retryable: false,
    };
  }

  if (cause instanceof TypeError) {
    return {
      title: "瀏覽器無法送出這次請求（網路層失敗）",
      advice:
        "常見原因：網路中斷、瀏覽器擴充功能或企業代理封鎖了對 Gemini 的請求、或 CORS 被擋。請開瀏覽器主控台看是否有被封鎖的紀錄，並試著關閉擴充功能後重試。",
      raw: cause.message,
      status: null,
      aborted: false,
      timedOut: false,
      retryable: false,
    };
  }

  if (status === null) {
    return {
      title: "請求失敗",
      advice: "請參考下方原始錯誤內容。",
      raw: cause instanceof Error ? cause.message : String(cause ?? ""),
      status: null,
      aborted: false,
      timedOut: false,
      retryable: false,
    };
  }

  // 有 HTTP 狀態但回應不是 JSON：幾乎都是代理層（Cloudflare 等）的錯誤頁。
  if (!apiMessage && rawBody) {
    const looksLikeHtml = /^\s*<(?:!doctype|html)/i.test(rawBody);
    const base = adviceForStatus(status, rawBody);
    return {
      title: looksLikeHtml
        ? `回應不是 Gemini 的 JSON，而是一頁 HTML（HTTP ${status}${statusText ? ` ${statusText}` : ""}）`
        : base.title,
      advice: looksLikeHtml
        ? `這代表請求沒有走到 Gemini，或在中途被代理層攔下並改回錯誤頁。${base.advice}`
        : base.advice,
      raw: snippet(rawBody),
      status,
      aborted: false,
      timedOut: false,
      retryable: retryableForStatus(status, rawBody),
    };
  }

  const base = adviceForStatus(status, apiMessage);
  return {
    title: base.title,
    advice: base.advice,
    raw: apiMessage ? snippet(apiMessage) : "",
    status,
    aborted: false,
    timedOut: false,
    retryable: retryableForStatus(status, apiMessage),
  };
}

/** 供 UI 顯示的單行摘要（保留原始重點）。 */
export function failureSummary(failure: GeminiFailure): string {
  if (!failure.raw) return failure.title;
  return `${failure.title}｜原始訊息：${failure.raw}`;
}
