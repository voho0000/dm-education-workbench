"use client";

/**
 * 內容庫檢視器：把報告會用到的三份固定內容攤開來讓人逐條看。
 *
 * 為什麼要有這一頁：這三份東西決定了病人實際讀到什麼字，卻只存在於原始碼裡。
 * 要醫療團隊核准「衛教模組 draft-0.2」，得先讓他們看得到 draft-0.2 是什麼。
 *
 * 唯讀。這裡不提供編輯——內容改動要走版本控制與送審，不是在頁面上改。
 *
 * 隱私：三份內容本來就會被編譯進前端 bundle（報告在瀏覽器端組裝），
 * 所以顯示它們不會多暴露任何東西。三份都不含病人資料，也不含指引原文。
 */

import { useState } from "react";
import { FlowDiagram, STATION_TO_NODES } from "./flow";
import {
  BEHAVIOR_LABEL,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  TOPIC_LABEL,
  TYPE_GATE_LABEL,
  VARIANT_WHEN_LABEL,
} from "./lib/content-labels";
import { EDUCATION_MODULES, MODULE_CATALOG_APPROVED, MODULE_CATALOG_VERSION } from "./lib/education-modules";
import {
  GUIDELINE_RULES,
  RULES_APPROVED,
  RULES_SOURCE,
  RULES_VERSION,
  citationShort,
  type GuidelineRule,
} from "./lib/guideline-rules";
import { SELF_CARE_APPROVED, SELF_CARE_MODULES, SELF_CARE_VERSION } from "./lib/self-care-modules";
import { SHARED_CARE_BLOCKS } from "./lib/shared-care";

type LibraryTab = "education" | "selfCare" | "rules";

const TABS: Array<{ id: LibraryTab; label: string }> = [
  { id: "education", label: `衛教模組 ${MODULE_CATALOG_VERSION}` },
  { id: "selfCare", label: `自我照護模組 ${SELF_CARE_VERSION}` },
  { id: "rules", label: `指引門檻表 ${RULES_VERSION}` },
];

function ApprovalBadge({ approved }: { approved: boolean }) {
  return (
    <span className={approved ? "libraryBadge libraryBadgeOk" : "libraryBadge libraryBadgeDraft"}>
      {approved ? "已核准" : "DRAFT・未經醫療團隊核准"}
    </span>
  );
}

/** 模組正文是純文字，段落之間空行。照原樣分段，不做 Markdown 解析。 */
function BodyText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, index) => (
        <p key={index} className="libraryBody">
          {para}
        </p>
      ))}
    </>
  );
}

function EducationTab() {
  return (
    <>
      <p className="fieldNote">
        病人版報告的併發症段落只會用到這裡的文字，模型不改寫。
        主題模組只留該疾病特有的內容；每份報告都講一次的通用內容集中在下方的共同區塊。
      </p>

      {EDUCATION_MODULES.map((item) => (
        <article key={item.id} className="libraryItem">
          <header className="libraryItemHead">
            <h3>{item.title}</h3>
            <code>{item.id}</code>
            <span className="libraryTag">{TOPIC_LABEL[item.topic]}</span>
            {item.typeGate !== "any" ? (
              <span className="libraryTag">{TYPE_GATE_LABEL[item.typeGate]}</span>
            ) : null}
            {item.autoOnly ? <span className="libraryTag">程式自動加入</span> : null}
          </header>
          <p className="libraryMeta">納入條件：{item.appliesWhen}</p>
          <BodyText text={item.patientText} />
          {item.urgentSigns ? (
            <p className="libraryUrgent">
              <strong>就醫警訊</strong>
              {item.urgentSigns}
            </p>
          ) : null}
        </article>
      ))}

      <h3 className="librarySubhead">共同區塊（整份報告各出現一次）</h3>
      {SHARED_CARE_BLOCKS.map((item) => (
        <article key={item.id} className="libraryItem">
          <header className="libraryItemHead">
            <h3>{item.title}</h3>
            <code>{item.id}</code>
            <span className="libraryTag">
              {item.appliesWhen === "always" ? "固定納入" : `由主題觸發：${item.appliesWhen}`}
            </span>
          </header>
          <BodyText text={item.text} />
        </article>
      ))}
    </>
  );
}

