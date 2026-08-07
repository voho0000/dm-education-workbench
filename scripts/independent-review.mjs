/**
 * 用 codex CLI 當獨立審查者，讀已經產出的報告挑毛病。
 *
 * 為什麼要另一個模型：④ 報告審查已經在流程裡，但它跟寫報告的是同一個模型
 * 家族——**它們的盲點是重疊的**。生成器最容易犯的錯，正好是同源審查器最不
 * 容易抓到的。實測就看到過：④ 抓到「宣稱達標」，卻對自己也會寫的
 * 「曾出現」誤判成時序違規。
 *
 * 這支腳本是**開發期的工具，不進產品流程**。它的用途是找出「我們還沒想到
 * 要檢查的類別」——找到之後，能寫成確定性規則的就寫進 unsupported-claims.ts，
 * 只能靠語意判斷的就補進 ④ 的 rubric。它自己不決定任何一份報告能不能發。
 *
 * 用法：
 *   node scripts/independent-review.mjs <評估包目錄> [--only id1,id2]
 *
 * 讀每位病人的 03（病人版）、04（醫師版）、02（程式判定的事實），送給 codex
 * 一起看，輸出逐句標記。報告含病人資料，所以：
 *   - 只在本機跑
 *   - 輸出寫回同一個評估包目錄，不進版控
 */

import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const run = promisify(execFile);

const PROMPT = `你是糖尿病專科醫師，正在審查一份自動產生的衛教報告，判斷它能不能交給病人與醫師。

這份報告的產生方式：從健保申報資料（用藥、檢驗、併發症欄位）自動組裝，其中三段由語言模型撰寫，其餘來自固定衛教模組。

**這批資料有兩個硬限制，審查時要一直記得：**
1. 檢驗紀錄只有費用年月、**沒有採檢日期**。所以任何講先後、變化、「最近」「目前」的說法都沒有根據。
2. 用藥是歷史申報紀錄，不代表病人現在正在吃。

**你的工作不是給分數或通過與否。**請找出「被拿出來檢視時站不住腳」的地方，每一則都逐字引用報告原句。

特別注意這幾類：
- 資料支持不了的推論（診斷、因果、急症風險）
- 講了時序或變化，但資料沒有日期
- 對這位病人不適用的建議（例如對腎功能不全的人建議增加蛋白質）
- 數字與事實區對不起來
- 語氣把「可能」寫成「確定」

**同樣重要的是，請告訴我這份報告還缺什麼、或哪裡讀起來會讓病人困惑。**
上面那幾類是從過去發現的錯誤整理出來的，涵蓋不了還沒見過的問題。你是獨立的第二意見，請說出你真正的疑慮，包括我沒問到的。

輸出格式（純文字，不要 JSON）：

## 站不住腳的地方
逐則列出，格式為：
- 「引用的原句」
  為什麼有問題（一到兩句）
  嚴重度：高／中／低

## 這份報告還缺什麼
## 讀起來會讓病人困惑的地方
## 你認為最該優先修的三件事

沒有發現就寫「無」。不要為了交差而湊數。`;

const args = process.argv.slice(2);
const outDir = args[0];
const onlyArg = args.indexOf("--only");
const only = onlyArg >= 0 ? args[onlyArg + 1].split(",") : null;

if (!outDir) {
  console.error("用法：node scripts/independent-review.mjs <評估包目錄> [--only id1,id2]");
  console.error("需要本機已安裝並登入 codex CLI。報告含病人資料，只在本機跑。");
  process.exit(1);
}

const ids = (await readdir(outDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((id) => !only || only.includes(id))
  .sort();

if (!ids.length) {
  console.error(`${outDir} 底下沒有病人資料夾。`);
  process.exit(1);
}

const reviewDir = path.join(outDir, "_獨立審查");
await mkdir(reviewDir, { recursive: true });

const summary = [];

for (const [index, id] of ids.entries()) {
  const read = (name) => readFile(path.join(outDir, id, name), "utf8").catch(() => null);
  const [facts, patient, clinician] = await Promise.all([
    read("02_確定性事實摘要.txt"),
    read("03_病人版衛教報告.txt"),
    read("04_醫師版報告.txt"),
  ]);

  if (!patient) {
    console.log(`${id}：沒有病人版報告，略過。`);
    continue;
  }

  const input = [
    PROMPT,
    "",
    "═══ 程式判定出來的事實（這是基準，可信）═══",
    facts ?? "（沒有事實摘要）",
    "",
    "═══ 病人版衛教報告 ═══",
    patient,
    "",
    "═══ 醫師版報告 ═══",
    clinician ?? "（沒有醫師版）",
  ].join("\n");

  process.stdout.write(`${index + 1}／${ids.length}　${id} 送出獨立審查…`);

  try {
    /*
     * 必須走 shell 重導，不能用 execFile 的 input 選項。
     *
     * 直接 execFile("codex", [...], {input}) 會拿到空的 stdout、空的 stderr、
     * 沒有錯誤——看起來像「審查器沒有發現任何問題」，而其實它根本沒回話。
     * 這是最糟的失敗模式：一份沒跑過的審查與一份乾淨的審查長得一樣。
     * 下面的空回應檢查就是為了這個。
     *
     * --sandbox read-only：審查者只需要讀我們給的文字，不該碰檔案系統。
     */
    const promptFile = path.join(reviewDir, `.${id}.input.txt`);
    await writeFile(promptFile, input, "utf8");
    const { stdout } = await run(
      "sh",
      ["-c", `codex exec --sandbox read-only --skip-git-repo-check - < "${promptFile}" 2>/dev/null`],
      { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, timeout: 15 * 60 * 1000 },
    );
    await rm(promptFile, { force: true });

    if (stdout.trim().length < 40) {
      throw new Error(`審查器回了空的或過短的內容（${stdout.trim().length} 字元）——不能當成「沒有發現」。`);
    }
    await writeFile(path.join(reviewDir, `${id}.txt`), stdout, "utf8");
    const high = (stdout.match(/嚴重度：高/g) ?? []).length;
    const total = (stdout.match(/^- 「/gm) ?? []).length;
    summary.push({ id, total, high });
    console.log(` 完成（${total} 則，其中高 ${high}）`);
  } catch (error) {
    console.log(` 失敗：${String(error?.message ?? error).slice(0, 120)}`);
    summary.push({ id, error: String(error?.message ?? error).slice(0, 200) });
  }
}

await writeFile(path.join(reviewDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(`\n獨立審查結果：${reviewDir}`);
console.log("這些發現不決定任何一份報告能不能發——它們的用途是找出還沒想到要檢查的類別。");
