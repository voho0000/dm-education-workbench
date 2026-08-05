# 糖尿病衛教報告工作台

一頁式工具，將病人 JSON、TXT 或貼上的文字整理成 LLM 好讀格式，再透過 Gemini 產生糖尿病衛教報告，並用第二組可編輯的 system prompt 完成獨立品質稽核。

## 功能

- 上傳 `.json`、`.txt`，或直接貼上文字。
- 在瀏覽器內整理 JSON；完整保留來源欄位、完全相同紀錄的重複次數與資料限制。
- 人工確認、修改、複製或下載 LLM 好讀文字。
- 編輯生成用 system prompt 與 eval LLM system prompt。
- 在頁面暫時輸入 Gemini API 金鑰；重新整理即清除，不寫入資料庫或瀏覽器儲存空間。
- 從穩定模型清單選擇模型，或自行輸入 Gemini 模型 ID；預設為 `gemini-3.6-flash`。
- 使用 Gemini 產生報告，再顯示 PASS、NEEDS_REVIEW 或 FAIL 稽核結果。
- 報告與稽核結果均可人工修改、複製與下載。

本工具不使用資料庫。病人資料與頁面輸入的 API 金鑰留在目前瀏覽器頁面，只有按下「生成」或「稽核」時才會送往本站伺服器，再由伺服器呼叫 Gemini API；API 請求設定為不儲存互動內容。請只在信任的部署網址輸入金鑰。

GitHub Pages 是純靜態版本，沒有後端伺服器；該版本會將使用者在頁面輸入的金鑰直接從瀏覽器送到 Google Gemini API。金鑰不會寫入 repository、LocalStorage 或本站資料庫，但仍可能受到使用者裝置上的惡意瀏覽器擴充功能影響。建議使用專用、受限制、有限額度且可隨時撤銷的金鑰。

## 本機啟動

需要 Node.js `>=22.13.0`。

```bash
npm install
cp .env.example .env.local
# 編輯 .env.local，填入 GEMINI_API_KEY
npm run dev
```

開啟 `http://localhost:3000`。

預設模型為 `gemini-3.6-flash`，也可直接在頁面修改模型名稱。

## 驗證

```bash
npm run lint
npm test
```

`npm test` 會完成正式建置並執行 `tests/` 下全部測試：純函式的行為測試（token 估算、輸入組裝、阻擋原因、錯誤轉譯、事實抽取、模組規則、輸出驗證器）、伺服器渲染結果，以及外洩防護（追蹤中的檔案與建置產物都不得含金鑰、指引全文或開發用模擬分支）。

指引相關的測試需要指向本機的指引 TXT，未設定時會自動略過：

```bash
DM_GUIDELINE_TXT=../output/2022第2型糖尿病臨床照護指引_全文.txt npm test
```

### 開發時重現 API 失敗

dev 模式下可用查詢參數模擬各種失敗，不需要真的金鑰（正式建置不含這段程式碼）：

```bash
open "http://localhost:3000/?simulate=html"
```

可用值：`html`（代理層回 HTML 錯誤頁）、`400`、`404`、`429`、`slow`、`empty`。

## arm C 的分層

病人可見的每一個字都由程式組合，LLM 不產生正文。

| 層 | 檔案 | 做什麼 |
|---|---|---|
| 事實抽取 | `lib/patient-facts.ts` | 申報 JSON → 型別化事實。缺值一律 unknown，不補 0 |
| 檢驗值 | `lib/lab-findings.ts` | 保守的項目名稱映射、數值解析（保留 ≧ 等不等號）、安全門檻 |
| 門檻表 | `lib/guideline-rules.ts` | 33 條指引門檻，每條帶章表與 PDF 頁碼 |
| 目標推導 | `lib/resolve-targets.ts` | 依已發生併發症與年齡解出個別化目標；判不出來就說判不出來 |
| 目標比對 | `lib/target-comparison.ts` | 每一個有數值的指標都對照目標，覆蓋不留缺口 |
| 主題判定 | `lib/module-plan.ts` `decideTopics` | 依 R／PR 決定納入哪些主題，LLM 不參與 |
| 模組文字 | `lib/education-modules.ts` `lib/self-care-modules.ts` `lib/shared-care.ts` | 固定文字。主題模組只放該疾病特有內容，通用內容各講一次 |
| 組裝 | `lib/module-plan.ts` | 病人版與醫師版 |
| 驗證 | `lib/validate-report.ts` | 確定性檢查，可當作不會漂移的評分器 |

