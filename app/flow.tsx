"use client";

import { GUIDELINE_RULES } from "./lib/guideline-rules";

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
  // 條數從規則表本身數，寫死會過期——加了第 1 型的 16 條之後這裡還停在 35。
  { id: "rules", x: 16, y: 16, title: "指引門檻表", sub: `${GUIDELINE_RULES.length} 條 · 附章表頁次`, tone: "flowContent" },
  { id: "ingest", x: 262, y: 16, title: "健保申報 JSON", sub: "用藥 · 檢驗 · R/PR · DCSI", tone: "flowNeutral" },
  { id: "decide", x: 16, y: 112, title: "確定性事實與判定", sub: "主題 · 目標 · 門檻（程式）", tone: "flowNeutral" },
  /*
   * 整理與送出拆成兩格：只畫送出版的話，看不出被拿掉了什麼、也無從判斷該不該拿。
   * 兩格的用字要跟頁面上的分頁一致，否則對照時會以為是不同的東西。
   */
  { id: "llmText", x: 508, y: 112, title: "整理版（完整）", sub: "逐欄照抄 · 不送出", tone: "flowNeutral" },
  { id: "labFilter", x: 508, y: 208, title: "送出版", sub: "去識別 · 濾掉無關檢驗", tone: "flowNeutral" },
  { id: "selector", x: 16, y: 304, title: "① 資料稽核", sub: "找矛盾 · 進醫師版", tone: "flowLlm" },
  { id: "labReview", x: 262, y: 304, title: "② 檢驗判讀", sub: "讀原始紀錄", tone: "flowLlm" },
  { id: "narrative", x: 508, y: 304, title: "③ 檢驗敘述", sub: "寫成病人看的段落", tone: "flowLlm" },
  { id: "assemble", x: 262, y: 400, title: "驗證與組裝", sub: "數值比對 · 禁止事項", tone: "flowNeutral" },
  { id: "modules", x: 508, y: 400, title: "固定衛教模組", sub: "已審內容 · 模型不改寫", tone: "flowContent" },
  { id: "patientReport", x: 140, y: 496, title: "病人版衛教報告", sub: "正文來自固定模組", tone: "flowOut" },
  { id: "clinicianReport", x: 384, y: 496, title: "醫師版報告", sub: "附指引章表與頁次", tone: "flowOut" },
];

/*
 * 三次呼叫拿到的東西不一樣，線就要分開畫：
 *   ① 只拿確定性判定的結果（事實＋主題判定＋已解出的目標）
 *   ② 只拿濾過的好讀文字
 *   ③ 兩者都拿——濾過的文字給數值，判定給中期目標的目標值
 */
const FLOW_EDGES = [
  // 門檻表與原始資料進入判定
  "M58 64 L58 112",
  "M360 64 L360 88 L170 88 L170 112",
  // 原始資料同時整理成好讀文字，再過濾
  "M360 64 L360 88 L606 88 L606 112",
  "M606 160 L606 208",
  // 判定 → ①、③
  "M114 160 L114 304",
  "M170 160 L170 272 L654 272 L654 304",
  // 濾過的文字 → ②、③
  "M558 256 L558 288 L360 288 L360 304",
  "M606 256 L606 304",
  // 三次呼叫 → 組裝
  "M114 352 L114 376 L360 376 L360 400",
  "M360 352 L360 400",
  "M606 352 L606 376 L360 376 L360 400",
  // 固定內容進場
  "M508 424 L458 424",
  // 組裝 → 兩份成品
  "M360 448 L360 472 L238 472 L238 496",
  "M360 448 L360 472 L482 472 L482 496",
];

/**
 * 管線每一站對應到圖上的哪些方框。
 * 驗證與組裝那站同時產出兩份報告，所以點亮三個。
 */
export const STATION_TO_NODES: Record<string, string[]> = {
  /** 內容庫不是管線上的一站，但它就是圖上那兩個虛線框。 */
  contentLibrary: ["rules", "modules"],
  ingest: ["ingest", "llmText", "labFilter"],
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
      viewBox="0 0 720 560"
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
