import { SchemaType, type Schema } from "@google/generative-ai";

// ES添削のプロンプト（サーバーAPI・ブラウザ内モデルの両方で共有）。
// plan.md の採点ルーブリック（5項目×20点／減点チェック／既存ルール準拠チェック／辛口）を反映。

export const REVIEW_SYSTEM =
  "あなたは就活ES（エントリーシート）の辛口添削者です。" +
  "日本語で、結論ファーストで簡潔に出力してください。" +
  "初稿で80点超は稀です。抽象語（信頼・成長・挑戦など）の未定義使用、数字偏重、" +
  "感情語での価値補強、善意のみで仕組み設計が欠けている点は減点対象として指摘してください。" +
  "すべての文章はMarkdown記法（**、#、- など）を使わず、プレーンな日本語の文章で書いてください。" +
  "職種によって重視すべき視点を変えて評価してください。例えば、" +
  "研究開発職・エンジニア職では技術的な具体性・再現性のある問題解決プロセスを、" +
  "SIer・コンサル職では顧客やチームとの合意形成・仕組み化を、" +
  "営業・企画職では定量的な成果と他者への影響力を、" +
  "それぞれ重視すること。職種が未記入・上記に当てはまらない場合は、" +
  "設問と本文の内容から適切な評価軸を判断すること。";

export type ReviewInput = {
  company: string;
  role: string;
  question: string;
  body: string;
};

const RUBRIC_ITEMS = ["主体性", "思考力", "実行力", "他者理解力", "再現性"] as const;

// 既存ルール準拠チェック（plan.md）。減点チェック（数字偏重・感情語・抽象語・仕組み欠如）とは別カテゴリ。
const RULE_CHECK_ITEMS = [
  "結論ファースト",
  "受け身表現の有無",
  "目的の具体性",
  "2点構造の回避",
  "まとめ一文",
  "AIっぽい日本語",
  "企業独自性",
] as const;

const RULE_CHECK_GUIDE =
  "結論ファースト＝答えを先に述べているか。" +
  "受け身表現の有無＝「〜された」等の受け身が多用され主体性が薄れていないか。" +
  "目的の具体性＝行動の目的が抽象論でなく具体的か。" +
  "2点構造の回避＝「1つ目は…2つ目は…」のような機械的な2点羅列になっていないか。" +
  "まとめ一文＝末尾に明確な締めの一文があるか。" +
  "AIっぽい日本語＝生成AIが書いたような無難・没個性な言い回しになっていないか。" +
  "企業独自性＝内容がこの企業固有か、どの企業にも使い回せる一般論になっていないか。";

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
    `既存ルール準拠チェックは必ず次の7項目・この順序で、passed(true/false)とcommentを付けること: ${RULE_CHECK_ITEMS.join(" / ")}`,
    RULE_CHECK_GUIDE,
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
    `【既存ルール準拠チェック】次の7項目それぞれについて、○か×か＋一言理由を1行で: ${RULE_CHECK_ITEMS.join(" / ")}`,
    RULE_CHECK_GUIDE,
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
    ruleChecks: {
      type: SchemaType.ARRAY,
      minItems: 7,
      maxItems: 7,
      description: `必ず ${RULE_CHECK_ITEMS.join(" / ")} の順で7項目。${RULE_CHECK_GUIDE}`,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          rule: { type: SchemaType.STRING, description: "ルール名" },
          passed: { type: SchemaType.BOOLEAN, description: "準拠していれば true" },
          comment: { type: SchemaType.STRING, description: "一言理由" },
        },
        required: ["rule", "passed", "comment"],
      },
    },
    priorities: {
      type: SchemaType.ARRAY,
      minItems: 3,
      maxItems: 3,
      items: { type: SchemaType.STRING },
      description: "優先改善を3つ",
    },
  },
  required: ["overallComment", "items", "deductions", "ruleChecks", "priorities"],
};

export type ReviewItem = {
  name: string;
  score: number;
  reason: string;
  missing: string;
  improvement: string;
};

export type RuleCheckItem = {
  rule: string;
  passed: boolean;
  comment: string;
};

export type ReviewResult = {
  overallScore: number;
  overallComment: string;
  items: ReviewItem[];
  deductions: string;
  ruleChecks: RuleCheckItem[];
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

  const rawRuleChecks = Array.isArray(r.ruleChecks) ? r.ruleChecks : [];
  const ruleChecks: RuleCheckItem[] = rawRuleChecks.slice(0, 7).map((it) => {
    const o = (it ?? {}) as Record<string, unknown>;
    return {
      rule: typeof o.rule === "string" ? o.rule : "",
      passed: o.passed === true,
      comment: typeof o.comment === "string" ? o.comment : "",
    };
  });

  return {
    overallScore: items.reduce((sum, it) => sum + it.score, 0),
    overallComment: typeof r.overallComment === "string" ? r.overallComment : "",
    items,
    deductions: typeof r.deductions === "string" ? r.deductions : "",
    ruleChecks,
    priorities: Array.isArray(r.priorities)
      ? r.priorities.filter((p): p is string => typeof p === "string").slice(0, 5)
      : [],
  };
}

// コピーボタン用に、構造化結果を読みやすいプレーンテキストへ整形する。
export function formatReviewResultAsText(r: ReviewResult): string {
  const lines: string[] = [];
  lines.push(`【総合評価】${r.overallScore} / 100`);
  if (r.overallComment) lines.push(r.overallComment);
  lines.push("");
  lines.push("【項目別採点】");
  for (const item of r.items) {
    lines.push(`◯ ${item.name}：${item.score} / 20`);
    if (item.reason) lines.push(`  評価理由：${item.reason}`);
    if (item.missing) lines.push(`  不足要素：${item.missing}`);
    if (item.improvement) lines.push(`  改善案：${item.improvement}`);
  }
  if (r.deductions) {
    lines.push("");
    lines.push(`【減点チェック】${r.deductions}`);
  }
  if (r.ruleChecks.length > 0) {
    lines.push("");
    lines.push("【既存ルール準拠チェック】");
    for (const rc of r.ruleChecks) {
      lines.push(`${rc.passed ? "○" : "×"} ${rc.rule}：${rc.comment}`);
    }
  }
  if (r.priorities.length > 0) {
    lines.push("");
    lines.push("【優先改善】");
    r.priorities.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
  }
  return lines.join("\n");
}
