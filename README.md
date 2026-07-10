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

## 進捗（開発ログ）

最終更新：2026-07-08

### 完了

- **Step 1: 土台＋即時チェック**（コミット `faeb6fe`）
  - Next.js 16 + TypeScript + Tailwind v4（App Router / src-dir）で scaffold
  - 入力フォーム（企業名・職種・設問・回答本文・文字数上限）
  - 即時チェック（クライアント完結・課金ゼロ）：文字数カウント（改行・空白除外）、御社／貴社の誤用チェック
  - 検証：`npm run build` 成功、ロジック単体テスト 8/8、dev で描画確認
- **Step 2: AI添削**（コミット `0781004`）
  - `/browser`：WebLLM でブラウザ内 Gemma 実行（WebGPU、DL進捗、サーバー送信ゼロ）。ただし初回DL（〜1.5GB）・WebGPU必須のため **PC向け**
  - `/api/review`：Google Gemini（無料枠）を呼ぶサーバールート。**スマホ向けの本命**（ページを開くだけ）
  - `src/lib/prompt.ts` に添削プロンプトを共通化
  - 検証：build 成功、APIエラー処理を実機テスト（空本文→400／キー未設定→500／不正JSON→400）
- **GitHub 公開**：https://github.com/knak-k/es-checker （public, main）に push 済み
- **UI刷新（デザイン）**：モバイルファーストで全面刷新。共通ヘッダー/フッター、デザイントークン（`src/lib/ui.ts`）、カードUI、文字数メーター、御社/貴社チップ
- **下書き自動保存**：入力を localStorage に自動保存＋再訪時に復元、「クリア」ボタン（plan.md P1 の一部）

### 進行中

- **Vercel デプロイ**（スマホで使える公開URL化）
  - [ ] Gemini 無料APIキーを取得（https://aistudio.google.com/apikey ）※大学アカウントで作成不可なら個人Gmailで
  - [ ] Vercel に GitHub 連携でインポート
  - [ ] Vercel 環境変数に `GEMINI_API_KEY` を設定
  - [ ] デプロイ → 公開URLをスマホで動作確認

### 未着手（今後）

- 実機での Gemini 添削の動作確認（キー設定後）
- レート制限・利用上限（無料枠の枯渇・悪用対策）
- 企業別に下書きを管理・履歴（plan.md の P1）
- 添削結果の構造化表示（項目ごとにカード化・コピー）
- 辛口プロンプトの調整、職種別の評価視点

### 設計メモ（これまでの検討）

- **課金**：サーバー側でAIを動かす＝運営（自分）負担。無料枠API→将来 Claude Haiku など有料へ段階移行できる設計
- **「各自で呼び出す」案**：ブラウザ内実行（WebLLM）なら運営負担ゼロだが、モデルDL・WebGPU必須で**スマホ非対応** → `/browser` は PC向けオプションとして残す
- **ターゲットはスマホ** → メインはサーバー側の無料枠API（`/api/review`）
