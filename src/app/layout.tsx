import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_JP } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import { SiteHeader } from "./_components/SiteHeader";
import { ThemeSync } from "./_components/ThemeSync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "ES添削ツール",
  description: "ESをその場で添削。文字数・御社/貴社の即時チェックとAI添削。",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansJP.variable}`}
    >
      <body className="d-flex flex-column min-vh-100">
        <ThemeSync />
        <SiteHeader />
        <main className="flex-fill">{children}</main>
        <footer className="border-top py-4 text-center text-body-secondary small">
          ES添削ツール · 添削はAIによる参考です。最終判断はご自身で。
        </footer>
      </body>
    </html>
  );
}
