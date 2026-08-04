/**
 * 從原始碼文字裡切出指定的函式或常數。
 *
 * 為什麼不是把程式碼另外抄一份到說明文件裡：抄的那份一定會過時，而且沒有任何
 * 機制會發現。這裡讀的是 `?raw` 匯入的真檔案，改了程式碼，畫面上就跟著改。
 *
 * 切法刻意簡單——從宣告那一行往下數大括號，回到 0 就結束。它認得的是我們
 * 自己這幾個檔案的寫法，不是通用的 TypeScript 剖析器。切不到就回 null，
 * 由呼叫端顯示「找不到」，不要編一段假的出來。
 */

/** 宣告上方連續的註解也要一起帶出來——「為什麼這樣寫」通常寫在那裡。 */
function leadingComment(lines: string[], declIndex: number): number {
  let start = declIndex;
  let i = declIndex - 1;
  // 先吃掉緊鄰的區塊註解或連續的行註解
  if (i >= 0 && lines[i].trim().endsWith("*/")) {
    while (i >= 0 && !lines[i].trim().startsWith("/*")) i -= 1;
    if (i >= 0) start = i;
  } else {
    while (i >= 0 && lines[i].trim().startsWith("//")) {
      start = i;
      i -= 1;
    }
  }
  return start;
}

export function extractSymbol(source: string, name: string): string | null {
  const lines = source.split("\n");
  const pattern = new RegExp(
    `^\\s*(?:export\\s+)?(?:async\\s+)?(?:function|const|type|class)\\s+${name}\\b`,
  );
  const declIndex = lines.findIndex((line) => pattern.test(line));
  if (declIndex === -1) return null;

  const start = leadingComment(lines, declIndex);

  let depth = 0;
  let seenBody = false;
  for (let i = declIndex; i < lines.length; i += 1) {
    for (const char of lines[i]) {
      if (char === "{" || char === "(" || char === "[") {
        depth += 1;
        seenBody = true;
      } else if (char === "}" || char === ")" || char === "]") {
        depth -= 1;
      }
    }
    // 單行的 const（例如 `export const X = 1;`）不會有括號，用分號收尾
    if (!seenBody && lines[i].trimEnd().endsWith(";")) return lines.slice(start, i + 1).join("\n");
    if (seenBody && depth <= 0) return lines.slice(start, i + 1).join("\n");
  }
  return null;
}

/** 多個符號串成一段，中間留空行。切不到的會標明，不靜默略過。 */
export function extractSymbols(source: string, names: string[], file: string): string {
  return names
    .map((name) => extractSymbol(source, name) ?? `// ⚠ 在 ${file} 中找不到 ${name}，可能已改名`)
    .join("\n\n");
}