LLM 在 arm C 只做三件事：排優先序、給醫療團隊的提醒、以及**對程式判定提出異議**。異議會記錄但不覆寫——這個管道曾經抓到程式把缺值當成 0 的真實錯誤。

## 端到端跑一次

```bash
node scripts/run-pipeline.mjs --patients <病人JSON目錄> --out <評估包目錄> --selector <arm C 輸出目錄>
```

產出的評估包含四個檔案，可以直接交給不懂這個 codebase 的人審查：原始資料整理版、程式抽取與判定、病人版報告、醫師版報告。

## 流程比較（A／B／C）

- A：現行 prompt ＋ 病人資料
- B：現行 prompt ＋ 病人資料 ＋ 指引全文
- C：模組選擇流程。LLM 只輸出模組代碼，病人可見正文由程式以固定文字組合

比較各 arm 的輸入規模（不需呼叫 API）：

```bash
node scripts/compare-arms.mjs --patients <病人JSON目錄> --guideline <指引TXT>
```

產生各 arm 的實際輸入檔，供實跑使用（請輸出到 repo 以外的位置）：

```bash
node scripts/materialize-arm-inputs.mjs --patients <目錄> --out <暫存目錄>
```

以確定性驗證器評分實跑結果：

```bash
node scripts/score-arms.mjs --run <暫存目錄> --patients <目錄>
```

`app/lib/education-modules.ts` 的模組目錄狀態為 **DRAFT，尚未經醫療團隊核准**，只能用於流程比較，不得提供給病人。

## 發布

兩個版本都從同一次建置產出。

**GitHub Pages（靜態版）**

```bash
npm run build && npm run export:pages
```

產物在 `github-pages/dm-education-workbench/`，`og.jpg` 由匯出腳本從 `public/` 帶進去（先前它只存在於 Pages 分支，`rsync --delete` 會把它清掉而社群預覽變 404）。

站台網址：<https://voho0000.github.io/dm-education-workbench/>，由本儲存庫的 `gh-pages` 分支根目錄提供。把產物整包放到該分支根目錄再推即可：

```bash
npm run build && npm run export:pages
# 將 github-pages/dm-education-workbench/ 的內容放到 gh-pages 分支根目錄（含 .nojekyll）
```

網址由 `PAGES_URL` 環境變數覆寫，只影響 `og:image` 的絕對網址；其餘資產都是 `./` 相對路徑，換路徑不會壞。

舊網址 `voho0000.github.io/dm-education-report/` 留了轉址頁，在 `voho0000/voho0000.github.io` 儲存庫裡。

**私人 Sites 版**

由 `.openai/hosting.json` 的專案（`*.chatgpt.site`）提供，需透過 Codex／ChatGPT 桌面應用的發布流程送出，目前沒有可用的 CLI 指令。`wrangler deploy` 不適用於這個站台。

發布前確認 `git status` 沒有 `.env*`、指引全文或病人資料，且 `npm test` 全數通過。頁尾的 build 識別碼可用來確認線上版本是否為最新，而不是快取的舊版。

## 正式使用前

- 由醫療團隊核准生成 prompt、eval prompt 與固定衛教內容。
- 明定病人資料截止日、報告有效期間及過期提醒。
- 不將歷史健保申報用藥描述為目前用藥。
- 糖尿病類型證據不足或衝突時，交由醫療團隊確認。
- 以批次測試、人工抽查與版本紀錄監控模型品質。
- 在部署環境中將 `GEMINI_API_KEY` 設為機密環境變數，不要寫入程式碼或提交到版本控制。
