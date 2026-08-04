"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { BUILD_ID } from "./build-id";
import { ContentLibrary } from "./content-library";
import { DecisionTrace } from "./decision-trace";
import { hasHardBlocker, runBlockers, type Blocker } from "./lib/blockers";
import { buildRunInput, type ComposedInput } from "./lib/build-input";
import { MODULE_CATALOG_VERSION } from "./lib/education-modules";
import { formatPatientJson } from "./lib/format-patient";
import { GeminiRequestError, callGemini } from "./lib/gemini-client";
import { describeGeminiFailure, type GeminiFailure } from "./lib/gemini-errors";
import { RULES_SOURCE, RULES_VERSION } from "./lib/guideline-rules";
import { LAB_NARRATIVE_PROMPT, buildNarrativeInput, parseLabNarrative } from "./lib/lab-narrative";
import { LAB_REVIEW_PROMPT, labSectionOf, parseLabReview } from "./lib/lab-llm";
import {
  MODULE_SELECTOR_PROMPT,
  assembleClinicianReport,
  assemblePatientReport,
  decisionsForPrompt,
  parseModuleSelection,
  resolvePlan,
} from "./lib/module-plan";
import { extractPatientFacts, factsForSelectorPrompt } from "./lib/patient-facts";
import { SELF_CARE_VERSION } from "./lib/self-care-modules";
import { DEFAULT_INPUT_TOKEN_LIMIT, charCount, formatNumber } from "./lib/tokens";

type Stage = "idle" | "running";
type OutputTab = "patient" | "clinician";
type PromptId = "selector" | "labReview" | "narrative";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const DEFAULT_MODEL = "gemini-3.6-flash";
const CUSTOM_MODEL = "__custom__";
const GEMINI_CREDENTIAL_INPUT_ID = "dmEducationGeminiTransientCredential2026";
const DEFAULT_TIMEOUT_MINUTES = 15;