function SelfCareTab() {
  return (
    <>
      <p className="fieldNote">
        以 DSMES／ADCES7 七項自我照護行為為骨架。臨床照護指引不是為這些行為寫的，
        所以這些文字不引指引，需由醫療團隊依院內衛教單張核定。
      </p>

      {SELF_CARE_MODULES.map((item) => (
        <article key={item.id} className="libraryItem">
          <header className="libraryItemHead">
            <h3>{item.title}</h3>
            <code>{item.id}</code>
            <span className="libraryTag">{BEHAVIOR_LABEL[item.behavior] ?? item.behavior}</span>
            {item.core ? <span className="libraryTag">固定納入</span> : null}
          </header>
          <p className="libraryMeta">納入條件：{item.appliesWhen}</p>
          <BodyText text={item.patientText} />
          {item.definiteVariants?.length ? (
            <div className="libraryVariants">
              <strong>整句替換（兩句擇一，不會同時出現）</strong>
              <p className="libraryVariantHint">
                正文寫成「若…」是因為要能給所有人看。程式已從資料確認這位病人符合下列條件時，那一句改用直述句。
              </p>
              {item.definiteVariants.map((variant, index) => (
                <div key={index} className="libraryVariant">
                  <p className="libraryVariantWhen">
                    <span className="libraryTag">{VARIANT_WHEN_LABEL[variant.when] ?? variant.when}</span>
                  </p>
                  <p className="libraryVariantLine">
                    <span className="libraryVariantSide">未確認時</span>
                    <span className="libraryVariantFrom">{variant.from}</span>
                  </p>
                  <p className="libraryVariantLine">
                    <span className="libraryVariantSide libraryVariantSideOn">已確認時</span>
                    <span className="libraryVariantTo">{variant.to}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {item.urgentSigns ? (
            <p className="libraryUrgent">
              <strong>就醫警訊</strong>
              {item.urgentSigns}
            </p>
          ) : null}
        </article>
      ))}
    </>
  );
}

function RulesTab() {
  // CATEGORY_ORDER 只是顯示順序。新增類別時若忘了加進來，規則會整組看不見，
  // 而審閱的人不會發現少了什麼——所以沒列到的一律排在最後，不靜默丟掉。
  const byCategory = [
    ...CATEGORY_ORDER,
    ...GUIDELINE_RULES.map((rule) => rule.category).filter((category) => !CATEGORY_ORDER.includes(category)),
  ]
    .filter((category, index, all) => all.indexOf(category) === index)
    .map((category) => ({ category, rules: GUIDELINE_RULES.filter((rule) => rule.category === category) }))
    .filter((group) => group.rules.length > 0);

  return (
    <>
      <p className="fieldNote">
        來源：{RULES_SOURCE}。這裡記錄的是門檻數值、追蹤間隔與轉診急迫度等事實，以自己的文字陳述並附出處，
        不重製指引原文。頁次指 PDF 實體頁次，可直接跳頁核對。共 {GUIDELINE_RULES.length} 條。
      </p>

      {byCategory.map((group) => (
        <section key={group.category} className="libraryGroup">
          <h3 className="librarySubhead">
            {CATEGORY_LABEL[group.category] ?? group.category}
            <span className="libraryCount">{group.rules.length}</span>
          </h3>
          <div className="libraryTableWrap">
            <table className="libraryTable">
              <thead>
                <tr>
                  <th>適用對象</th>
                  <th>門檻／間隔（醫師版用字）</th>
                  <th>病人版用字</th>
                  <th>出處</th>
                </tr>
              </thead>
              <tbody>
                {group.rules.map((rule: GuidelineRule) => (
                  <tr key={rule.id}>
                    <td>
                      <code>{rule.id}</code>
                      <span>{rule.appliesTo}</span>
                    </td>
                    <td>{rule.statement}</td>
                    <td>
                      {rule.patientFacing ? (
                        (rule.patientStatement ?? rule.statement)
                      ) : (
                        <span className="libraryMuted">不對病人顯示</span>
                      )}
                    </td>
                    <td className="libraryCitation">{citationShort(rule)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}

export function ContentLibrary() {
  const [tab, setTab] = useState<LibraryTab>("education");

  const approved =
    tab === "education" ? MODULE_CATALOG_APPROVED : tab === "selfCare" ? SELF_CARE_APPROVED : RULES_APPROVED;

  return (
    <article className="stepCard">
      <div className="stepHeading">
        <span className="stepNumber">05</span>
        <div className="stepHeadingText">
          <p className="eyebrow">CONTENT</p>
          <h2>報告會用到的固定內容</h2>
          <p className="fieldNote">
            唯讀。併發症風險與預防叮嚀的每一句都出自這裡，模型不改寫；觀察摘要、短期建議、中期目標三段則由模型撰寫。
            內容改動走版本控制與送審，不在頁面上編輯。
          </p>
        </div>
      </div>
      <div className="stepBody">
        {/* 這三份內容在流程圖上的位置。它們是輸入，不是裝飾——門檻表決定目標與
            追蹤間隔，模組決定病人讀到的字。 */}
        <div className="pipeMap">
          <FlowDiagram highlight={STATION_TO_NODES.contentLibrary} compact />
        </div>
        <div className="tabs">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? "active" : ""}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="libraryStatus">
          <ApprovalBadge approved={approved} />
        </p>
        <div className="libraryScroll">
          {tab === "education" ? <EducationTab /> : null}
          {tab === "selfCare" ? <SelfCareTab /> : null}
          {tab === "rules" ? <RulesTab /> : null}
        </div>
      </div>
    </article>
  );
}
