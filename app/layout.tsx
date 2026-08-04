import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";

const notoSansTc = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "糖尿病衛教報告工作台",
  description: "將病人 JSON 或純文字資料整理成 LLM 好讀格式，使用 Gemini 生成糖尿病衛教報告並完成獨立品質稽核。",
  openGraph: {
    title: "糖尿病衛教報告工作台",
    description: "病人資料整理、Gemini 報告生成與品質稽核，集中在同一頁完成。",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body className={notoSansTc.variable}>{children}</body>
    </html>
  );
}
