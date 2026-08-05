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
  tone: "flowNeutral" | "flowLlm" | "flowOut";
};

const W = 196;
const H = 48;

export const FLOW_NODES: FlowNode[] = [
  { id: "ingest", x: 16, y: 16, title: "健保申報 JSON", sub: "用藥 · 檢驗 · R/PR · DCSI", tone: "flowNeutral" },
  { id: "decide", x: 16, y: 112, title: "確定性事實與判定", sub: "主題 · 目標 · 門檻（程式）", tone: "flowNeutral" },
  { id: "selector", x: 262, y: 16, title: "① 模組挑選", sub: "只回代碼與優先序", tone: "flowLlm" },
  { id: "labReview", x: 262, y: 112, title: "② 檢驗判讀", sub: "讀原始紀錄", tone: "flowLlm" },
  { id: "narrative", x: 262, y: 208, title: "③ 檢驗敘述", sub: "寫成病人看的段落", tone: "flowLlm" },
  { id: "assemble", x: 508, y: 112, title: "驗證與組裝", sub: "數值比對 · 禁止事項", tone: "flowNeutral" },
  { id: "patientReport", x: 508, y: 16, title: "病人版衛教報告", sub: "正文來自固定模組", tone: "flowOut" },
  { id: "clinicianReport", x: 508, y: 208, title: "醫師版報告", sub: "附指引章表與頁次", tone: "flowOut" },
];

const FLOW_EDGES = [
  "M114 64 L114 112",
  "M212 40 L262 40",
  "M212 136 L262 136",
  "M212 152 L237 152 L237 232 L262 232",
  "M458 40 L483 40 L483 130 L508 130",
  "M458 136 L508 136",
  "M458 232 L483 232 L483 142 L508 142",
  "M606 112 L606 64",
  "M606 160 L606 208",
];

/**
 * 管線每一站對應到圖上的哪些方框。
 * 驗證與組裝那站同時產出兩份報告，所以點亮三個。
 */
export const STATION_TO_NODES: Record<string, string[]> = {
  ingest: ["ingest"],
  decide: ["decide"],
  selector: ["selector"],
  labReview: ["labReview"],
  narrative: ["narrative"],
  assemble: ["assemble", "patientReport", "clinicianReport"],
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
      viewBox="0 0 720 296"
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
