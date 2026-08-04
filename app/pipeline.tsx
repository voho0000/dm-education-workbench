"use client";

/**
 * 管線檢視：每一站在做什麼、餵進去什麼、吐出什麼、程式採用了哪些。
 *
 * 為什麼要有：先前這些資訊散在四個地方——輸入組成只給字數、prompt 在另一張
 * 卡片、原始回應看不到、解析後被丟掉的東西完全沒有痕跡。要判斷一份報告
 * 為什麼長這樣，得自己在心裡把四塊拼起來。
 *
 * 這裡把每一站的「進 → 出 → 程式怎麼用」擺在同一列，程式站與 LLM 站
 * 用同一種版型，因為對讀的人來說它們都是管線上的一站。
 */

import { useState } from "react";
import { charCount, formatNumber } from "./lib/tokens";

export type StationState = "idle" | "running" | "ok" | "failed" | "skipped";

export type StationPort = {
  label: string;
  /** 全文。空字串代表這一站還沒有東西可看。 */
  text: string;
};

export type Station = {
  id: string;
  /** 程式站與 LLM 站在版面上要一眼分得出來 */
  kind: "program" | "llm";
  title: string;
  /** 這一站在做什麼，一句話 */
  role: string;
  state: StationState;
  /** LLM 站才有：送出的 system prompt */
  systemPrompt?: string;
  inputs: StationPort[];
  outputs: StationPort[];
  /** 程式從這一站的產出裡實際採用了什麼、丟掉什麼 */
  taken?: string[];
  /** 這一站發現的問題 */
  problems?: string[];
};

const STATE_LABEL: Record<StationState, string> = {
  idle: "待命",
  running: "執行中",
  ok: "完成",
  failed: "失敗",
  skipped: "未執行",
};

function Port({ port, tone }: { port: StationPort; tone: "in" | "out" }) {
  const [open, setOpen] = useState(false);
  const empty = !port.text;
  return (
    <div className={`pipePort pipePort-${tone}`}>
      <button
        type="button"
        className="pipePortHead"
        onClick={() => setOpen((value) => !value)}
        disabled={empty}
        aria-expanded={open}
      >
        <span className="pipePortArrow">{tone === "in" ? "▼ 進" : "▲ 出"}</span>
        <span className="pipePortLabel">{port.label}</span>
        <span className="pipePortSize">{empty ? "—" : `${formatNumber(charCount(port.text))} 字`}</span>
      </button>
      {open && !empty ? <pre className="pipePortBody">{port.text}</pre> : null}
    </div>
  );
}

function StationCard({ station, index }: { station: Station; index: number }) {
  return (
    <li className={`pipeStation pipeStation-${station.kind} pipeState-${station.state}`}>
      <div className="pipeStationHead">
        <span className="pipeIndex">{index}</span>
        <h4>{station.title}</h4>
        <span className="pipeKind">{station.kind === "llm" ? "LLM" : "程式"}</span>
        <span className={`pipeState pipeState-${station.state}`}>{STATE_LABEL[station.state]}</span>
      </div>
      <p className="pipeRole">{station.role}</p>

      {station.systemPrompt ? (
        <Port port={{ label: "system prompt（唯讀，隨版本送審）", text: station.systemPrompt }} tone="in" />
      ) : null}
      {station.inputs.map((port) => (
        <Port key={port.label} port={port} tone="in" />
      ))}
      {station.outputs.map((port) => (
        <Port key={port.label} port={port} tone="out" />
      ))}

      {station.taken?.length ? (
        <ul className="pipeTaken">
          {station.taken.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : null}
      {station.problems?.length ? (
        <ul className="pipeProblems">
          {station.problems.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function Pipeline({ stations }: { stations: Station[] }) {
  return (
    <ol className="pipeBoard">
      {stations.map((station, index) => (
        <StationCard key={station.id} station={station} index={index + 1} />
      ))}
    </ol>
  );
}
