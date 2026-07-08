"use client";

import { useMemo, useState } from "react";
import { checkOnshaKisha, countChars } from "@/lib/checks";

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900";

export default function Home() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [question, setQuestion] = useState("");
  const [body, setBody] = useState("");
  const [maxChars, setMaxChars] = useState("");

  const charCount = useMemo(() => countChars(body), [body]);
  const misuse = useMemo(() => checkOnshaKisha(body), [body]);

  const limit = maxChars === "" ? null : Number(maxChars);
  const over = limit !== null && charCount > limit;
  const overBy = limit !== null ? charCount - limit : 0;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">ES添削ツール</h1>
        <p className="mt-1 text-sm text-zinc-500">
          書いたその場で、文字数と「御社／貴社」を即チェック。AI添削は次のステップで追加します。
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        {/* 入力 */}
        <section className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">企業名</span>
              <input
                className={inputClass}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="例）株式会社〇〇"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">応募職種</span>
              <input
                className={inputClass}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="例）研究開発職 / エンジニア"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">設問</span>
            <input
              className={inputClass}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="例）学生時代に力を入れたことを教えてください"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">回答本文</span>
              <span className={over ? "text-red-500" : "text-zinc-500"}>
                {charCount}
                {limit !== null ? ` / ${limit}` : ""} 文字
              </span>
            </div>
            <textarea
              className={`${inputClass} min-h-[16rem] resize-y leading-7`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="ここにESの回答を貼り付け／入力してください"
            />
          </label>

          <label className="flex w-40 flex-col gap-1 text-sm">
            <span className="font-medium">文字数上限</span>
            <input
              className={inputClass}
              type="number"
              min={0}
              value={maxChars}
              onChange={(e) => setMaxChars(e.target.value)}
              placeholder="例）400"
            />
          </label>

          <button
            type="button"
            disabled
            title="AI添削は Step 2 で実装予定"
            className="w-fit cursor-not-allowed rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white opacity-40 dark:bg-white dark:text-black"
          >
            添削する（Step 2 で実装）
          </button>
        </section>

        {/* 即時チェック */}
        <aside className="flex h-fit flex-col gap-5 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold">即時チェック</h2>

          <div>
            <div className="text-xs text-zinc-500">文字数（改行・空白除外）</div>
            <div className={`text-2xl font-bold ${over ? "text-red-500" : ""}`}>
              {charCount}
              {limit !== null && (
                <span className="text-base font-normal text-zinc-500">
                  {" "}
                  / {limit}
                </span>
              )}
            </div>
            {over && (
              <div className="mt-0.5 text-xs text-red-500">
                上限を {overBy} 文字オーバー
              </div>
            )}
          </div>

          <div>
            <div className="text-xs text-zinc-500">御社／貴社チェック</div>
            {misuse.length === 0 ? (
              <div className="mt-1 text-sm text-green-600 dark:text-green-500">
                問題なし
              </div>
            ) : (
              <ul className="mt-1 space-y-1 text-sm text-amber-600 dark:text-amber-500">
                {misuse.map((m) => (
                  <li key={m.spoken}>
                    「{m.spoken}」× {m.count} → ES（書き言葉）では「{m.written}」が適切
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
