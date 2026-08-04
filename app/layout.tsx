import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";

const notoSansTc = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "糖尿病衛教報告產生器",
  description: "從健保申報 JSON 產出病人版衛教報告與醫師版摘要。併發症主題與指引目標由程式判定，LLM 只負責規則做不到的部分。",
  openGraph: {
    title: "糖尿病衛教報告產生器",
    description: "一份健保申報 JSON，兩份可用的報告。",
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
