"use client";

/**
 * 這位病人實際跑出來的判定路徑。
 *
 * 為什麼要有：上面那張流程圖畫的是「一般情況會怎麼跑」，而卡片上的
 * 「已發生 4 項／預防 0 項」只是計數。兩者都回答不了「憑什麼是這 4 項」。
 * 要判斷程式有沒有判錯，得看到每一個主題的輸入訊號（R／PR 值）、
 * 判定結果，以及依據——所以這裡把每一段都攤開，訊號在左、結果在右。
 *
 * 只呈現程式判定的部分。LLM 的三次呼叫尚未執行，最後一段講的是接下來它會補什麼。
 */

import {
  TRACE_KIND_CLASS as KIND_CLASS,
  TRACE_KIND_LABEL as KIND_LABEL,
  TRACE_SEVERITY_LABEL as SEVERITY_LABEL,
} from "./lib/content-labels";
import { MODULE_BY_ID } from "./lib/education-modules";
import { RULES_BY_ID, citationShort } from "./lib/guideline-rules";
import type { ResolvedPlan, TopicDecision } from "./lib/module-plan";
import type { PatientFacts } from "./lib/patient-facts";
import { SELF_CARE_BY_ID } from "./lib/self-care-modules";
import { SHARED_BY_ID } from "./lib/shared-care";

/** 輸入訊號原樣呈現。缺值就寫缺值——補值會讓判定看起來比實際確定。 */
function signalOf(decision: TopicDecision): string {
  const parts: string[] = [];
  if (decision.rValue !== null) parts.push(`R${decision.topic}=${decision.rValue}`);
  if (decision.prValue !== null) parts.push(`PR${decision.topic}=${decision.prValue}`);
  return parts.length ? parts.join("　") : `R${decision.topic}／PR${decision.topic} 皆缺值`;
}

function moduleTitle(id: string): string {
  return MODULE_BY_ID.get(id)?.title ?? SELF_CARE_BY_ID.get(id)?.title ?? SHARED_BY_ID.get(id)?.title ?? id;
}

/** BASE-01 與 TYPE-UNCLEAR 不是併發症主題，標成「主題」會誤導。 */
function moduleKindLabel(id: string): string {
  const topic = MODULE_BY_ID.get(id)?.topic;
  if (topic === "BASE") return "固定";
  if (topic === "TYPE") return "類型說明";
  return "主題";
}

/** 每一列都掛完整來源書名會蓋掉判定本身，這裡只留章表與頁次。 */
function shortCitation(ruleId: string | null, fallback: string | null): string | null {
  const rule = ruleId ? RULES_BY_ID.get(ruleId) : undefined;
  return rule ? citationShort(rule) : fallback;
}

function Stage({ n, title, note, count, children }: {
  n: string;
  title: string;
  note?: string;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="traceStage">
      <header className="traceStageHead">
        <span className="traceStep">{n}</span>
        <h4>{title}</h4>
        {count ? <span className="traceCount">{count}</span> : null}
      </header>
      {note ? <p className="traceNote">{note}</p> : null}
      {children}
    </section>
  );
}

