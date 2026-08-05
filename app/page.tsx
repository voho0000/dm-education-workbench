"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { BUILD_ID } from "./build-id";
import { ContentLibrary } from "./content-library";
import { DecisionTrace } from "./decision-trace";
import { FlowDiagram } from "./flow";
import { Pipeline, type Station, type StationState } from "./pipeline";
// 食譜讀的是真檔案。抄一份說明到別處一定會過時，而且沒有機制會發現。
import formatPatientSource from "./lib/format-patient.ts?raw";
import patientFactsSource from "./lib/patient-facts.ts?raw";
import modulePlanSource from "./lib/module-plan.ts?raw";
import labLlmSource from "./lib/lab-llm.ts?raw";
import labNarrativeSource from "./lib/lab-narrative.ts?raw";
import validateReportSource from "./lib/validate-report.ts?raw";
import { extractSymbols } from "./lib/source-extract";
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
type OutputTab = "patient" | "clinician" | "rawSelector" | "rawLabReview" | "rawNarrative";
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

/** 每一站的食譜：從真檔案裡切出這一站實際跑的函式。 */
const RECIPE = {
  ingest: [
    { label: "format-patient.ts — formatPatientJson()", text: extractSymbols(formatPatientSource, ["formatPatientJson"], "format-patient.ts") },
    { label: "patient-facts.ts — extractPatientFacts()", text: extractSymbols(patientFactsSource, ["extractPatientFacts"], "patient-facts.ts") },
  ],
  decide: [
    { label: "module-plan.ts — decideTopics()", text: extractSymbols(modulePlanSource, ["decideTopics"], "module-plan.ts") },
    { label: "module-plan.ts — resolvePlan()", text: extractSymbols(modulePlanSource, ["resolvePlan"], "module-plan.ts") },
  ],
  selector: [
    { label: "module-plan.ts — parseModuleSelection()", text: extractSymbols(modulePlanSource, ["parseModuleSelection"], "module-plan.ts") },
  ],
  labReview: [
    { label: "lab-llm.ts — parseLabReview()", text: extractSymbols(labLlmSource, ["parseLabReview"], "lab-llm.ts") },
  ],
  narrative: [
    { label: "lab-narrative.ts — parseLabNarrative()", text: extractSymbols(labNarrativeSource, ["parseLabNarrative"], "lab-narrative.ts") },
  ],
  assemble: [
    { label: "lab-narrative.ts — formatLabNarrative()（把核實結果就地標示）", text: extractSymbols(labNarrativeSource, ["formatLabNarrative"], "lab-narrative.ts") },
    { label: "module-plan.ts — assemblePatientReport()", text: extractSymbols(modulePlanSource, ["assemblePatientReport"], "module-plan.ts") },
    { label: "module-plan.ts — assembleClinicianReport()", text: extractSymbols(modulePlanSource, ["assembleClinicianReport"], "module-plan.ts") },
    { label: "validate-report.ts — validateReport()", text: extractSymbols(validateReportSource, ["validateReport"], "validate-report.ts") },
  ],
} as const;

