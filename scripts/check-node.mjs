/**
 * 跑測試前先擋掉版本不足的 Node。
 *
 * 測試直接 import `.ts`，靠的是 Node 的原生型別剝離。22.13 以前沒有這個能力，
 * 於是 `node --test` 會在載入階段就失敗——而失敗訊息長得像模組解析錯誤，
 * 不像「你的 Node 太舊」。
 *
 * 外部稽核在 Node 22.11 上就踩到了：測試完全沒有開始跑，但看起來像是專案壞了。
 * 這在 CI 或 VM 上更危險——「程式沒壞但測試一項都沒跑」與「測試全過」在
 * 退出碼上可能長得一樣，而沒跑過的測試不會擋下任何東西。
 */

import process from "node:process";
import { readFileSync } from "node:fs";

const required = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).engines.node;
const min = required.replace(/^>=/, "");

const toParts = (version) => version.replace(/^v/, "").split(".").map(Number);
const [haveMajor, haveMinor = 0, havePatch = 0] = toParts(process.versions.node);
const [needMajor, needMinor = 0, needPatch = 0] = toParts(min);

const ok =
  haveMajor > needMajor ||
  (haveMajor === needMajor &&
    (haveMinor > needMinor || (haveMinor === needMinor && havePatch >= needPatch)));

if (!ok) {
  console.error(
    [
      "",
      `這個專案需要 Node ${min} 以上，目前是 ${process.versions.node}。`,
      "",
      "測試直接 import .ts 檔，靠 Node 的原生型別剝離；版本不足時 `node --test`",
      "會在載入階段就失敗，訊息看起來像模組解析錯誤而不是版本問題。",
      "",
      "請切換 Node 版本後再跑，例如：",
      `  nvm use ${needMajor}`,
      "",
      "注意：不要用「加參數硬跑」繞過這個檢查。測試沒跑完卻回傳成功，",
      "比測試失敗更危險——沒跑過的測試擋不下任何東西。",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
