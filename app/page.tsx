"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  EVAL_PROMPT_PRESETS,
  GENERATOR_PROMPT_PRESETS,
  PromptPresetId,
  WORKBENCH_EVAL_PROMPT,
  WORKBENCH_GENERATOR_PROMPT,
} from "./prompt-presets";
import { BUILD_ID } from "./build-id";
import { ARMS, type ArmId, armById } from "./lib/arms";
import { evalBlockers, generateBlockers, hasHardBlocker, type Blocker, type WorkbenchState } from "./lib/blockers";
import { buildArmCInput, buildEvalInput, buildGenerationInput, type ComposedInput } from "./lib/build-input";
import { formatPatientJson } from "./lib/format-patient";
import { GeminiRequestError, callGemini, countTokens } from "./lib/gemini-client";
import { describeGeminiFailure, type GeminiFailure } from "./lib/gemini-errors";
import { MODULE_CATALOG_VERSION } from "./lib/education-modules";
import {
  MODULE_SELECTOR_PROMPT,
  assembleClinicianReport,
  assemblePatientReport,
  decisionsForPrompt,
  parseModuleSelection,
  resolvePlan,
} from "./lib/module-plan";
import { extractPatientFacts, factsForSelectorPrompt } from "./lib/patient-facts";
import { LAB_REVIEW_PROMPT, labSectionOf, parseLabReview } from "./lib/lab-llm";
import { LAB_NARRATIVE_PROMPT, buildNarrativeInput, parseLabNarrative } from "./lib/lab-narrative";
import {
  DEFAULT_INPUT_TOKEN_LIMIT,
  GUIDELINE_KNOWN_CHARS,
  GUIDELINE_KNOWN_TOKENS,
  charCount,
  formatNumber,
  guidelineTokens,
} from "./lib/tokens";

type Stage = "idle" | "formatting" | "generating" | "evaluating" | "counting";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const DEFAULT_MODEL = "gemini-3.6-flash";
const CUSTOM_MODEL = "__custom__";
const GEMINI_CREDENTIAL_INPUT_ID = "dmEducationGeminiTransientCredential2026";
const DEFAULT_TIMEOUT_MINUTES = 15;
const GUIDELINE_LIKE_CHARS = 200_000;

