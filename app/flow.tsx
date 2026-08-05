"use client";

/**
 * 資料流圖。畫的是實際的資料流——每個方框都對應一個函式或一次呼叫。
 *
 * 同一份幾何被兩個地方用：頁首的大圖，以及管線每一站上方的縮圖（把該站
 * 對應的方框點亮）。座標只定義一次，否則兩張圖遲早會對不起來，而那時
 * 縮圖指的位置就是錯的——比沒有縮圖更糟。
 */

type FlowNode = {
  id: string;
  x: number;
  y: number;
  title: string;
  sub: string;
  tone: "flowNeutral" | "flowLlm" | "flowOut" | "flowContent";
};

const W = 196;
const H = 48;

/*
 * 由上往下：來源 → 判定 → 三次呼叫並排 → 組裝 → 兩份成品。
 * 三次呼叫是並行的，所以擺同一列；上下相鄰的兩列才代表先後。
 */
export const FLOW_NODES: FlowNode[] = [
  { id: "ingest", x: 262, y: 16, title: "健保申報 JSON", sub: "用藥 · 檢驗 · R/PR · DCSI", tone: "flowNeutral" },
  // 固定內容是真正的輸入，不是裝飾：門檻表決定目標與追蹤間隔，模組決定病人讀到的字。
  // 先前圖上沒畫，等於把決定輸出內容的一半來源藏起來。
  { id: "rules", x: 16, y: 112, title: "指引門檻表", sub: "35 條 · 附章表頁次", tone: "flowContent" },
  { id: "decide", x: 262, y: 112, title: "確定性事實與判定", sub: "主題 · 目標 · 門檻（程式）", tone: "flowNeutral" },
  { id: "selector", x: 16, y: 208, title: "① 模組挑選", sub: "只回代碼與優先序", tone: "flowLlm" },
  { id: "labReview", x: 262, y: 208, title: "② 檢驗判讀", sub: "讀原始紀錄", tone: "flowLlm" },
  { id: "narrative", x: 508, y: 208, title: "③ 檢驗敘述", sub: "寫成病人看的段落", tone: "flowLlm" },
  { id: "assemble", x: 262, y: 304, title: "驗證與組裝", sub: "數值比對 · 禁止事項", tone: "flowNeutral" },
  { id: "modules", x: 508, y: 304, title: "固定衛教模組", sub: "已審內容 · 模型不改寫", tone: "flowContent" },
  { id: "patientReport", x: 140, y: 400, title: "病人版衛教報告", sub: "正文來自固定模組", tone: "flowOut" },
  { id: "clinicianReport", x: 384, y: 400, title: "醫師版報告", sub: "附指引章表與頁次", tone: "flowOut" },
];


const FLOW_EDGES = [
  // 來源 → 判定
  "M360 64 L360 112",
  // 判定 → 三次呼叫（同一列代表並行）
  "M360 160 L360 184 L114 184 L114 208",
  "M360 160 L360 208",
  "M360 160 L360 184 L606 184 L606 208",
  // 三次呼叫 → 組裝
  "M114 256 L114 280 L360 280 L360 304",
  "M360 256 L360 304",
  "M606 256 L606 280 L360 280 L360 304",
  // 固定內容進場
  "M212 136 L262 136",
  "M508 328 L458 328",
  // 組裝 → 兩份成品
  "M360 352 L360 376 L238 376 L238 400",
  "M360 352 L360 376 L482 376 L482 400",
];

/**
 * 管線每一站對應到圖上的哪些方框。
 * 驗證與組裝那站同時產出兩份報告，所以點亮三個。
 */
export const STATION_TO_NODES: Record<string, string[]> = {
  /** 內容庫不是管線上的一站，但它就是圖上那兩個虛線框。 */
  contentLibrary: ["rules", "modules"],
  ingest: ["ingest"],
  decide: ["decide", "rules"],
  selector: ["selector"],
  labReview: ["labReview"],
  narrative: ["narrative"],
  assemble: ["assemble", "modules", "patientReport", "clinicianReport"],
};

export function FlowDiagram({
  highlight,
  compact = false,
}: {
  /** 要點亮的方框 id；未給就全部正常顯示 */
  highlight?: string[];
  /** 縮圖模式：只留標題，字體放大以維持可讀性 */
  compact?: boolean;
}) {
  const active = highlight?.length ? new Set(highlight) : null;
  const markerId = compact ? "flowArrowMini" : "flowArrow";

  return (
    <svg
      className={compact ? "flowDiagram flowMini" : "flowDiagram"}
      viewBox="0 0 720 464"
      role="img"
      aria-label={
        active
          ? `資料流位置：目前在「${FLOW_NODES.filter((n) => active.has(n.id)).map((n) => n.title).join("、")}」`
          : "資料流：程式判定為主，三次 LLM 呼叫只負責規則做不到的事"
      }
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M2 1L8 5L2 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </marker>
      </defs>

      {FLOW_NODES.map((node) => {
        const dim = active ? !active.has(node.id) : false;
        return (
          <g key={node.id} className={`${node.tone}${dim ? " flowDim" : ""}${active && !dim ? " flowActive" : ""}`}>
            <rect x={node.x} y={node.y} width={W} height={H} rx={6} />
            <text
              className="flowTitle"
              x={node.x + W / 2}
              y={compact ? node.y + 30 : node.y + 21}
              textAnchor="middle"
            >
              {node.title}
            </text>
            {compact ? null : (
              <text className="flowSub" x={node.x + W / 2} y={node.y + 38} textAnchor="middle">
                {node.sub}
              </text>
            )}
          </g>
        );
      })}

      <g className={active ? "flowLine flowDim" : "flowLine"} markerEnd={`url(#${markerId})`}>
        {FLOW_EDGES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
