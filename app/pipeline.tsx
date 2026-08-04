"use client";

/**
 * 管線檢視：每一站的材料、食譜、成品。
 *
 * 為什麼要有：先前這些資訊散在四個地方——輸入組成只給字數、prompt 在另一張
 * 卡片、原始回應看不到、解析後被丟掉的東西完全沒有痕跡。要判斷一份報告
 * 為什麼長這樣，得自己在心裡把四塊拼起來。
 *
 * 三段是刻意的：看得到材料與成品，還是回答不了「這一站到底做了什麼」——
 * 中間那步是程式，所以食譜直接放真正在跑的程式碼，而不是另外寫一份說明
 * （另寫的一定會過時，而且沒有任何機制會發現）。
 */

import { useState } from "react";
import { charCount, formatNumber } from "./lib/tokens";

export type StationState = "idle" | "running" | "ok" | "failed" | "skipped";

export type StationPort = {
  label: string;
  /** 全文。空字串代表這一站還沒有東西可看。 */
  text: string;
  /** 程式碼要用等寬字並保留縮排 */
  code?: boolean;
};

export type Station = {
  id: string;
  /** 程式站與 LLM 站在版面上要一眼分得出來 */
  kind: "program" | "llm";
  title: string;
  /** 這一站在做什麼，一句話 */
  role: string;
  state: StationState;
  /** 材料 */
  inputs: StationPort[];
  /** 食譜：實際執行的程式碼，以及 LLM 站的 system prompt */
  recipe: StationPort[];
  /** 中間發生了什麼——材料到成品之間，程式依序做了哪幾件事 */
  steps?: string[];
  /** 成品 */
  outputs: StationPort[];
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

function Port({ port }: { port: StationPort }) {
  const [open, setOpen] = useState(false);
  const empty = !port.text;
  return (
    <div className="pipePort">
      <button
        type="button"
        className="pipePortHead"
        onClick={() => setOpen((value) => !value)}
        disabled={empty}
        aria-expanded={open}
      >
        <span className="pipePortArrow">{open ? "▾" : "▸"}</span>
        <span className="pipePortLabel">{port.label}</span>
        <span className="pipePortSize">{empty ? "—" : `${formatNumber(charCount(port.text))} 字`}</span>
      </button>
      {open && !empty ? (
        <pre className={port.code ? "pipePortBody pipePortCode" : "pipePortBody"}>{port.text}</pre>
      ) : null}
    </div>
  );
}

function Group({ label, hint, ports }: { label: string; hint?: string; ports: StationPort[] }) {
  if (!ports.length) return null;
  return (
    <div className="pipeGroup">
      <p className="pipeGroupLabel">
        {label}
        {hint ? <span>{hint}</span> : null}
      </p>
      {ports.map((port) => (
        <Port key={port.label} port={port} />
      ))}
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

      <Group label="材料" ports={station.inputs} />
      <Group
        label="食譜"
        hint={station.kind === "llm" ? "system prompt 與實際執行的程式碼" : "實際執行的程式碼"}
        ports={station.recipe}
      />

      {station.steps?.length ? (
        <div className="pipeGroup">
          <p className="pipeGroupLabel">
            做了什麼<span>依序</span>
          </p>
          <ol className="pipeSteps">
            {station.steps.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </div>
      ) : null}

      <Group label="成品" ports={station.outputs} />

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