export function DecisionTrace({ plan, facts }: { plan: ResolvedPlan; facts: PatientFacts }) {
  const targets = plan.targets.targets.filter((item) => item.value);
  const patientModules = plan.patientModuleIds;

  return (
    <div className="traceBoard">
      <p className="traceLead">
        以下每一段都由程式判定，不需要 API 金鑰，也不會因為換模型而改變。左邊是輸入訊號，右邊是判定結果。
      </p>

      <Stage
        n="1"
        title="併發症主題：R／PR → 納入方式"
        note="同一個主題，來源只會給 R 或 PR 其中一個。給了 R 代表已發生；只給 PR 代表尚未發生，才會有風險預測。"
        count={`${plan.decisions.filter((d) => d.kind !== "excluded").length}／${plan.decisions.length} 納入`}
      >
        <ul className="traceRows">
          {plan.decisions.map((decision) => (
            <li key={decision.topic} className={decision.kind === "excluded" ? "traceRow traceRowOff" : "traceRow"}>
              <span className="traceSignal">{signalOf(decision)}</span>
              <span className="traceArrow">→</span>
              <span className={KIND_CLASS[decision.kind]}>{KIND_LABEL[decision.kind]}</span>
              <span className="traceSubject">{decision.topicName}</span>
              <p className="traceReason">{decision.reason}</p>
            </li>
          ))}
        </ul>
      </Stage>

      <Stage
        n="2"
        title="依指引推導的目標"
        note="目標值來自門檻表，不是模型生成的。括號內是可回查的章表與頁次。"
        count={`${targets.length} 項`}
      >
        {targets.length ? (
          <ul className="traceRows">
            {targets.map((item) => (
              <li key={item.metric} className="traceRow">
                <span className="traceSignal">{item.metric}</span>
                <span className="traceArrow">→</span>
                <span className="traceValue">{item.value}</span>
                {shortCitation(item.ruleId, item.citation) ? (
                  <span className="traceCitation">{shortCitation(item.ruleId, item.citation)}</span>
                ) : null}
                <p className="traceReason">{item.reason}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="traceEmpty">沒有可解出的目標。</p>
        )}
        {plan.targets.undetermined.length ? (
          <ul className="traceNoteList">
            {/* 每一則本身就是完整句子（自帶句號），用頓號串起來會變成「。、」 */}
            {plan.targets.undetermined.map((item, index) => (
              <li key={index}>資料不足、未判定：{item}</li>
            ))}
          </ul>
        ) : null}
      </Stage>

      <Stage
        n="3"
        title="檢驗門檻判定"
        note="由實際數值觸發。這一段只做數值比對；判讀交給 LLM（下方②）。"
        count={`${plan.labThresholds.length} 則・已判定 ${plan.evaluatedAnalytes} 項指標`}
      >
        {plan.labThresholds.length ? (
          <ul className="traceRows">
            {plan.labThresholds.map((hit, index) => (
              <li key={`${hit.code}-${index}`} className="traceRow">
                <span className={`traceSeverity traceSeverity-${hit.severity}`}>
                  {SEVERITY_LABEL[hit.severity] ?? hit.severity}
                </span>
                <span className="traceArrow">→</span>
                <span className="traceValue">{hit.clinicianMessage}</span>
                {shortCitation(hit.ruleId, hit.citation) ? (
                  <span className="traceCitation">{shortCitation(hit.ruleId, hit.citation)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="traceEmpty">沒有數值達到門檻。</p>
        )}
        {plan.unevaluatedNumericItems > 0 ? (
          <p className="traceNote">
            另有 {plan.unevaluatedNumericItems} 種有數值但未納入門檻判定的項目，會交給 LLM 判讀。
          </p>
        ) : null}
      </Stage>

      <Stage
        n="4"
        title="追蹤間隔"
        note="由納入的主題決定要列哪些項目，間隔本身出自門檻表。"
        count={`${plan.followUp.rules.length} 項`}
      >
        {plan.followUp.rules.length ? (
          <ul className="traceRows">
            {plan.followUp.rules.map((rule) => (
              <li key={rule.id} className="traceRow">
                <span className="traceSignal">{rule.id}</span>
                <span className="traceArrow">→</span>
                <span className="traceValue">{rule.patientStatement ?? rule.statement}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="traceEmpty">沒有適用的固定間隔。</p>
        )}
      </Stage>

      <Stage
        n="5"
        title="自我照護模組"
        note="與併發症主題無關，依用藥、低血糖紀錄與併發症數量觸發。"
        count={`${plan.selfCareModuleIds.length} 個`}
      >
        <ul className="traceRows">
          {plan.selfCareModuleIds.map((id) => (
            <li key={id} className="traceRow">
              <span className="traceSignal">{id}</span>
              <span className="traceArrow">→</span>
              <span className="traceValue">{moduleTitle(id)}</span>
              {plan.selfCareReasons[id] ? <p className="traceReason">{plan.selfCareReasons[id]}</p> : null}
            </li>
          ))}
        </ul>
      </Stage>

      <Stage
        n="6"
        title="病人版報告的段落順序"
        note="這就是組裝結果。正文逐字來自固定模組，模型不改寫。"
        count={`${
          patientModules.length +
          plan.sharedBlockIds.length +
          plan.selfCareModuleIds.length
        } 段`}
      >
        <ol className="traceOutline">
          {patientModules.map((id) => (
            <li key={id}>
              <span className="traceOutlineTag">{moduleKindLabel(id)}</span>
              {moduleTitle(id)}
              <code>{id}</code>
            </li>
          ))}
          {plan.sharedBlockIds.map((id) => (
            <li key={id}>
              <span className="traceOutlineTag">共同</span>
              {moduleTitle(id)}
              <code>{id}</code>
            </li>
          ))}
          {plan.selfCareModuleIds.map((id) => (
            <li key={`sc-${id}`}>
              <span className="traceOutlineTag">自我照護</span>
              {moduleTitle(id)}
              <code>{id}</code>
            </li>
          ))}
        </ol>
        {plan.urgentSigns.length ? (
          <p className="traceNote">另有 {plan.urgentSigns.length} 則就醫警訊，集中放在報告開頭。</p>
        ) : null}
      </Stage>

      <Stage
        n="→"
        title="接下來 LLM 會補的三件事"
        note="按下產出才會執行。任何一次失敗都只會少掉該段，不影響上面已經定案的內容。"
      >
        <ul className="traceRows">
          <li className="traceRow">
            <span className="traceLlmTag">①</span>
            <span className="traceArrow">→</span>
            <span className="traceValue">資料稽核：找資料的矛盾與需人工確認之處，改不了上面的任何判定</span>
          </li>
          <li className="traceRow">
            <span className="traceLlmTag">②</span>
            <span className="traceArrow">→</span>
            <span className="traceValue">
              檢驗判讀：讀原始紀錄找第 3 段沒涵蓋的異常，結果進醫師版
              {facts.labItems.length ? `（原始紀錄 ${facts.labItems.length} 筆）` : ""}
            </span>
          </li>
          <li className="traceRow">
            <span className="traceLlmTag">③</span>
            <span className="traceArrow">→</span>
            <span className="traceValue">檢驗敘述：寫成病人看的段落，數值會逐一比對來源後才採用</span>
          </li>
        </ul>
      </Stage>
    </div>
  );
}
