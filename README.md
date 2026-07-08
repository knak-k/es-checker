# ES添削ツール

就活のES（エントリーシート）を、書いたその場で添削できる Web アプリ。
詳細な企画は [plan.md](plan.md) を参照。

## 機能

- **即時チェック（クライアント完結・課金ゼロ）**：文字数カウント（改行・空白除外）、御社／貴社の誤用チェック
- **AI添削（サーバー経由）** `/`：Google Gemini（無料枠）で5項目採点＋減点チェック＋優先改善。スマホ最適（ページを開くだけ）
- **ブラウザ内AI添削** `/browser`：WebGPU で Gemma をブラウザ上実行。サーバー送信ゼロだが、初回にモデルDLが必要でPC向け

## セットアップ

```bash
npm install
```

`.env.local` に無料の Gemini APIキーを設定：

```
GEMINI_API_KEY=（https://aistudio.google.com/apikey で取得）
```

## 起動

```bash
npm run dev
```

http://localhost:3000 を開く。

## 構成

- `src/app/page.tsx` … トップ（入力フォーム＋即時チェック＋AI添削）
- `src/app/api/review/route.ts` … Gemini を呼ぶサーバールート（APIキーはここだけ）
- `src/app/browser/page.tsx` … ブラウザ内Gemma（WebLLM）
- `src/lib/checks.ts` … 文字数・御社/貴社の即時チェック
- `src/lib/prompt.ts` … 添削プロンプト（共有）

## 注意

- APIキーは**サーバー環境変数のみ**。クライアントに出さない。
- 無料枠は入力が学習に使われる場合がある（ESの個人情報に注意）。本番運用では有料枠や上限設定を検討。