const OUTPUT_TABS: Array<{ id: OutputTab; label: string; filename: string; note: string }> = [
  { id: "patient", label: "病人版衛教報告", filename: "病人版衛教報告.txt", note: "由固定模組組裝，只有「您的檢驗數值」一段是模型寫的。" },
  { id: "clinician", label: "醫師版報告", filename: "醫師版報告.txt", note: "由固定模組組裝，附指引章表與頁次。" },
  { id: "rawSelector", label: "① 原始回應", filename: "原始回應-模組挑選.txt", note: "模組挑選的完整回應，未解析。它的意見改不了程式的主題判定，僅供核對。" },
  { id: "rawLabReview", label: "② 原始回應", filename: "原始回應-檢驗判讀.txt", note: "檢驗判讀的完整回應，未解析。報告中只採用通過數值比對的部分。" },
  { id: "rawNarrative", label: "③ 原始回應", filename: "原始回應-檢驗敘述.txt", note: "檢驗敘述的完整回應，未解析。報告中的版本已經過數值比對與禁止事項掃描。" },
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

export default function Home() {
  const [rawInput, setRawInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [inputTab, setInputTab] = useState<"raw" | "formatted">("raw");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [modelChoice, setModelChoice] = useState(DEFAULT_MODEL);
  const [customModel, setCustomModel] = useState("");
  const [timeoutMinutes, setTimeoutMinutes] = useState(DEFAULT_TIMEOUT_MINUTES);
  const [outputTab, setOutputTab] = useState<OutputTab>("patient");
  const [patientReport, setPatientReport] = useState("");
  const [clinicianReport, setClinicianReport] = useState("");
  /**
   * 三次呼叫的原始回應，未經解析。
   *
   * 組裝後的報告看不出模型到底回了什麼——解析器抽走它要的欄位，其餘丟掉。
   * 要判斷是模型答錯還是解析器沒接住，只能看這個。
   */
  const [rawOutputs, setRawOutputs] = useState<Record<string, string>>({});
  /** 每次呼叫的狀態，以及程式從它的產出裡採用了什麼、丟掉什麼。 */
  const [callState, setCallState] = useState<Record<PromptId, StationState>>({
    selector: "idle",
    labReview: "idle",
    narrative: "idle",
  });
  const [callNotes, setCallNotes] = useState<Record<string, { taken: string[]; problems: string[] }>>({});
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

  // 拆成兩段：事實是「確定性判定」那一站的輸入，判定結果才是它的產出。
  // 併起來才是①收到的東西——先前兩者用同一個字串，畫面上那站的進出長得一模一樣。
  const factsText = useMemo(() => (patientFacts ? factsForSelectorPrompt(patientFacts) : ""), [patientFacts]);
  const decisionsText = useMemo(() => (preview ? decisionsForPrompt(preview) : ""), [preview]);
  const selectorInput = useMemo(
    () => (factsText && decisionsText ? `${factsText}\n\n${decisionsText}` : ""),
    [factsText, decisionsText],
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
    setRawOutputs({});
    setCallNotes({});
    setCallState({ selector: "running", labReview: "running", narrative: "running" });
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

      setRawOutputs({
        rawSelector: textOf(0) ?? "",
        rawLabReview: textOf(1) ?? "",
        rawNarrative: textOf(2) ?? "",
      });

      const selection = attempt(textOf(0), parseModuleSelection);
      const labReview = attempt(textOf(1), (raw) => parseLabReview(raw, patientFacts));
      const labNarrative = attempt(textOf(2), (raw) => parseLabNarrative(raw, patientFacts));

      setCallState({
        selector: settled[0].status === "fulfilled" ? (selection ? "ok" : "failed") : "failed",
        labReview: settled[1].status === "fulfilled" ? (labReview ? "ok" : "failed") : "failed",
        narrative: settled[2].status === "fulfilled" ? (labNarrative ? "ok" : "failed") : "failed",
      });
      setCallNotes({
        selector: {
          taken: selection
            ? [
                `優先序 ${selection.priorities.length} 項，其中 ${
                  selection.priorities.length - resolvePlan(selection, patientFacts).rejectedPriorities.length
                } 項在已納入清單中、被採用`,
                `clinician_notes ${selection.clinician_notes.length} 則、data_concerns ${selection.data_concerns.length} 則：目前一律丟棄，不進任何報告`,
                `disagreements ${selection.disagreements.length} 則：僅供核對，改不了程式的主題判定`,
              ]
            : [],
          problems: selection
            ? [
                ...(resolvePlan(selection, patientFacts).rejectedPriorities.length
                  ? [`指定了 ${resolvePlan(selection, patientFacts).rejectedPriorities.length} 個不在納入清單中的模組，已忽略`]
                  : []),
                ...(selection.echo &&
                patientFacts.dcsiTotal.known &&
                selection.echo.dcsi !== null &&
                selection.echo.dcsi !== patientFacts.dcsiTotal.value
                  ? [`回抄的 DCSI（${selection.echo.dcsi}）與輸入不符，可能不是同一位病人`]
                  : []),
              ]
            : ["回應無法解析，這一站的產出全部不採用"],
        },
        labReview: {
          taken: labReview
            ? [
                `異常項目 ${labReview.review.abnormal.length} 則、系統性歸納 ${labReview.review.groups.length} 組，進醫師版`,
                `涵蓋來源檢驗 ${formatNumber(labReview.sourceRecords)} 筆`,
              ]
            : [],
          problems: labReview
            ? [
                ...(labReview.unverifiedValues.length
                  ? [`${labReview.unverifiedValues.length} 個數值在來源中找不到，已在報告中就地標示`]
                  : []),
                ...(labReview.unknownItems.length ? [`${labReview.unknownItems.length} 個項目名稱來源中沒有`] : []),
              ]
            : ["回應無法解析，醫師版退回程式輸出"],
        },
        narrative: {
          taken: labNarrative ? [`敘述 ${formatNumber(charCount(labNarrative.narrative))} 字，放進病人版的「您的檢驗數值」`] : [],
          problems: labNarrative
            ? [
                ...(labNarrative.unverifiedValues.length
                  ? [`${labNarrative.unverifiedValues.length} 個數值在來源中找不到`]
                  : []),
                ...(labNarrative.uncitedNumbers.length
                  ? [`${labNarrative.uncitedNumbers.length} 個數字既未引用也不在門檻表：${labNarrative.uncitedNumbers.join("、")}`]
                  : []),
                ...(labNarrative.bannedPhrases.length ? [`踩到禁止事項：${labNarrative.bannedPhrases.join("、")}`] : []),
                ...(labNarrative.foundAfterAll.length
                  ? [`程式判缺檢但實際存在 ${labNarrative.foundAfterAll.length} 項，是程式的漏`]
                  : []),
              ]
            : ["回應無法解析，病人版退回固定句型"],
        },
      });

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

  /**
   * 管線的每一站。程式站與 LLM 站放在同一條線上，因為對讀的人來說
   * 它們都是「東西進去、東西出來」的一站；差別在旁邊的標記，不在版型。
   */
  const stations = useMemo<Station[]>(() => {
    const code = (ports: ReadonlyArray<{ label: string; text: string }>) =>
      ports.map((port) => ({ ...port, code: true }));

    const llm = (id: PromptId, title: string, role: string, input: string, tabId: OutputTab): Station => {
      const prompt = PROMPTS.find((item) => item.id === id);
      const raw = rawOutputs[tabId] ?? "";
      return {
        id,
        kind: "llm",
        title,
        role,
        state: callState[id],
        inputs: [
          {
            label: id === "selector" ? "送出的輸入（確定性事實＋判定結果）" : "送出的輸入（檢驗紀錄）",
            text: input,
          },
        ],
        recipe: [
          { label: `system prompt（唯讀，隨版本送審）`, text: prompt?.text ?? "" },
          ...code(RECIPE[id]),
        ],
        steps: callNotes[id]?.taken,
        outputs: [{ label: "原始回應（未解析）", text: raw }],
        problems: callNotes[id]?.problems,
      };
    };

    return [
      {
        id: "ingest",
        kind: "program",
        title: "讀取申報 JSON",
        role: "把申報 JSON 拆成兩份東西：一份給模型讀的純文字，一份給程式判定用的結構化事實。不改任何數值。",
        state: llmText ? "ok" : "idle",
        inputs: [{ label: "原始 JSON", text: rawInput }],
        recipe: code(RECIPE.ingest),
        steps: patientFacts
          ? [
              `讀到檢驗 ${formatNumber(patientFacts.labRecordCount)} 筆、用藥 ${formatNumber(patientFacts.medicationRecordCount)} 筆`,
              patientFacts.labHasDrawDates
                ? "檢驗有採檢日"
                : "檢驗只有費用年月、沒有採檢日，因此後面所有敘述都不得聲稱時序",
              "R／PR 欄位缺 key 就記成「未提供」，不補 0",
            ]
          : [],
        outputs: [
          { label: "LLM 好讀文字（給②③讀原始紀錄）", text: llmText },
          { label: "確定性事實（給下一站判定）", text: factsText },
        ],
      },
      {
        id: "decide",
        kind: "program",
        title: "確定性判定",
        role: "依 R／PR 與指引門檻表決定主題、目標與追蹤間隔。這一站不呼叫模型，換模型不會改變結果。",
        state: preview ? "ok" : "idle",
        inputs: [{ label: "確定性事實", text: factsText }],
        recipe: code(RECIPE.decide),
        steps: preview
          ? [
              `逐一判定 6 個併發症主題：納入 ${preview.decisions.filter((item) => item.kind !== "excluded").length} 個`,
              `依併發症與年齡解出指引目標 ${preview.targets.targets.filter((item) => item.value).length} 項`,
              `把檢驗值比對門檻表：命中 ${preview.labThresholds.length} 則`,
              `依用藥與低血糖紀錄選出自我照護模組 ${preview.selfCareModuleIds.length} 個`,
            ]
          : [],
        outputs: [{ label: "主題判定結果（附每一項的理由）", text: decisionsText }],
      },
      llm(
        "selector",
        "① 模組挑選",
        "只回模組代碼與優先序。它改不了上一站的主題判定，寫的任何文字也不會出現在病人版。",
        selectorInput,
        "rawSelector",
      ),
      llm(
        "labReview",
        "② 檢驗判讀",
        "讀原始檢驗紀錄，找程式門檻沒涵蓋到的異常。結果進醫師版，每個數值都會被比對回來源。",
        labInput,
        "rawLabReview",
      ),
      llm(
        "narrative",
        "③ 檢驗敘述",
        "把檢驗結果寫成病人看得懂的段落。這是報告裡唯一未經逐句核准的文字。",
        narrativeInput,
        "rawNarrative",
      ),
      {
        id: "assemble",
        kind: "program",
        title: "驗證與組裝",
        role: "拿前面五站的產出，把模型寫的部分逐一比對來源數值、掃描禁止事項，通過的才組進報告；沒通過的就地標示，不改寫也不刪除。",
        state: patientReport ? "ok" : "idle",
        inputs: [
          { label: "主題判定結果（第 2 站）", text: decisionsText },
          { label: "① 原始回應（第 3 站）", text: rawOutputs.rawSelector ?? "" },
          { label: "② 原始回應（第 4 站）", text: rawOutputs.rawLabReview ?? "" },
          { label: "③ 原始回應（第 5 站）", text: rawOutputs.rawNarrative ?? "" },
        ],
        recipe: code(RECIPE.assemble),
        steps: patientReport
          ? [
              "解析三份原始回應；任何一份解析不了就整份丟棄，該段退回程式輸出",
              "把③敘述裡的每個數字比對回原始檢驗紀錄，對不上的標記為未核實",
              "掃描禁止事項（時序宣稱、風險標籤、叫病人自行停藥等）",
              "依固定模組逐字組裝兩份報告；未通過的部分就地加註警語，文字本身不改寫",
              ...checks.map((line) => `⚠ ${line}`),
            ]
          : [],
        outputs: [
          { label: "病人版衛教報告", text: patientReport },
          { label: "醫師版報告", text: clinicianReport },
        ],
      },
    ];
  }, [
    rawInput,
    llmText,
    patientFacts,
    preview,
    factsText,
    decisionsText,
    selectorInput,
    labInput,
    narrativeInput,
    callState,
    callNotes,
    rawOutputs,
    patientReport,
    clinicianReport,
    checks,
  ]);

  const activeOutputTab = OUTPUT_TABS.find((item) => item.id === outputTab) ?? OUTPUT_TABS[0];
  const output =
    outputTab === "patient" ? patientReport : outputTab === "clinician" ? clinicianReport : (rawOutputs[outputTab] ?? "");

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
              {OUTPUT_TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={outputTab === item.id ? "active" : ""}
                  onClick={() => setOutputTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="outputActions">
              <span className="fieldNote">{output ? `${formatNumber(charCount(output))} 字` : "等待產出"}</span>
              <button type="button" className="miniButton" onClick={() => copy(output, outputTab)} disabled={!output}>
                {copied === outputTab ? "已複製" : "複製"}
              </button>
              <button
                type="button"
                className="miniButton"
                onClick={() => downloadText(activeOutputTab.filename, output)}
                disabled={!output}
              >
                下載 TXT
              </button>
            </div>
          </div>
          <p className="fieldNote">{activeOutputTab.note}</p>
          <textarea
            className="outputEditor"
            value={output}
            readOnly
            spellCheck={false}
            placeholder={outputTab.startsWith("raw") ? "尚未呼叫，或該次呼叫失敗。" : "尚未產出。"}
          />
        </div>
      </article>

      <article className="stepCard">
        <div className="stepHeading">
          <span className="stepNumber">04</span>
          <div className="stepHeadingText">
            <p className="eyebrow">PIPELINE</p>
            <h2>管線的每一站</h2>
            <p className="fieldNote">
              每一站點開就看得到餵進去什麼、吐出什麼，以及程式從中採用了哪些、丟掉哪些。
              system prompt 由程式定義並隨版本一起送審，不在頁面上編輯。
            </p>
          </div>
        </div>
        <div className="stepBody">
          <Pipeline stations={stations} />
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