const MODEL_OPTIONS = [
  { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash｜預設・較高品質" },
  { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite｜較快・較低成本" },
  { value: CUSTOM_MODEL, label: "自訂模型 ID" },
];

const PROMPTS: Array<{ id: PromptId; label: string; text: string; role: string }> = [
  {
    id: "selector",
    label: "① 模組挑選",
    role: "只回模組代碼、優先序與異議。它寫的任何文字都不會出現在報告裡。",
    text: MODULE_SELECTOR_PROMPT,
  },
  {
    id: "labReview",
    label: "② 檢驗判讀",
    role: "讀原始檢驗紀錄判斷異常，結果進醫師版。程式逐一比對它引用的每一個數值。",
    text: LAB_REVIEW_PROMPT,
  },
  {
    id: "narrative",
    label: "③ 檢驗敘述",
    role: "把檢驗結果寫成給病人看的段落。這是報告中唯一未經逐句核准的文字。",
    text: LAB_NARRATIVE_PROMPT,
  },
];

/**
 * 示範資料。**這是完全虛構的合成資料，不是任何真實病人。**
 *
 * 這個頁面部署在公開網址，任何寫在這裡的東西都會出現在 JS bundle 裡。
 * 數值刻意選成整數或明顯的示範值，識別欄位一律 SAMPLE。
 */
const SAMPLE_INPUT = `{
  "downloadType": "DiabetesEducation",
  "userInfo": { "userId": "SAMPLE-DEMO-NOT-A-REAL-PATIENT", "gender": "F", "birthday": "1960/01/01" },
  "userInput": {
    "REPORT_DATE": "2026-08-01",
    "BIRTHDAY": "1960-01-01",
    "SEX": "1",
    "T": 8,
    "DCSI": 3,
    "CKD": 1,
    "R5": 2,
    "PR1": 2,
    "PR4": 1,
    "PR6": 0
  },
  "rawSources": {
    "medication": {
      "rObject": [
        { "drug_date": "2026-01-10", "icd_code": "E119", "icd_cname": "第2型糖尿病", "drug_atc5_name": "其他抗糖尿病藥物", "drug_ing_name": "METFORMIN HCL", "drug_fre": "BID", "day": 28 },
        { "drug_date": "2026-01-10", "icd_code": "E119", "icd_cname": "第2型糖尿病", "drug_atc5_name": "抗糖尿病藥物", "drug_ing_name": "DAPAGLIFLOZIN", "drug_fre": "QD", "day": 28 }
      ]
    },
    "labData": {
      "rObject": [
        { "fee_ym": "202601", "order_code": "09006C", "order_name": "醣化血紅素", "assay_item_name": "HbA1c", "assay_value": "9.0", "unit_data": "%", "consult_value": "[4.0][6.0]" },
        { "fee_ym": "202601", "order_code": "09005C", "order_name": "血液及體液葡萄糖-空腹", "assay_item_name": "Glu-AC", "assay_value": "200", "unit_data": "mg/dL", "consult_value": "[70][100]" },
        { "fee_ym": "202601", "order_code": "09005C", "order_name": "血液及體液葡萄糖-空腹", "assay_item_name": "Glu-AC", "assay_value": "60", "unit_data": "mg/dL", "consult_value": "[70][100]" },
        { "fee_ym": "202601", "order_code": "09015C", "order_name": "腎絲球過濾率", "assay_item_name": "eGFR", "assay_value": "45.0", "unit_data": "mL/min/1.73m2", "consult_value": "[90][]" },
        { "fee_ym": "202601", "order_code": "09011C", "order_name": "鉀", "assay_item_name": "K", "assay_value": "3.4", "unit_data": "mmol/L", "consult_value": "[3.5][5.1]" },
        { "fee_ym": "202601", "order_code": "08011C", "order_name": "血色素檢查", "assay_item_name": "Hb", "assay_value": "10.0", "unit_data": "g/dL", "consult_value": "[[≧18y]M 13.1-17.2 F 11.0-15.2][]" }
      ]
    }
  }
}`;

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function BlockerList({ blockers }: { blockers: Blocker[] }) {
  if (!blockers.length) return null;
  return (
    <div className="blockerList" role="status">
      <strong>目前不能執行的原因</strong>
      <ul>
        {blockers.map((item) => (
          <li key={item.code} className={item.hard ? "hard" : "soft"}>
            <span className="blockerMessage">{item.message}</span>
            <span className="blockerFix">{item.howToFix}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompositionPanel({ input }: { input: ComposedInput }) {
  const overLimit = input.totalTokens > DEFAULT_INPUT_TOKEN_LIMIT;
  const percent = Math.min(999, Math.round((input.totalTokens / DEFAULT_INPUT_TOKEN_LIMIT) * 100));
  return (
    <details className="compositionPanel">
      <summary>
        三次呼叫合計送出：約 {formatNumber(input.totalTokens)} tokens（{formatNumber(input.totalChars)} 字）
        <span className={overLimit ? "limitBadge over" : "limitBadge"}>模型上限的 {percent}%</span>
      </summary>
      <table>
        <tbody>
          {input.parts.map((part) => (
            <tr key={part.label}>
              <th>{part.label}</th>
              <td>{formatNumber(part.chars)} 字</td>
              <td>
                約 {formatNumber(part.tokens)} tokens<em>估算</em>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="fieldNote">
        ②③ 讀的是同一份檢驗紀錄，重複的部分在這裡看得見。本工具在任何情況下都不會自動截斷病人資料。
      </p>
    </details>
  );
}

/** 流程圖。畫的是實際的資料流——每個方框都對應一個函式或一次呼叫。 */
function FlowDiagram() {
  const box = (x: number, y: number, w: number, title: string, sub: string, tone: string) => (
    <g key={`${x}-${y}`} className={tone}>
      <rect x={x} y={y} width={w} height={48} rx={6} />
      <text className="flowTitle" x={x + w / 2} y={y + 21} textAnchor="middle">
        {title}
      </text>
      <text className="flowSub" x={x + w / 2} y={y + 38} textAnchor="middle">
        {sub}
      </text>
    </g>
  );
  return (
    <svg
      className="flowDiagram"
      viewBox="0 0 720 296"
      role="img"
      aria-label="資料流：程式判定為主，三次 LLM 呼叫只負責規則做不到的事"
    >
      <defs>
        <marker id="flowArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </marker>
      </defs>
      {box(16, 16, 196, "健保申報 JSON", "用藥 · 檢驗 · R/PR · DCSI", "flowNeutral")}
      {box(16, 112, 196, "確定性事實與判定", "主題 · 目標 · 門檻（程式）", "flowNeutral")}
      {box(262, 16, 196, "① 模組挑選", "只回代碼與優先序", "flowLlm")}
      {box(262, 112, 196, "② 檢驗判讀", "讀原始紀錄", "flowLlm")}
      {box(262, 208, 196, "③ 檢驗敘述", "寫成病人看的段落", "flowLlm")}
      {box(508, 112, 196, "驗證與組裝", "數值比對 · 禁止事項", "flowNeutral")}
      {box(508, 16, 196, "病人版衛教報告", "正文來自固定模組", "flowOut")}
      {box(508, 208, 196, "醫師版報告", "附指引章表與頁次", "flowOut")}
      <g className="flowLine" markerEnd="url(#flowArrow)">
        <path d="M114 64 L114 112" />
        <path d="M212 40 L262 40" />
        <path d="M212 136 L262 136" />
        <path d="M212 152 L237 152 L237 232 L262 232" />
        <path d="M458 40 L483 40 L483 130 L508 130" />
        <path d="M458 136 L508 136" />
        <path d="M458 232 L483 232 L483 142 L508 142" />
        <path d="M606 112 L606 64" />
        <path d="M606 160 L606 208" />
      </g>
    </svg>
  );
}

export default function Home() {
  const [rawInput, setRawInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [inputTab, setInputTab] = useState<"raw" | "formatted">("raw");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [modelChoice, setModelChoice] = useState(DEFAULT_MODEL);
  const [customModel, setCustomModel] = useState("");
  const [timeoutMinutes, setTimeoutMinutes] = useState(DEFAULT_TIMEOUT_MINUTES);
  const [promptId, setPromptId] = useState<PromptId>("selector");
  const [outputTab, setOutputTab] = useState<OutputTab>("patient");
  const [patientReport, setPatientReport] = useState("");
  const [clinicianReport, setClinicianReport] = useState("");
  const [checks, setChecks] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [failure, setFailure] = useState<GeminiFailure | null>(null);
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  const model = modelChoice === CUSTOM_MODEL ? customModel.trim() : modelChoice;
  const onGitHubPages = typeof window !== "undefined" && window.location.hostname.endsWith("github.io");

  const parsedRawJson = useMemo<unknown>(() => {
    const trimmed = rawInput.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }, [rawInput]);

  const patientFacts = useMemo(() => (parsedRawJson ? extractPatientFacts(parsedRawJson) : null), [parsedRawJson]);
  const llmText = useMemo(() => (parsedRawJson ? formatPatientJson(parsedRawJson) : ""), [parsedRawJson]);
  /** 不呼叫 LLM 也產得出來的判定，讓使用者按下按鈕前就知道會納入什麼。 */
  const preview = useMemo(() => (patientFacts ? resolvePlan(null, patientFacts) : null), [patientFacts]);

  const selectorInput = useMemo(
    () =>
      patientFacts
        ? `${factsForSelectorPrompt(patientFacts)}\n\n${decisionsForPrompt(resolvePlan(null, patientFacts))}`
        : "",
    [patientFacts],
  );
  const labInput = useMemo(() => labSectionOf(llmText), [llmText]);
  const narrativeInput = useMemo(
    () => (patientFacts ? buildNarrativeInput(llmText, patientFacts) : ""),
    [llmText, patientFacts],
  );

  const composed = useMemo<ComposedInput>(
    () =>
      buildRunInput({
        selectorPrompt: MODULE_SELECTOR_PROMPT,
        factsText: selectorInput,
        labReviewPrompt: LAB_REVIEW_PROMPT,
        labText: labInput,
        narrativePrompt: LAB_NARRATIVE_PROMPT,
        narrativeText: narrativeInput,
      }),
    [selectorInput, labInput, narrativeInput],
  );

  const blockers = useMemo(
    () =>
      runBlockers({
        rawInput,
        parsedJson: Boolean(parsedRawJson),
        model,
        apiKey,
        requiresClientKey: onGitHubPages,
        totalTokens: composed.totalTokens,
        tokenLimit: DEFAULT_INPUT_TOKEN_LIMIT,
      }),
    [rawInput, parsedRawJson, model, apiKey, onGitHubPages, composed.totalTokens],
  );

  useEffect(() => {
    if (runStartedAt === null) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - runStartedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [runStartedAt]);

  useEffect(() => {
    if (failure) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [failure]);

  function resetOutputs() {
    setPatientReport("");
    setClinicianReport("");
    setChecks([]);
    setNotice("");
  }

  function readFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setFailure(describeGeminiFailure({ apiMessage: `檔案 ${file.name} 超過 5 MB 上限。` }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRawInput(String(reader.result ?? ""));
      setFileName(file.name);
      resetOutputs();
      setFailure(null);
    };
    reader.readAsText(file, "utf-8");
  }

  async function run() {
    setFailure(null);
    setNotice("");
    setChecks([]);
    if (hasHardBlocker(blockers) || !patientFacts) return;

    setStage("running");
    setRunStartedAt(Date.now());
    setElapsedSeconds(0);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const call = (systemPrompt: string, input: string) =>
      callGemini({
        apiKey,
        model,
        systemPrompt,
        input,
        signal: controller.signal,
        direct: onGitHubPages,
        timeoutMs: timeoutMinutes * 60 * 1000,
      });

    try {
      // 三次呼叫互相獨立，並行送出。任何一次失敗都不擋住其餘——主題判定與
      // 指引目標完全不依賴 LLM，報告一定產得出來，缺的部分退回程式輸出。
      const settled = await Promise.allSettled([
        call(MODULE_SELECTOR_PROMPT, selectorInput),
        call(LAB_REVIEW_PROMPT, labInput),
        call(LAB_NARRATIVE_PROMPT, narrativeInput),
      ]);
      const textOf = (index: number) =>
        settled[index].status === "fulfilled"
          ? (settled[index] as PromiseFulfilledResult<{ text: string }>).value.text
          : null;
      const attempt = <T,>(raw: string | null, parse: (value: string) => T): T | null => {
        if (!raw) return null;
        try {
          return parse(raw);
        } catch {
          return null;
        }
      };

      const selection = attempt(textOf(0), parseModuleSelection);
      const labReview = attempt(textOf(1), (raw) => parseLabReview(raw, patientFacts));
      const labNarrative = attempt(textOf(2), (raw) => parseLabNarrative(raw, patientFacts));

      const options = {
        reportDate: new Date().toISOString().slice(0, 10),
        dataCutoff: patientFacts.dataCutoff.known ? patientFacts.dataCutoff.value : null,
      };
      const plan = resolvePlan(selection, patientFacts);
      setPatientReport(assemblePatientReport(plan, { ...options, labNarrative: labNarrative ?? undefined }));
      setClinicianReport(
        assembleClinicianReport(plan, patientFacts, { ...options, labReview: labReview ?? undefined }),
      );
      setOutputTab("patient");

      const found: string[] = [];
      const failed = [
        selection ? null : "① 模組挑選",
        labReview ? null : "② 檢驗判讀",
        labNarrative ? null : "③ 檢驗敘述",
      ].filter(Boolean) as string[];
      if (labNarrative?.foundAfterAll.length) {
        found.push(
          `敘述器在紀錄中找到程式判定為缺檢的 ${labNarrative.foundAfterAll.length} 項（${labNarrative.foundAfterAll
            .map((item) => `${item.item} → ${item.as}`)
            .join("、")}）：項目名稱比對有漏，需修正程式。`,
        );
      }
      if (labNarrative?.unverifiedValues.length) {
        found.push(`病人版敘述引用了 ${labNarrative.unverifiedValues.length} 個來源中找不到的數值，已在報告中就地標示。`);
      }
      if (labNarrative?.bannedPhrases.length) {
        found.push(`病人版敘述可能踩到禁止事項：${labNarrative.bannedPhrases.join("、")}。`);
      }
      if (labReview?.unverifiedValues.length) {
        found.push(`醫師版判讀引用了 ${labReview.unverifiedValues.length} 個來源中找不到的數值，已在報告中就地標示。`);
      }
      if (failed.length) found.push(`${failed.join("、")}未取得，該部分已退回程式輸出。`);
      setChecks(found);

      const full = plan.decisions.filter(
        (item) => item.kind !== "excluded" && item.kind !== "prevention-moderate",
      ).length;
      setNotice(
        `完成：程式依 R／PR 納入 ${full} 個併發症主題、${plan.selfCareModuleIds.length} 個自我照護模組${
          found.length ? "" : "；自動檢查全數通過"
        }。`,
      );
    } catch (cause) {
      if (cause instanceof GeminiRequestError) {
        if (!cause.failure.aborted) setFailure(cause.failure);
      } else {
        setFailure(describeGeminiFailure({ cause }));
      }
    } finally {
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
      setRunStartedAt(null);
      setStage("idle");
    }
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1500);
  }

  const activePrompt = PROMPTS.find((item) => item.id === promptId) ?? PROMPTS[0];
  const output = outputTab === "patient" ? patientReport : clinicianReport;

  return (
    <main className="workspace">
      <header className="topbar">
        <div className="brand">
          <span className="brandMark">糖衛</span>
          <span>報告產生器</span>
        </div>
        <div className="topMeta">
          <span className="privacyPill">
            <span className="statusDot" />
            不寫入本站資料庫
          </span>
          <span className="privacyPill">金鑰僅暫存本頁</span>
        </div>
      </header>

      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">DIABETES EDUCATION REPORT</p>
          <h1>
            一份健保申報 JSON，
            <br />
            兩份可用的報告。
          </h1>
          <p className="heroLead">
            併發症主題、個別化目標與追蹤間隔完全由程式依 R／PR 與指引門檻表判定；LLM 只負責規則做不到的三件事。
            病人可見的衛教正文來自固定模組，不由模型改寫。
          </p>
        </div>
        <FlowDiagram />
      </section>

      <article className="stepCard">
        <div className="stepHeading">
          <span className="stepNumber">01</span>
          <div className="stepHeadingText">
            <p className="eyebrow">INPUT</p>
            <h2>病人資料</h2>
            <p className="fieldNote">
              需要原始 JSON。這條流程要讀 R／PR／CKD 與檢驗紀錄的結構化欄位，純文字無法判定主題與門檻。
            </p>
          </div>
        </div>

        <div className="stepBody">
        <div className="inputGrid">
          <div
            className={dragging ? "dropZone dragging" : "dropZone"}
            onDragOver={(event: DragEvent<HTMLDivElement>) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event: DragEvent<HTMLDivElement>) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) readFile(file);
            }}
          >
            <span className="fileGlyph">JSON</span>
            <p>拖曳檔案到這裡</p>
            <p className="fieldNote">上限 5 MB，只在瀏覽器內處理</p>
            <label className="secondaryButton">
              選擇檔案
              <input
                type="file"
                accept=".json,application/json"
                hidden
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const file = event.target.files?.[0];
                  if (file) readFile(file);
                  event.target.value = "";
                }}
              />
            </label>
            {fileName ? <p className="fieldNote">{fileName}</p> : null}
          </div>

          <div className="editorShell">
            <div className="editorToolbar">
              <div className="tabs">
                <button type="button" className={inputTab === "raw" ? "active" : ""} onClick={() => setInputTab("raw")}>
                  原始 JSON
                </button>
                <button
                  type="button"
                  className={inputTab === "formatted" ? "active" : ""}
                  onClick={() => setInputTab("formatted")}
                  disabled={!llmText}
                >
                  LLM 好讀文字
                </button>
              </div>
              <span className="fieldNote">
                {formatNumber(charCount(inputTab === "raw" ? rawInput : llmText))} 字
              </span>
            </div>
            <textarea
              className="inputEditor"
              value={inputTab === "raw" ? rawInput : llmText}
              readOnly={inputTab === "formatted"}
              onChange={(event) => {
                setRawInput(event.target.value);
                resetOutputs();
              }}
              placeholder="在此貼上健保申報 JSON…"
              spellCheck={false}
            />
            <div className="inlineActions">
              <button
                type="button"
                className="textButton"
                onClick={() => {
                  setRawInput(SAMPLE_INPUT);
                  setFileName("");
                  resetOutputs();
                }}
              >
                載入合成示範資料
              </button>
              <span className="fieldNote">示範資料為虛構，非真實病人</span>
            </div>
          </div>
        </div>

        {preview && patientFacts ? (
          <>
            <dl className="factGrid">
              <div>
                <dt>已發生的併發症主題</dt>
                <dd>{preview.decisions.filter((item) => item.kind === "established").length} 項</dd>
              </div>
              <div>
                <dt>預防重點・積極照護</dt>
                <dd>{preview.decisions.filter((item) => item.kind === "prevention-active").length} 項</dd>
              </div>
              <div>
                <dt>預防重點・適度介入</dt>
                <dd>{preview.moderateTopics.length} 項</dd>
              </div>
              <div>
                <dt>需核實的檢驗結果</dt>
                <dd>{preview.labThresholds.length} 則</dd>
              </div>
              <div>
                <dt>自我照護模組</dt>
                <dd>{preview.selfCareModuleIds.length} 個</dd>
              </div>
              <div>
                <dt>依指引推導的目標</dt>
                <dd>{preview.targets.targets.filter((item) => item.value).length} 項</dd>
              </div>
            </dl>
            <details className="traceToggle" open>
              <summary>看這位病人實際跑出來的判定路徑</summary>
              <DecisionTrace plan={preview} facts={patientFacts} />
            </details>
          </>
        ) : null}
        </div>
      </article>

      <article className="stepCard generatorCard">
        <div className="stepHeading">
          <span className="stepNumber">02</span>
          <div className="stepHeadingText">
            <p className="eyebrow">RUN</p>
            <h2>產出兩份報告</h2>
            <p className="fieldNote">按一次並行送出三個請求。金鑰只在執行時使用，不寫入本站。</p>
          </div>
        </div>

        <div className="stepBody">
        <div className="settingsPane">
          <div className="credentialBox">
            <div className="credentialLabelRow">
              <label className="fieldLabel" htmlFor={GEMINI_CREDENTIAL_INPUT_ID}>
                Gemini 臨時存取金鑰
              </label>
              <span className="fieldNote">重新整理即清除</span>
            </div>
            <div className="passwordRow">
              <input
                id={GEMINI_CREDENTIAL_INPUT_ID}
                className="apiKeyInput"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="貼上金鑰"
              />
              <button type="button" className="showKeyButton" onClick={() => setShowApiKey((value) => !value)}>
                {showApiKey ? "隱藏" : "顯示"}
              </button>
            </div>
            <p className="fieldNote">
              只暫存在本頁記憶體，不寫入資料庫或瀏覽器儲存空間。
              {onGitHubPages ? "此版本由瀏覽器直接傳給 Google Gemini。" : "私人站版透過本站伺服器轉送。"}
              請只在可信任的網址輸入金鑰。
            </p>
          </div>

          <div>
            <label className="fieldLabel" htmlFor="modelSelect">
              Gemini 模型
            </label>
            <select
              id="modelSelect"
              className="selectInput"
              value={modelChoice}
              onChange={(event) => setModelChoice(event.target.value)}
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {modelChoice === CUSTOM_MODEL ? (
              <input
                className="customModelInput"
                value={customModel}
                onChange={(event) => setCustomModel(event.target.value)}
                placeholder="輸入 Gemini API 支援的模型 ID"
              />
            ) : null}
          </div>

          <div>
            <label className="fieldLabel" htmlFor="timeoutInput">
              單次請求逾時上限（分鐘）
            </label>
            <input
              id="timeoutInput"
              className="textInput"
              type="number"
              min={1}
              max={60}
              value={timeoutMinutes}
              onChange={(event) => setTimeoutMinutes(Number(event.target.value) || DEFAULT_TIMEOUT_MINUTES)}
            />
            <p className="fieldNote">逾時會明確顯示為逾時，與你按「停止」區分。</p>
          </div>
        </div>

        <CompositionPanel input={composed} />

        {failure ? (
          <div className="errorBanner" ref={errorRef} role="alert">
            <strong>{failure.title}</strong>
            <p>{failure.advice}</p>
            {failure.raw ? <pre>{failure.raw}</pre> : null}
          </div>
        ) : null}
        {notice ? <div className="noticeBanner">{notice}</div> : null}
        {checks.length ? (
          <div className="blockerList" role="status">
            <strong>自動檢查發現</strong>
            <ul>
              {checks.map((item) => (
                <li key={item} className="soft">
                  <span className="blockerMessage">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <BlockerList blockers={blockers} />

        <div className="cardActions">
          <button
            type="button"
            className="primaryButton"
            onClick={run}
            disabled={stage !== "idle" || hasHardBlocker(blockers)}
          >
            {stage === "running" ? (
              <>
                <span className="spinner" />
                三次呼叫並行中… {elapsedSeconds} 秒
              </>
            ) : (
              "產出兩份報告"
            )}
          </button>
          {stage === "running" ? (
            <button type="button" className="stopButton" onClick={() => abortControllerRef.current?.abort()}>
              停止
            </button>
          ) : null}
        </div>
        </div>
      </article>

      <article className="stepCard">
        <div className="stepHeading">
          <span className="stepNumber">03</span>
          <div className="stepHeadingText">
            <p className="eyebrow">OUTPUT</p>
            <h2>兩份報告</h2>
            <p className="fieldNote">兩份由同一份判定組出，主題、目標與門檻一致。</p>
          </div>
        </div>

        <div className="stepBody">
          <div className="outputHeader">
            <div className="tabs">
              <button
                type="button"
                className={outputTab === "patient" ? "active" : ""}
                onClick={() => setOutputTab("patient")}
              >
                病人版衛教報告
              </button>
              <button
                type="button"
                className={outputTab === "clinician" ? "active" : ""}
                onClick={() => setOutputTab("clinician")}
              >
                醫師版報告
              </button>
            </div>
            <div className="outputActions">
              <span className="fieldNote">{output ? `${formatNumber(charCount(output))} 字` : "等待產出"}</span>
              <button type="button" className="miniButton" onClick={() => copy(output, outputTab)} disabled={!output}>
                {copied === outputTab ? "已複製" : "複製"}
              </button>
              <button
                type="button"
                className="miniButton"
                onClick={() => downloadText(outputTab === "patient" ? "病人版衛教報告.txt" : "醫師版報告.txt", output)}
                disabled={!output}
              >
                下載 TXT
              </button>
            </div>
          </div>
          <textarea className="outputEditor" value={output} readOnly spellCheck={false} placeholder="尚未產出。" />
        </div>
      </article>

      <article className="stepCard">
        <div className="stepHeading">
          <span className="stepNumber">04</span>
          <div className="stepHeadingText">
            <p className="eyebrow">PROMPTS</p>
            <h2>三次呼叫送出的 system prompt</h2>
            <p className="fieldNote">唯讀。這三個 prompt 由程式定義並隨版本一起送審，不在頁面上編輯。</p>
          </div>
        </div>
        <div className="stepBody">
        <div className="tabs">
          {PROMPTS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={promptId === item.id ? "active" : ""}
              onClick={() => setPromptId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="fieldNote">{activePrompt.role}</p>
        <textarea className="promptEditor" value={activePrompt.text} readOnly spellCheck={false} />
        </div>
      </article>

      <ContentLibrary />

      <section className="safetyNote">
        <span className="safetyIcon">i</span>
        <div>
          <strong>上線前的必要提醒</strong>
          <p>
            衛教模組 {MODULE_CATALOG_VERSION}、自我照護模組 {SELF_CARE_VERSION}、指引門檻表 {RULES_VERSION}
            （{RULES_SOURCE}）均尚未經醫療團隊核准。病人版的「您的檢驗數值」一段由模型撰寫，數值已由程式逐一比對來源，
            但文字未經逐句核准。正式提供病人前，仍應由醫療團隊核准固定內容、prompt 與模型版本，並建立人工抽查與版本紀錄。
          </p>
        </div>
      </section>

      <footer className="buildStamp">
        <span>糖尿病衛教報告產生器</span>
        <span>資料僅在本頁處理；按下產出時才送往 Gemini API。</span>
        <span>{`build ${BUILD_ID}`}</span>
      </footer>
    </main>
  );
}