const MODEL_OPTIONS = [
  { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash｜預設・較高品質" },
  { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite｜較快・較低成本" },
  { value: CUSTOM_MODEL, label: "自訂模型 ID" },
];

const SAMPLE_INPUT = `{
  "downloadType": "DiabetesEducation",
  "userInfo": { "資料代碼": "DEMO-001" },
  "userInput": {
    "REPORT_DATE": "2026-08-03",
    "SEX": "F",
    "T": 8,
    "DCSI": 2,
    "R1": 1,
    "PR1": 2
  },
  "rawSources": {
    "medication": {
      "rObject": [
        { "drug_date": "2026-01-20", "icd_code": "E11.9", "icd_cname": "第2型糖尿病", "drug_ename": "METFORMIN", "drug_fre": "BID", "day": 28 }
      ]
    },
    "labData": {
      "rObject": [
        { "fee_ym": "202601", "order_code": "09006C", "order_name": "糖化血色素", "assay_item_name": "HbA1c", "assay_value": "8.2", "unit_data": "%", "consult_value": "4.0-6.0" }
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

function charLabel(value: string) {
  return `${formatNumber(charCount(value))} 字`;
}

function verdictFromEval(value: string) {
  const jsonStatus = value.match(/"audit_status"\s*:\s*"(PASS|REVISE|FAIL)"/i)?.[1]?.toUpperCase();
  const textStatus = value.match(/(?:^|\n)\s*(?:##\s*稽核結論\s*\n\s*)?(PASS|REVISE|NEEDS_REVIEW|FAIL)\b/im)?.[1]?.toUpperCase();
  const status = jsonStatus || textStatus;
  if (status === "FAIL") return { label: "FAIL", tone: "danger" };
  if (status === "REVISE") return { label: "REVISE", tone: "warning" };
  if (status === "NEEDS_REVIEW") return { label: "需人工覆核", tone: "warning" };
  if (status === "PASS") return { label: "PASS", tone: "success" };
  return { label: "已完成", tone: "neutral" };
}

function BlockerList({ blockers, label }: { blockers: Blocker[]; label: string }) {
  if (!blockers.length) return null;
  return (
    <div className="blockerList" role="status">
      <strong>{label}</strong>
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

function CompositionPanel({ input, title, note }: { input: ComposedInput; title: string; note?: string }) {
  const overLimit = input.totalTokens > DEFAULT_INPUT_TOKEN_LIMIT;
  const percent = Math.min(999, Math.round((input.totalTokens / DEFAULT_INPUT_TOKEN_LIMIT) * 100));
  return (
    <details className="compositionPanel">
      <summary>
        {title}：約 {formatNumber(input.totalTokens)} tokens（{formatNumber(input.totalChars)} 字）
        <span className={overLimit ? "limitBadge over" : "limitBadge"}>模型上限的 {percent}%</span>
      </summary>
      <table>
        <tbody>
          {input.parts.map((part) => (
            <tr key={part.label}>
              <th>{part.label}</th>
              <td>{formatNumber(part.chars)} 字</td>
              <td>
                約 {formatNumber(part.tokens)} tokens
                <em>{part.method === "measured" ? "實測" : "估算"}</em>
              </td>
            </tr>
          ))}
          <tr className="totalRow">
            <th>合計</th>
            <td>{formatNumber(input.totalChars)} 字</td>
            <td>約 {formatNumber(input.totalTokens)} tokens</td>
          </tr>
        </tbody>
      </table>
      <p>
        {note ? `${note} ` : ""}
        {input.hasEstimate
          ? "標示「估算」的段落是以字元組成推估，誤差在指引全文上約 0.1%，其他文字可能更大；需要精確值請按「用 countTokens 精算」。"
          : "所有段落都是 Gemini 官方實測值。"}
      </p>
    </details>
  );
}

export default function Home() {
  const [rawInput, setRawInput] = useState("");
  const [llmText, setLlmText] = useState("");
  const [fileName, setFileName] = useState("");
  const [inputTab, setInputTab] = useState<"raw" | "formatted">("raw");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [modelChoice, setModelChoice] = useState(DEFAULT_MODEL);
  const [customModel, setCustomModel] = useState("");
  const [armCPromptId, setArmCPromptId] = useState<"selector" | "labReview" | "narrative">("selector");
  const [generatorPresetId, setGeneratorPresetId] = useState<PromptPresetId>("workbench");
  const [evalPresetId, setEvalPresetId] = useState<PromptPresetId>("workbench");
  const [generatorPrompt, setGeneratorPrompt] = useState(WORKBENCH_GENERATOR_PROMPT);
  const [evalPrompt, setEvalPrompt] = useState(WORKBENCH_EVAL_PROMPT);
  const [guidelineText, setGuidelineText] = useState("");
  const [guidelineFileName, setGuidelineFileName] = useState("");
  const [guidelineMeasuredTokens, setGuidelineMeasuredTokens] = useState<number | null>(null);
  const [arm, setArm] = useState<ArmId>("A");
  const [report, setReport] = useState("");
  const [clinicianTrace, setClinicianTrace] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeoutMinutes, setTimeoutMinutes] = useState(DEFAULT_TIMEOUT_MINUTES);
  const [failure, setFailure] = useState<GeminiFailure | null>(null);
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const guidelineInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  const busy = stage !== "idle";
  const verdict = useMemo(() => verdictFromEval(evaluation), [evaluation]);
  const model = modelChoice === CUSTOM_MODEL ? customModel.trim() : modelChoice;
  const armDef = armById(arm);
  const armCPrompt =
    armCPromptId === "labReview" ? LAB_REVIEW_PROMPT : armCPromptId === "narrative" ? LAB_NARRATIVE_PROMPT : MODULE_SELECTOR_PROMPT;
  const includeGuideline = arm === "B";

  const onGitHubPages =
    typeof window !== "undefined" && window.location.hostname.endsWith("github.io");

  const parsedRawJson = useMemo<unknown>(() => {
    const trimmed = rawInput.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }, [rawInput]);

  const patientFacts = useMemo(
    () => (parsedRawJson ? extractPatientFacts(parsedRawJson) : null),
    [parsedRawJson],
  );

  const generationInput = useMemo<ComposedInput>(() => {
    if (arm === "C") {
      // 輔助判讀器要看到程式已經決定的事，才不會重複判定或提出無效的優先項。
      const factsText = patientFacts
        ? `${factsForSelectorPrompt(patientFacts)}\n\n${decisionsForPrompt(resolvePlan(null, patientFacts))}`
        : "";
      // 一次按下會並行送出三個請求，估算要是三者的總和。
      return buildArmCInput({
        selectorPrompt: MODULE_SELECTOR_PROMPT,
        factsText,
        labReviewPrompt: LAB_REVIEW_PROMPT,
        labText: labSectionOf(llmText),
        narrativePrompt: LAB_NARRATIVE_PROMPT,
        narrativeText: patientFacts ? buildNarrativeInput(llmText, patientFacts) : "",
      });
    }
    return buildGenerationInput({
      systemPrompt: generatorPrompt,
      patientText: llmText,
      includeGuideline,
      guidelineText,
    });
  }, [arm, patientFacts, generatorPrompt, llmText, includeGuideline, guidelineText]);

  const evalInput = useMemo<ComposedInput>(
    () =>
      buildEvalInput({
        systemPrompt: evalPrompt,
        patientText: llmText,
        report,
        includeGuideline,
        guidelineText,
      }),
    [evalPrompt, llmText, report, includeGuideline, guidelineText],
  );

  const baseState: Omit<WorkbenchState, "totalTokens"> = {
    arm,
    llmText,
    rawInput,
    generatorPrompt,
    evalPrompt,
    report,
    model,
    apiKey,
    requiresClientKey: onGitHubPages,
    guidelineText,
    tokenLimit: DEFAULT_INPUT_TOKEN_LIMIT,
  };

  const genBlockers = useMemo(() => {
    const list = generateBlockers({ ...baseState, totalTokens: generationInput.totalTokens });
    if (arm === "C" && !parsedRawJson) {
      list.push({
        code: "arm-c-needs-json",
        message: "C（模組選擇流程）需要原始 JSON 病人資料才能做確定性事實抽取。",
        howToFix: "請在步驟 01 上傳或貼上原始 JSON。純文字輸入無法使用 C。",
        hard: true,
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arm, llmText, rawInput, generatorPrompt, model, apiKey, onGitHubPages, guidelineText, generationInput.totalTokens, parsedRawJson]);

  const evBlockers = useMemo(
    () => evalBlockers({ ...baseState, totalTokens: evalInput.totalTokens }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [arm, llmText, evalPrompt, report, model, apiKey, onGitHubPages, guidelineText, evalInput.totalTokens],
  );

  const guidelineCount = useMemo(() => {
    if (guidelineMeasuredTokens !== null) {
      return { tokens: guidelineMeasuredTokens, method: "measured" as const };
    }
    return guidelineTokens(guidelineText);
  }, [guidelineText, guidelineMeasuredTokens]);

  useEffect(() => {
    if (runStartedAt === null) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - runStartedAt) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [runStartedAt]);

  useEffect(() => {
    if (failure && bannerRef.current) {
      bannerRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [failure]);

  function fail(title: string, advice: string) {
    setFailure({ title, advice, raw: "", status: null, aborted: false, timedOut: false });
  }

  function chooseGeneratorPreset(presetId: PromptPresetId) {
    setGeneratorPresetId(presetId);
    if (presetId === "custom") return;
    const preset = GENERATOR_PROMPT_PRESETS.find((item) => item.id === presetId);
    if (preset) setGeneratorPrompt(preset.prompt);
  }

  function chooseEvalPreset(presetId: PromptPresetId) {
    setEvalPresetId(presetId);
    if (presetId === "custom") return;
    const preset = EVAL_PROMPT_PRESETS.find((item) => item.id === presetId);
    if (preset) setEvalPrompt(preset.prompt);
  }

  function restoreGeneratorPrompt() {
    chooseGeneratorPreset(generatorPresetId === "custom" ? "workbench" : generatorPresetId);
  }

  function restoreEvalPrompt() {
    chooseEvalPreset(evalPresetId === "custom" ? "workbench" : evalPresetId);
  }

  async function readGuidelineFile(file: File) {
    setFailure(null);
    if (file.size > MAX_FILE_BYTES) {
      fail("指引 TXT 超過 5 MB", "請確認是否選到正確的檔案；本工具不會自動截斷指引。");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".txt")) {
      fail("指引目前只支援 TXT", "請先把 PDF 轉成純文字 TXT 再載入。");
      return;
    }
    const text = await file.text();
    if (!text.trim()) {
      fail("指引 TXT 沒有可用文字", "檔案讀起來是空的，請確認轉檔結果。");
      return;
    }
    setGuidelineText(text);
    setGuidelineFileName(file.name);
    setGuidelineMeasuredTokens(null);
    const chars = charCount(text);
    setNotice(
      chars === GUIDELINE_KNOWN_CHARS
        ? `已載入指引：${formatNumber(chars)} 字元，與已知全文完全相同，token 數採用官方實測值 ${formatNumber(GUIDELINE_KNOWN_TOKENS)}。`
        : `已載入指引：${formatNumber(chars)} 字元。與已知全文（${formatNumber(GUIDELINE_KNOWN_CHARS)} 字元）不同，token 數為估算值。`,
    );
  }

  function onGuidelineFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void readGuidelineFile(file);
    event.target.value = "";
  }

  async function readFile(file: File) {
    setFailure(null);
    if (file.size > MAX_FILE_BYTES) {
      fail("檔案超過 5 MB", "請先縮小檔案再上傳。");
      return;
    }
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".json") && !lower.endsWith(".txt")) {
      fail("目前只支援 JSON 與 TXT", "請改用 .json 或 .txt 檔案。");
      return;
    }
    const text = await file.text();

    // 把指引 TXT 拖進病人資料區是常見誤操作，會覆蓋病人資料並清空整理結果。
    if (charCount(text) > GUIDELINE_LIKE_CHARS && text.includes("糖尿病臨床照護指引")) {
      fail(
        "這個檔案看起來是指引全文，不是病人資料",
        "已經略過，沒有覆蓋你目前的病人資料。指引請用下方「載入指引 TXT」按鈕載入。",
      );
      return;
    }

    setRawInput(text);
    setFileName(file.name);
    setLlmText("");
    setReport("");
    setClinicianTrace("");
    setEvaluation("");
    setInputTab("raw");
    setNotice("已載入新的病人資料，請重新按「整理為 LLM 好讀文字」。");
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void readFile(file);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void readFile(file);
  }

  function formatInput() {
    setFailure(null);
    setNotice("");
    if (!rawInput.trim()) {
      fail("還沒有病人資料", "請先上傳檔案、貼上文字，或按「載入去識別示範」。");
      return;
    }
    setStage("formatting");
    try {
      const trimmed = rawInput.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        setLlmText(formatPatientJson(JSON.parse(trimmed) as unknown));
      } else {
        setLlmText(trimmed);
      }
      setInputTab("formatted");
      setReport("");
      setClinicianTrace("");
      setEvaluation("");
    } catch {
      fail(
        "這段內容看起來像 JSON，但格式無法解析",
        "請檢查括號、逗號或引號是否成對；也可以改用 TXT 純文字輸入。",
      );
    } finally {
      setStage("idle");
    }
  }

  async function runGemini(systemPrompt: string, input: string, signal: AbortSignal) {
    // 開發時可用 ?simulate=html|400|429|404|slow|empty 重現各種失敗，不需要真的金鑰。
    const simulate =
      import.meta.env.DEV && typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("simulate") ?? undefined
        : undefined;

    return callGemini({
      apiKey,
      model,
      systemPrompt,
      input,
      signal,
      direct: onGitHubPages,
      timeoutMs: timeoutMinutes * 60 * 1000,
      simulate,
    });
  }

  async function generateReport(): Promise<string> {
    setFailure(null);
    setNotice("");
    if (hasHardBlocker(genBlockers)) {
      const first = genBlockers.find((item) => item.hard);
      if (first) fail(first.message, first.howToFix);
      return "";
    }

    setStage("generating");
    setRunStartedAt(Date.now());
    setElapsedSeconds(0);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (arm === "C") {
        if (!patientFacts) throw new Error("缺少可用的 JSON 病人資料。");
        const options = {
          // 報告是現在產出的；來源的 REPORT_DATE 只代表資料到哪一天。
          reportDate: new Date().toISOString().slice(0, 10),
          dataCutoff: patientFacts.dataCutoff.known ? patientFacts.dataCutoff.value : null,
        };
        // 三次呼叫互相獨立，並行跑。任何一次失敗都不擋住其餘——
        // 缺了檢驗敘述就退回程式組出的固定句型，缺了判讀就少一節，
        // 但主題判定與指引目標完全不依賴 LLM，報告一定產得出來。
        const labInput = labSectionOf(llmText);
        const settled = await Promise.allSettled([
          runGemini(MODULE_SELECTOR_PROMPT, generationInput.text, controller.signal),
          runGemini(LAB_REVIEW_PROMPT, labInput, controller.signal),
          runGemini(LAB_NARRATIVE_PROMPT, buildNarrativeInput(llmText, patientFacts), controller.signal),
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

        const plan = resolvePlan(selection, patientFacts);
        const assembled = assemblePatientReport(plan, { ...options, labNarrative: labNarrative ?? undefined });
        setReport(assembled);
        setClinicianTrace(
          assembleClinicianReport(plan, patientFacts, { ...options, labReview: labReview ?? undefined }),
        );
        setEvaluation("");

        const full = plan.decisions.filter((item) => item.kind !== "excluded" && item.kind !== "prevention-moderate").length;
        const failed = [
          selection ? null : "模組挑選",
          labReview ? null : "檢驗判讀",
          labNarrative ? null : "檢驗敘述",
        ].filter(Boolean);
        const flags = [
          labNarrative?.foundAfterAll.length
            ? `⚠ 敘述器在紀錄中找到程式判定為缺檢的 ${labNarrative.foundAfterAll.length} 項，項目名稱比對有漏`
            : null,
          labNarrative?.unverifiedValues.length
            ? `⚠ 敘述引用了 ${labNarrative.unverifiedValues.length} 個來源中找不到的數值`
            : null,
          labReview?.unverifiedValues.length
            ? `⚠ 判讀引用了 ${labReview.unverifiedValues.length} 個來源中找不到的數值`
            : null,
        ].filter(Boolean);
        setNotice(
          [
            `完成：程式依 R／PR 納入 ${full} 個併發症主題、${plan.moderateTopics.length} 個簡短提醒、${plan.selfCareModuleIds.length} 個自我照護模組。`,
            failed.length ? `${failed.join("、")}未取得，該部分已退回程式輸出。` : "三次 LLM 呼叫全部成功。",
            ...flags,
          ].join(" "),
        );
        return assembled;
      }

      const result = await runGemini(generatorPrompt, generationInput.text, controller.signal);
      setReport(result.text);
      setClinicianTrace("");
      setEvaluation("");
      return result.text;
    } catch (cause) {
      if (cause instanceof GeminiRequestError) {
        if (!cause.failure.aborted) setFailure(cause.failure);
      } else {
        setFailure(describeGeminiFailure({ cause }));
      }
      return "";
    } finally {
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
      setRunStartedAt(null);
      setStage("idle");
    }
  }

  async function evaluateReport(reportOverride?: string) {
    setFailure(null);
    const reportToEvaluate = reportOverride || report;
    const blockers = evalBlockers({
      ...baseState,
      report: reportToEvaluate,
      totalTokens: evalInput.totalTokens,
    });
    if (hasHardBlocker(blockers)) {
      const first = blockers.find((item) => item.hard);
      if (first) fail(first.message, first.howToFix);
      return;
    }

    setStage("evaluating");
    setRunStartedAt(Date.now());
    setElapsedSeconds(0);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const composed = buildEvalInput({
        systemPrompt: evalPrompt,
        patientText: llmText,
        report: reportToEvaluate,
        includeGuideline,
        guidelineText,
      });
      const result = await runGemini(evalPrompt, composed.text, controller.signal);
      setEvaluation(result.text);
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

  function stopCurrentRequest() {
    abortControllerRef.current?.abort();
  }

  async function generateAndEvaluate() {
    const generated = await generateReport();
    if (generated) await evaluateReport(generated);
  }

  async function measureGuidelineTokens() {
    setFailure(null);
    if (!guidelineText.trim()) {
      fail("還沒載入指引", "請先按「載入指引 TXT」。");
      return;
    }
    if (onGitHubPages && !apiKey.trim()) {
      fail("精算需要 Gemini 金鑰", "請先在上方輸入金鑰；countTokens 不會產生生成費用。");
      return;
    }
    setStage("counting");
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const total = await countTokens({
        apiKey,
        model,
        text: guidelineText,
        direct: onGitHubPages,
        signal: controller.signal,
      });
      setGuidelineMeasuredTokens(total);
      setNotice(`countTokens 實測：指引全文為 ${formatNumber(total)} tokens。`);
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

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1600);
  }

  function resetAll() {
    setRawInput("");
    setLlmText("");
    setFileName("");
    setReport("");
    setClinicianTrace("");
    setEvaluation("");
    setFailure(null);
    setNotice("");
    setInputTab("raw");
  }

  const generateDisabled = busy || hasHardBlocker(genBlockers);
  const evaluateDisabled = busy || hasHardBlocker(evBlockers);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="糖衛工作台首頁">
          <span className="brandMark">糖衛</span>
          <span>報告工作台</span>
        </a>
        <div className="topMeta">
          <span className="privacyPill"><span className="statusDot" />不寫入本站資料庫</span>
          <span className="modelPill">金鑰僅暫存本頁</span>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="heroCopy">
          <p className="eyebrow">DIABETES EDUCATION REPORT LAB</p>
          <h1>從病人資料，到可讀的衛教報告與品質稽核。</h1>
          <p className="heroLead">
            上傳 JSON、TXT 或直接貼上文字；先確認 LLM 好讀版本，再用可編輯的 prompt 生成報告並獨立稽核。
          </p>
        </div>
        <div className="flowMap" aria-label="處理流程">
          <div><span>01</span><strong>整理資料</strong><small>保留來源與限制</small></div>
          <i>→</i>
          <div><span>02</span><strong>生成報告</strong><small>自訂 system prompt</small></div>
          <i>→</i>
          <div><span>03</span><strong>品質稽核</strong><small>看見風險與修改建議</small></div>
        </div>
      </section>

      {failure && (
        <div className="errorBanner" role="alert" ref={bannerRef}>
          <strong>目前無法繼續</strong>
          <span>
            <b>{failure.title}</b>
            <i>{failure.advice}</i>
            {failure.raw && <code>原始錯誤：{failure.raw}</code>}
          </span>
          <button onClick={() => setFailure(null)} aria-label="關閉錯誤訊息">×</button>
        </div>
      )}

      {notice && !failure && (
        <div className="noticeBanner" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label="關閉提示">×</button>
        </div>
      )}

      <section className="workspace">
        <article className="stepCard inputCard">
          <div className="stepHeading">
            <div className="stepNumber">01</div>
            <div>
              <p>INPUT</p>
              <h2>病人資料整理</h2>
              <span>JSON 會在瀏覽器內轉成文字；TXT 與貼上的純文字會保留原文。</span>
            </div>
          </div>

          <div className="inputGrid">
            <div
              className={`dropZone ${dragging ? "dragging" : ""}`}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.txt,application/json,text/plain"
                onChange={onFileChange}
                hidden
              />
              <div className="fileGlyph">JSON<br />TXT</div>
              <div>
                <strong>{fileName || "拖曳檔案到這裡"}</strong>
                <p>{fileName ? `${charLabel(rawInput)}，可重新上傳替換` : "支援 .json、.txt，單檔上限 5 MB"}</p>
              </div>
              <button className="secondaryButton" onClick={() => fileInputRef.current?.click()}>
                選擇檔案
              </button>
            </div>

            <div className="editorShell inputEditor">
              <div className="editorToolbar">
                <div className="tabs" role="tablist" aria-label="病人資料版本">
                  <button className={inputTab === "raw" ? "active" : ""} onClick={() => setInputTab("raw")}>原始輸入</button>
                  <button className={inputTab === "formatted" ? "active" : ""} onClick={() => setInputTab("formatted")}>LLM 好讀文字</button>
                </div>
                <span>{charLabel(inputTab === "raw" ? rawInput : llmText)}</span>
              </div>
              <textarea
                aria-label={inputTab === "raw" ? "原始病人資料" : "LLM好讀病人資料"}
                value={inputTab === "raw" ? rawInput : llmText}
                onChange={(event) => inputTab === "raw" ? setRawInput(event.target.value) : setLlmText(event.target.value)}
                placeholder={inputTab === "raw" ? "在此貼上 JSON 或純文字病人資料…" : "整理後的文字會顯示在這裡，您仍可手動修改。"}
                spellCheck={false}
              />
            </div>
          </div>

          <div className="cardActions splitActions">
            <div className="inlineActions">
              <button className="primaryButton" onClick={formatInput} disabled={busy}>
                整理為 LLM 好讀文字
              </button>
              <button
                className="textButton"
                onClick={() => {
                  setRawInput(SAMPLE_INPUT);
                  setFileName("示範資料.json");
                  setInputTab("raw");
                  setLlmText("");
                  setNotice("已載入示範資料，請按「整理為 LLM 好讀文字」。");
                }}
                disabled={busy}
              >
                載入去識別示範
              </button>
            </div>
            <div className="inlineActions">
              {llmText && <button className="textButton" onClick={() => void copy(llmText, "資料")}>{copied === "資料" ? "已複製" : "複製整理文字"}</button>}
              {llmText && <button className="textButton" onClick={() => downloadText("病人資料_整理版_for_llm.txt", llmText)}>下載 TXT</button>}
              {(rawInput || llmText) && <button className="dangerTextButton" onClick={resetAll}>清除本頁資料</button>}
            </div>
          </div>
        </article>

        <article className="stepCard generatorCard">
          <div className="stepHeading">
            <div className="stepNumber">02</div>
            <div>
              <p>GENERATE</p>
              <h2>生成糖尿病衛教報告</h2>
              <span>prompt 與模型都可修改；API 金鑰僅在執行時使用，不會寫入本站。</span>
            </div>
          </div>

          <div className="guidelinePanel">
            <div className="guidelinePanelCopy">
              <span className="guidelineEyebrow">GUIDELINE A/B/C TEST</span>
              <strong>流程比較</strong>
              <p>{armDef.description}</p>
            </div>
            <div className="guidelineControls">
              <input ref={guidelineInputRef} type="file" accept=".txt,text/plain" onChange={onGuidelineFileChange} hidden />
              <select
                className="textInput guidelineSelect"
                aria-label="選擇生成流程"
                value={arm}
                onChange={(event) => setArm(event.target.value as ArmId)}
                disabled={busy}
              >
                {ARMS.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
              <button className="secondaryButton" onClick={() => guidelineInputRef.current?.click()} disabled={busy}>
                {guidelineText ? "更換指引 TXT" : "載入指引 TXT"}
              </button>
              {guidelineText && (
                <>
                  <button className="secondaryButton" onClick={() => void measureGuidelineTokens()} disabled={busy}>
                    {stage === "counting" ? "精算中…" : "用 countTokens 精算"}
                  </button>
                  <button
                    className="dangerTextButton"
                    onClick={() => {
                      setGuidelineText("");
                      setGuidelineFileName("");
                      setGuidelineMeasuredTokens(null);
                      if (arm === "B") setArm("A");
                    }}
                    disabled={busy}
                  >
                    移除指引
                  </button>
                </>
              )}
            </div>

            <dl className="guidelineFacts">
              <div>
                <dt>指引是否已載入</dt>
                <dd className={guidelineText ? "ok" : "missing"}>
                  {guidelineText ? `已載入：${guidelineFileName}` : "尚未載入"}
                </dd>
              </div>
              <div>
                <dt>指引字元數</dt>
                <dd>{guidelineText ? `${formatNumber(charCount(guidelineText))} 字元` : "—"}</dd>
              </div>
              <div>
                <dt>指引 token 數</dt>
                <dd>
                  {guidelineText
                    ? `${formatNumber(guidelineCount.tokens)} tokens（${guidelineCount.method === "measured" ? "實測" : "估算"}）`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>本次生成會帶入指引</dt>
                <dd className={generationInput.guidelineIncluded ? "ok" : "missing"}>
                  {generationInput.guidelineIncluded ? "會帶入" : "不會帶入"}
                  {generationInput.guidelineRequestedButMissing && "（已選 B 但指引是空的）"}
                </dd>
              </div>
              <div>
                <dt>本次稽核會帶入指引</dt>
                <dd className={evalInput.guidelineIncluded ? "ok" : "missing"}>
                  {evalInput.guidelineIncluded ? "會帶入" : "不會帶入"}
                </dd>
              </div>
            </dl>

            <p className="guidelinePrivacy">
              指引只保留在本頁；選擇 B 並執行時才會隨請求送出，不寫入本站資料庫。整份指引會明顯增加輸入量、等待時間與費用。
              本工具在任何情況下都不會自動截斷指引或病人資料。
              {arm === "C" && ` C 使用模組目錄 ${MODULE_CATALOG_VERSION}，尚未經醫療團隊核准，組出的報告只能用於流程比較。`}
            </p>
          </div>

          <div className="twoColumns">
            <div className="settingsPane">
              <div className="credentialBox">
                <div className="labelRow credentialLabelRow">
                  <label className="fieldLabel" htmlFor={GEMINI_CREDENTIAL_INPUT_ID}>Gemini 臨時存取金鑰</label>
                  <span>重新整理即清除</span>
                </div>
                <div className="passwordRow">
                  <input
                    id={GEMINI_CREDENTIAL_INPUT_ID}
                    name="dmEducationGeminiTransientCredentialManualEntry"
                    className="textInput apiKeyInput"
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="請手動貼上本次使用的 Gemini 金鑰"
                    autoComplete="new-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    spellCheck={false}
                  />
                  <button type="button" className="showKeyButton" onClick={() => setShowApiKey((current) => !current)}>
                    {showApiKey ? "隱藏" : "顯示"}
                  </button>
                </div>
                <p className="fieldNote">只暫存在本頁記憶體，不寫入資料庫或瀏覽器儲存空間。GitHub Pages 版會由瀏覽器直接傳給 Google Gemini；私人站版則透過本站伺服器。請只在可信任的網址輸入金鑰。</p>
              </div>

              <label className="fieldLabel modelLabel" htmlFor="model">Gemini 模型</label>
              <select
                id="model"
                className="textInput selectInput"
                value={modelChoice}
                onChange={(event) => setModelChoice(event.target.value)}
              >
                {MODEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {modelChoice === CUSTOM_MODEL && (
                <input
                  className="textInput customModelInput"
                  aria-label="自訂Gemini模型ID"
                  value={customModel}
                  onChange={(event) => setCustomModel(event.target.value)}
                  placeholder="例如 gemini-flash-latest"
                  spellCheck={false}
                />
              )}
              <p className="fieldNote">生成與品質稽核目前使用同一個模型；選擇自訂時請輸入 Gemini API 支援的模型 ID。</p>

              <label className="fieldLabel modelLabel" htmlFor="timeout">單次請求逾時上限（分鐘）</label>
              <input
                id="timeout"
                className="textInput"
                type="number"
                min={1}
                max={60}
                value={timeoutMinutes}
                onChange={(event) => setTimeoutMinutes(Math.max(1, Math.min(60, Number(event.target.value) || DEFAULT_TIMEOUT_MINUTES)))}
              />
              <p className="fieldNote">帶入指引全文時單次可能需要數分鐘。逾時會明確顯示為逾時，與你按「停止」區分。</p>

              <label className="fieldLabel promptPresetLabel" htmlFor="generatorPromptPreset">生成規則版本</label>
              <select
                id="generatorPromptPreset"
                className="textInput selectInput"
                value={generatorPresetId}
                onChange={(event) => chooseGeneratorPreset(event.target.value as PromptPresetId)}
                disabled={arm === "C"}
              >
                {GENERATOR_PROMPT_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
                <option value="custom">自訂內容（目前文字）</option>
              </select>
              <p className="fieldNote">
                {arm === "C"
                  ? "C 使用固定的模組選擇器 prompt，不使用這裡的生成 prompt。"
                  : generatorPresetId === "custom"
                    ? "下方文字已手動修改，重新整理頁面後不會保留。"
                    : GENERATOR_PROMPT_PRESETS.find((preset) => preset.id === generatorPresetId)?.description}
              </p>

              <div className="labelRow">
                <label className="fieldLabel" htmlFor="generatorPrompt">
                  {arm === "C" ? "三次呼叫使用的 system prompt（唯讀）" : "生成用 system prompt"}
                </label>
                {arm === "C" ? (
                  <select
                    className="textInput"
                    value={armCPromptId}
                    onChange={(event) => setArmCPromptId(event.target.value as typeof armCPromptId)}
                  >
                    <option value="selector">① 模組挑選（只回代碼與優先序）</option>
                    <option value="labReview">② 檢驗判讀（進醫師版）</option>
                    <option value="narrative">③ 檢驗敘述（進病人版）</option>
                  </select>
                ) : null}
                <button className="miniButton" onClick={restoreGeneratorPrompt}>
                  {generatorPresetId === "custom" ? "恢復工作台預設" : "重新載入此版本"}
                </button>
              </div>
              <textarea
                id="generatorPrompt"
                className="promptEditor"
                value={arm === "C" ? armCPrompt : generatorPrompt}
                onChange={(event) => { setGeneratorPrompt(event.target.value); setGeneratorPresetId("custom"); }}
                readOnly={arm === "C"}
                spellCheck={false}
              />
              <p className="fieldNote">病人資料會自動接在 system prompt 後送出，不必複製到 prompt 內。</p>
            </div>

            <div className="outputPane">
              <div className="outputHeader">
                <div><span className="outputDot teal" /><strong>{arm === "C" ? "組合後的病人版報告" : "Gemini 報告"}</strong></div>
                <span>{report ? charLabel(report) : "等待生成"}</span>
              </div>
              <textarea
                aria-label="Gemini產生的糖尿病衛教報告"
                className="outputEditor"
                value={report}
                onChange={(event) => { setReport(event.target.value); setEvaluation(""); }}
                placeholder="產生的報告會顯示在這裡。您可以人工修改後，再送交 eval LLM 稽核。"
                spellCheck={false}
              />
              <div className="outputActions">
                <button onClick={() => void copy(report, "報告")} disabled={!report}>{copied === "報告" ? "已複製" : "複製"}</button>
                <button onClick={() => downloadText("糖尿病衛教報告.txt", report)} disabled={!report}>下載 TXT</button>
              </div>
              {clinicianTrace && (
                <details className="tracePanel" open>
                  <summary>醫師版報告（含 DCSI、R1–R7、PR1–PR7 代碼與分數，病人版不顯示）</summary>
                  <pre>{clinicianTrace}</pre>
                  <div className="traceActions">
                    <button onClick={() => void copy(clinicianTrace, "醫師版")}>
                      {copied === "醫師版" ? "已複製" : "複製醫師版"}
                    </button>
                    <button onClick={() => downloadText("糖尿病衛教報告_醫師版.txt", clinicianTrace)}>
                      下載醫師版 TXT
                    </button>
                  </div>
                </details>
              )}
            </div>
          </div>

          <div className="cardActionsColumn">
            <CompositionPanel
              input={generationInput}
              title="本次生成會送出的輸入"
              note={arm === "C" ? "C 只送出精簡事實摘要，不送原始申報明細，也不送指引。" : undefined}
            />
            <BlockerList blockers={genBlockers} label="目前不能生成的原因" />
            <div className="cardActions">
              <button className="primaryButton" onClick={() => void generateReport()} disabled={generateDisabled}>
                {stage === "generating" ? <><span className="spinner" />{arm === "C" ? "三次呼叫並行中" : "Gemini 生成中"}… {elapsedSeconds} 秒</> : arm === "C" ? "一鍵產出兩份報告" : "生成衛教報告"}
              </button>
              <button className="secondaryButton runAll" onClick={() => void generateAndEvaluate()} disabled={generateDisabled}>
                生成並接續稽核
              </button>
              {stage === "generating" && (
                <button className="stopButton" onClick={stopCurrentRequest}>停止生成</button>
              )}
            </div>
          </div>
        </article>

        <article className="stepCard evalCard">
          <div className="stepHeading">
            <div className="stepNumber">03</div>
            <div>
              <p>EVALUATE</p>
              <h2>獨立品質稽核</h2>
              <span>eval LLM 同時看到整理後病人資料與待評估報告。</span>
            </div>
          </div>

          <div className="twoColumns">
            <div className="settingsPane">
              <label className="fieldLabel" htmlFor="evalPromptPreset">稽核規則版本</label>
              <select
                id="evalPromptPreset"
                className="textInput selectInput"
                value={evalPresetId}
                onChange={(event) => chooseEvalPreset(event.target.value as PromptPresetId)}
              >
                {EVAL_PROMPT_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
                <option value="custom">自訂內容（目前文字）</option>
              </select>
              <p className="fieldNote">
                {evalPresetId === "custom"
                  ? "下方文字已手動修改，重新整理頁面後不會保留。"
                  : EVAL_PROMPT_PRESETS.find((preset) => preset.id === evalPresetId)?.description}
              </p>
              {evalPresetId === "colleague" && !includeGuideline && (
                <p className="promptWarning">
                  這個版本假設稽核模型已取得臨床指引；目前流程選的是 {arm}，不會自動附上兩份 PDF，因此輸出的指引章節與引用仍需人工核對。
                </p>
              )}

              <div className="labelRow">
                <label className="fieldLabel" htmlFor="evalPrompt">eval LLM system prompt</label>
                <button className="miniButton" onClick={restoreEvalPrompt}>
                  {evalPresetId === "custom" ? "恢復工作台預設" : "重新載入此版本"}
                </button>
              </div>
              <textarea
                id="evalPrompt"
                className="promptEditor evalPrompt"
                value={evalPrompt}
                onChange={(event) => { setEvalPrompt(event.target.value); setEvalPresetId("custom"); }}
                spellCheck={false}
              />
              <div className="evalInputMap">
                <span>稽核輸入</span>
                <strong>病人資料</strong><i>＋</i><strong>報告</strong><i>＋</i><strong>評分規則</strong>
                {evalInput.guidelineIncluded && <><i>＋</i><strong>指引全文</strong></>}
              </div>
            </div>

            <div className="outputPane evalOutput">
              <div className="outputHeader">
                <div><span className="outputDot amber" /><strong>稽核結果</strong></div>
                {evaluation ? <span className={`verdict ${verdict.tone}`}>{verdict.label}</span> : <span>等待稽核</span>}
              </div>
              <textarea
                aria-label="eval LLM稽核結果"
                className="outputEditor"
                value={evaluation}
                onChange={(event) => setEvaluation(event.target.value)}
                placeholder="這裡會列出稽核結論、分項評分、重大問題與具體修改建議。"
                spellCheck={false}
              />
              <div className="outputActions">
                <button onClick={() => void copy(evaluation, "稽核") } disabled={!evaluation}>{copied === "稽核" ? "已複製" : "複製"}</button>
                <button onClick={() => downloadText("衛教報告_稽核結果.txt", evaluation)} disabled={!evaluation}>下載 TXT</button>
              </div>
            </div>
          </div>

          <div className="cardActionsColumn">
            <CompositionPanel input={evalInput} title="本次稽核會送出的輸入" />
            <BlockerList blockers={evBlockers} label="目前不能稽核的原因" />
            <div className="cardActions">
              <button className="primaryButton amberButton" onClick={() => void evaluateReport()} disabled={evaluateDisabled}>
                {stage === "evaluating" ? <><span className="spinner" />品質稽核中… {elapsedSeconds} 秒</> : "執行品質稽核"}
              </button>
              {stage === "evaluating" && (
                <button className="stopButton" onClick={stopCurrentRequest}>停止稽核</button>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="safetyNote">
        <div className="safetyIcon">i</div>
        <div>
          <strong>上線前的必要提醒</strong>
          <p>此工具是內容生成與稽核工作台，不是診斷系統。正式提供病人前，仍應由醫療團隊核准固定衛教內容、prompt、模型版本與發送規則，並建立人工抽查及版本紀錄。</p>
        </div>
      </section>

      <footer>
        <span>糖尿病衛教報告工作台</span>
        <span>資料僅在本頁處理；按下生成或稽核時才送往 Gemini API。</span>
        <span className="buildStamp">{`build ${BUILD_ID}`}</span>
      </footer>
    </main>
  );
}
