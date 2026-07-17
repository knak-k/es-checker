import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
} from "@google/generative-ai";
import { NextResponse } from "next/server";
import { REVIEW_SYSTEM, buildReviewPrompt, type ReviewInput } from "@/lib/prompt";

// サーバー側でのみ実行される。APIキーはここでしか読まれず、クライアントには出ない。
export const runtime = "nodejs";

export async function POST(req: Request) {
  // 入力検証を先に（クライアントの誤りは 400 で返す）
  let input: ReviewInput;
  try {
    input = (await req.json()) as ReviewInput;
  } catch {
    return NextResponse.json(
      { error: "リクエストの解析に失敗しました。" },
      { status: 400 },
    );
  }

  if (!input?.body?.trim()) {
    return NextResponse.json({ error: "本文が空です。" }, { status: 400 });
  }

  // サーバー設定（キー）チェック
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GEMINI_API_KEY が未設定です。es-checker/.env.local に無料キーを設定してください。",
      },
      { status: 500 },
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      systemInstruction: REVIEW_SYSTEM,
    });
    const result = await model.generateContent(buildReviewPrompt(input));
    return NextResponse.json({ result: result.response.text() });
  } catch (e) {
    if (e instanceof GoogleGenerativeAIFetchError) {
      if (e.status === 429) {
        return NextResponse.json(
          {
            error:
              "現在アクセスが集中しており、無料枠の利用上限に達しました。1分ほど時間をおいて再度お試しください。",
          },
          { status: 429 },
        );
      }
      if (e.status === 400 || e.status === 403) {
        return NextResponse.json(
          {
            error:
              "APIキーが無効か、権限がありません。GEMINI_API_KEY の設定を確認してください。",
          },
          { status: 502 },
        );
      }
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `添削に失敗しました: ${msg}` },
      { status: 502 },
    );
  }
}
