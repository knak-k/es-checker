import { SchemaType, type Schema } from "@google/generative-ai";

// ES添削のプロンプト（サーバーAPI・ブラウザ内モデルの両方で共有）。
// plan.md の採点ルーブリック（5項目×20点／減点チェック／辛口）を反映。

export const REVIEW_SYSTEM =
  "あなたは就活ES（エントリーシート）の辛口添削者です。" +
  "日本語で、結論ファーストで簡潔に出力してください。" +
  "初稿で80点超は稀です。抽象語（信頼・成長・挑戦など）の未定義使用、数字偏重、" +
  "感情語での価値補強、善意のみで仕組み設計が欠けている点は減点対象として指摘してください。" +
  "すべての文章はMarkdown記法（**、#、- など）を使わず、プレーンな日本語の文章で書いてください。";

export type ReviewInput = {
  company: string;
  role: string;
  question: string;
  body: string;
};

const RUBRIC_ITEMS = ["主体性", "思考力", "実行力", "他者理解力", "再現性"] as const;

function reviewContext(p: ReviewInput): string {
  return [
    `企業: ${p.company || "(未記入)"}`,
    `職種: ${p.role || "(未記入)"}`,
    `設問: ${p.question || "(未記入)"}`,
    "本文:",
    p.body,
  ].join("\n");
}

// /api/review（Gemini・JSON構造化出力）用。
export function buildStructuredReviewPrompt(p: ReviewInput): string {
  return [
    "以下のESを添削し、指定されたJSON形式で出力してください。",
    "応募職種に応じた視点で評価してください。",
    "",
    reviewContext(p),
    "",
    `項目別採点は必ず次の5項目・この順序で、各0〜20点で採点すること: ${RUBRIC_ITEMS.join(" / ")}`,
  ].join("\n");
}

// /browser（ブラウザ内Gemma・自由記述）用。JSON構造化出力に対応しないモデル向け。
export function buildFreeformReviewPrompt(p: ReviewInput): string {
  return [
    "以下のESを添削してください。応募職種に応じた視点で評価してください。",
    "",
    reviewContext(p),
    "",
    "出力フォーマット（この見出しを厳守、Markdown記法は使わずプレーンテキストで）:",
    "【総合評価】100点満点で採点（辛口）＋2〜3文の総評",
    `【項目別採点】次の5項目を各20点で採点し、各項目「得点／評価理由／不足要素／具体的改善案」を1〜2行で: ${RUBRIC_ITEMS.join(" / ")}`,
    "【減点チェック】数字偏重・感情語・抽象語の未定義使用・仕組み設計の欠如などが該当すれば指摘",
    "【優先改善】最も効く改善を3つ、具体的に",
  ].join("\n");
}

// Gemini の responseSchema。総合点はモデルに書かせず、項目別点数の合計をサーバー側で計算する
// （モデルが自己申告する合計点は算術ミスで項目別点数と食い違うことがあるため）。
export const REVIEW_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    overallComment: {
      type: SchemaType.STRING,
      description: "総合評価の2〜3文のコメント（辛口）",
    },
    items: {
      type: SchemaType.ARRAY,
      minItems: 5,
      maxItems: 5,
      description: `必ず ${RUBRIC_ITEMS.join(" / ")} の順で5項目`,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING, description: "項目名" },
          score: { type: SchemaType.INTEGER, description: "0〜20点の得点" },
          reason: { type: SchemaType.STRING, description: "評価理由" },
          missing: { type: SchemaType.STRING, description: "不足要素" },
          improvement: { type: SchemaType.STRING, description: "具体的改善案" },
        },
        required: ["name", "score", "reason", "missing", "improvement"],
      },
    },
    deductions: {
      type: SchemaType.STRING,
      description: "減点チェックの指摘。該当なしなら空文字",
    },
    priorities: {
      type: SchemaType.ARRAY,
      minItems: 3,
      maxItems: 3,
      items: { type: SchemaType.STRING },
      description: "優先改善を3つ",
    },
  },
  required: ["overallComment", "items", "deductions", "priorities"],
};

export type ReviewItem = {
  name: string;
  score: number;
  reason: string;
  missing: string;
  improvement: string;
};

export type ReviewResult = {
  overallScore: number;
  overallComment: string;
  items: ReviewItem[];
  deductions: string;
  priorities: string[];
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// Gemini からの生JSONを、型が壊れていても表示可能な形に矯正する。
export function normalizeReviewResult(raw: unknown): ReviewResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(r.items) ? r.items : [];

  const items: ReviewItem[] = rawItems.slice(0, 5).map((it) => {
    const o = (it ?? {}) as Record<string, unknown>;
    return {
      name: typeof o.name === "string" ? o.name : "",
      score: clamp(Math.round(Number(o.score) || 0), 0, 20),
      reason: typeof o.reason === "string" ? o.reason : "",
      missing: typeof o.missing === "string" ? o.missing : "",
      improvement: typeof o.improvement === "string" ? o.improvement : "",
    };
  });

  return {
    overallScore: items.reduce((sum, it) => sum + it.score, 0),
    overallComment: typeof r.overallComment === "string" ? r.overallComment : "",
    items,
    deductions: typeof r.deductions === "string" ? r.deductions : "",
    priorities: Array.isArray(r.priorities)
      ? r.priorities.filter((p): p is string => typeof p === "string").slice(0, 5)
      : [],
  };
}
