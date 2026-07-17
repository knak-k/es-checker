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
GEMINI_MODEL=gemini-3-flash-preview（省略可。未指定でもこれが既定）
SITE_PASSWORD=（サイト全体の簡易パスワードゲート。空だと誰でもアクセス可能になるので必ず設定）
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
- `src/lib/drafts.ts` … 企業別下書きの保存/読込
- `src/proxy.ts` … サイト全体のパスワードゲート（Next.js 16 の Middleware→Proxy）
- `src/app/login/page.tsx` / `src/app/api/login/route.ts` … ログイン画面とCookie発行

## 注意

- APIキーは**サーバー環境変数のみ**。クライアントに出さない。
- 無料枠は入力が学習に使われる場合がある（ESの個人情報に注意）。本番運用では有料枠や上限設定を検討。
- `SITE_PASSWORD` 未設定だとパスワードゲートが**無効化**される（ローカル開発の利便性のための仕様）。Vercel には必ず設定すること。

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
- **CSSフレームワーク移行**：Tailwind → Bootstrap 5（react-bootstrap）。ダークは `data-bs-theme` で自動切替
- **企業別に下書き管理**：複数ESの保存・切替・新規・削除（`src/lib/drafts.ts`）。旧・単一下書きは自動移行。ロジック単体テスト 12/12
- **無料枠レート制限のエラー表示**：Gemini の 429 を検知し「アクセス集中・1分後に再試行」等の日本語メッセージに変換（`GoogleGenerativeAIFetchError.status` で判定）。単体テスト 5/5

- **Gemini 添削の実動作確認**：`gemini-1.5-flash` はこのキー（2026年新規プロジェクト）では廃止済み(404)。
  `gemini-2.0-flash`は429（新規プロジェクトはクォータ0）、`gemini-2.5-flash`系も404。
  実際に動いたのは `gemini-3-flash-preview`（日本語で適切に応答、指定フォーマット通りの辛口採点を確認）。
  既定モデルをこれに変更（`src/app/api/review/route.ts`）。`gemini-3.1-flash-lite` は応答が不安定だったため不採用。

- **パスワードゲート（限定公開）**：サイト全体を `SITE_PASSWORD` で保護。未認証は `/login` にリダイレクト、
  `/api/review` への直接アクセスも防止（実機で5パターン検証済み：未認証307／誤パスワード401／
  正パスワード200＋Cookie発行／Cookie持参で通過／`/api/review`直叩きもリダイレクト）。
  Cookieは HttpOnly・HMAC-SHA256署名・timing-safe比較。`SITE_PASSWORD` 未設定時はゲート無効（ローカル開発用）。
  本番（Vercel）で実機検証済み。※初回pushし忘れで一時的にゲートなしで公開されていたため、
  即座にpushして解消（`f44f9e4`）。
- **検索避け（noindex）**：`robots.txt`（全面Disallow）と `<meta name="robots" content="noindex,nofollow">` を追加。
  `robots.txt` 自体はパスワードゲート対象外にして、クローラーが正しく読めるようにした。
- **フォント修正**：`Noto Sans JP` を next/font/google で確実に読み込み。Windows等でシステムフォールバックが
  古いフォント（Meiryo等）になっていた問題を解消。
- **添削結果を構造化JSON出力に変更**：AIの自由記述（Markdownのアスタリスクが生表示され読みにくい、
  総合点と項目別点数の合計が食い違う、等の問題があった）をやめ、Gemini の `responseSchema` で
  JSON形式に固定。項目別（主体性/思考力/実行力/他者理解力/再現性）を得点・理由・不足要素・改善案に
  分離してカードUIで表示。総合点はAIの自己申告を使わず、項目別得点の合計をサーバー側で計算することで
  数値の不整合を構造的に防止（`src/lib/prompt.ts` の `normalizeReviewResult`）。
  `/browser`（WebLLM/Gemma）はJSON Schema出力に対応しないため自由記述のまま、Markdown禁止の指示のみ強化。
  実機検証：ログイン→添削実行で `overallScore` が項目別得点の合計と一致することを確認。

- **Vercel デプロイ完了**：https://es-checker-rho.vercel.app （GitHub連携、`GEMINI_API_KEY`/`SITE_PASSWORD`/`GEMINI_MODEL` 設定済み）。
  パスワードゲートを本番で実機検証済み。

### 判断済み（対応不要）

- **悪用対策**：Gemini は無料枠のため、悪用されても課金は発生しない（最悪ケースは無料枠のレート制限に
  引っかかるだけで、その場合の日本語エラー表示も実装済み）。加えてパスワードゲートで入場自体を制限しているため、
  IPベースの連投制限などの追加インフラ投資は現状の規模には過剰と判断。有料枠に切り替える場合は再検討。

### 未着手（今後）

- 添削結果の「コピー」ボタン（カード化は完了、コピー機能は未実装）
- 下書きのバージョン履歴・比較（plan.md の P2）
- 辛口プロンプトの調整、職種別の評価視点（実際のES例を使った継続的なチューニングが必要）

### 設計メモ（これまでの検討）

- **課金**：サーバー側でAIを動かす＝運営（自分）負担。無料枠API→将来 Claude Haiku など有料へ段階移行できる設計
- **「各自で呼び出す」案**：ブラウザ内実行（WebLLM）なら運営負担ゼロだが、モデルDL・WebGPU必須で**スマホ非対応** → `/browser` は PC向けオプションとして残す
- **ターゲットはスマホ** → メインはサーバー側の無料枠API（`/api/review`）
