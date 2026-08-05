import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const outputDir = path.resolve(process.argv[2] ?? "github-pages/dm-education-workbench");
/*
 * 站台從 voho0000.github.io 的子目錄搬到本 repo 自己的 Pages，比較好管理
 * （程式碼與部署產物在同一個 repo，版本對得起來）。
 *
 * 只有 og:image 需要絕對網址，其餘資產一律走 ./ 相對路徑，所以換路徑不會壞。
 */
const publicUrl = process.env.PAGES_URL ?? "https://voho0000.github.io/dm-education-workbench/";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("static-export", `${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

const response = await worker.fetch(
  new Request("https://static-export.local/", { headers: { accept: "text/html" } }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);

if (!response.ok) throw new Error(`首頁轉出失敗：HTTP ${response.status}`);

let html = await response.text();
html = html
  .replaceAll('href="/assets/', 'href="./assets/')
  .replaceAll('src="/assets/', 'src="./assets/')
  .replaceAll('import("/assets/', 'import("./assets/')
  .replaceAll('href="/favicon.svg"', 'href="./favicon.svg"')
  .replaceAll('content="/og.png"', `content="${publicUrl}og.jpg"`)
  .replaceAll('\\"/assets/', '\\"./assets/')
  .replaceAll('\\"/favicon.svg\\"', '\\"./favicon.svg\\"')
  .replaceAll('\\"/og.png\\"', `\\"${publicUrl}og.jpg\\"`);

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(new URL("../dist/client/", import.meta.url), outputDir, { recursive: true });
await Promise.all([
  rm(path.join(outputDir, ".vite"), { recursive: true, force: true }),
  rm(path.join(outputDir, "_headers"), { force: true }),
  rm(path.join(outputDir, ".assetsignore"), { force: true }),
  rm(path.join(outputDir, "assets", "_vinext_fonts"), { recursive: true, force: true }),
  // og.jpg 留著：HTML 指向的是它。og.png 是 Worker 版用的原圖，靜態版不需要再帶 1.8 MB。
  rm(path.join(outputDir, "og.png"), { force: true }),
  rm(path.join(outputDir, "file.svg"), { force: true }),
  rm(path.join(outputDir, "globe.svg"), { force: true }),
  rm(path.join(outputDir, "window.svg"), { force: true }),
]);
await writeFile(path.join(outputDir, "index.html"), html, "utf8");

const builtHtml = await readFile(path.join(outputDir, "index.html"), "utf8");
for (const forbidden of [
  'href="/assets/',
  'src="/assets/',
  'import("/assets/',
  'content="/og.png"',
  '\\"/assets/',
  '\\"/favicon.svg\\"',
  '\\"/og.png\\"',
]) {
  if (builtHtml.includes(forbidden)) throw new Error(`靜態頁仍包含根目錄路徑：${forbidden}`);
}

// 之前 og.jpg 只存在於 Pages 分支，rsync --delete 會把它清掉，社群預覽就變成 404。
await stat(path.join(outputDir, "og.jpg"));

console.log(outputDir);
