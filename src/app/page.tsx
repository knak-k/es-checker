"use client";

import { useEffect, useMemo, useState } from "react";
import { checkOnshaKisha, countChars } from "@/lib/checks";
import { btnGhost, btnPrimary, card, fieldLabel, input } from "@/lib/ui";

const DRAFT_KEY = "es-checker:draft:v1";

export default function Home() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [question, setQuestion] = useState("");
  const [body, setBody] = useState("");
  const [maxChars, setMaxChars] = useState("");

  const [reviewing, setReviewing] = useState(false);
  const [result, setResult] = useState("");
  const [apiError, setApiError] = useState("");

  // 下書きの自動保存（localStorage）。hydrated 前に空値で上書きしないようガード。
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (typeof d.company === "string") setCompany(d.company);
        if (typeof d.role === "string") setRole(d.role);
        if (typeof d.question === "string") setQuestion(d.question);
        if (typeof d.body === "string") setBody(d.body);
        if (typeof d.maxChars === "string") setMaxChars(d.maxChars);
      }
    } catch {
      // 破損した下書きは無視
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ company, role, question, body, maxChars }),
      );
    } catch {
      // 容量超過など保存不可でも致命的ではない
    }
  }, [hydrated, company, role, question, body, maxChars]);

  function clearDraft() {
    setCompany("");
    setRole("");
    setQuestion("");
    setBody("");
    setMaxChars("");
    setResult("");
    setApiError("");
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // 無視
    }
  }

  const charCount = useMemo(() => countChars(body), [body]);
  const misuse = useMemo(() => checkOnshaKisha(body), [body]);

  const limit = maxChars === "" ? null : Number(maxChars);
  const over = limit !== null && charCount > limit;
  const overBy = limit !== null ? charCount - limit : 0;
  const ratio = limit && limit > 0 ? Math.min(charCount / limit, 1) : 0;
  const meterColor = over
    ? "bg-red-500"
    : ratio >= 0.9
      ? "bg-amber-500"
      : "bg-indigo-500";

  async function runReview() {
    if (!body.trim()) return;
    setReviewing(true);
    setApiError("");
    setResult("");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, role, question, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error ?? "添削に失敗しました。");
      } else {
        setResult(data.result ?? "");
      }
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "通信に失敗しました。");
    } finally {
      setReviewing(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <section className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          ESをその場で添削
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          文字数と「御社／貴社」はリアルタイムでチェック。AI添削はサーバー上の Gemini
          が採点します。スマホでもそのまま使えます。
        </p>
      </section>

      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-zinc-400">
          下書きはこの端末に自動保存されます
        </p>
        <button
          type="button"
          onClick={clearDraft}
          className={`${btnGhost} px-3 py-1.5 text-xs`}
        >
          クリア
        </button>
      </div>

      <div className={`${card} p-5 sm:p-6`}>
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={fieldLabel}>企業名</label>
              <input
                className={input}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="例）株式会社〇〇"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={fieldLabel}>応募職種</label>
              <input
                className={input}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="例）研究開発職 / エンジニア"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={fieldLabel}>設問</label>
            <input
              className={input}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="例）学生時代に力を入れたことを教えてください"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className={fieldLabel}>回答本文</label>
              <div className="flex items-center gap-2 text-xs">
                {misuse.map((m) => (
                  <span
                    key={m.spoken}
                    className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  >
                    {m.spoken}→{m.written} ×{m.count}
                  </span>
                ))}
                <span
                  className={`tabular-nums ${over ? "font-semibold text-red-500" : "text-zinc-500"}`}
                >
                  {charCount}
                  {limit !== null ? ` / ${limit}` : ""} 文字
                </span>
              </div>
            </div>
            <textarea
              className={`${input} min-h-[15rem] resize-y leading-7`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="ここにESの回答を貼り付け／入力してください"
            />
            {limit !== null && (
              <div className="mt-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all ${meterColor}`}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
                {over && (
                  <p className="mt-1 text-xs text-red-500">
                    上限を {overBy} 文字オーバー
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5 sm:w-44">
            <label className={fieldLabel}>文字数上限</label>
            <input
              className={input}
              type="number"
              min={0}
              value={maxChars}
              onChange={(e) => setMaxChars(e.target.value)}
              placeholder="例）400"
            />
          </div>

          <button
            type="button"
            onClick={runReview}
            disabled={reviewing || !body.trim()}
            className={`${btnPrimary} w-full sm:w-auto`}
          >
            {reviewing ? "添削中…" : "AIで添削する"}
          </button>

          {apiError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
              {apiError}
            </p>
          )}
        </div>
      </div>

      {result && (
        <div className={`${card} mt-6 p-5 sm:p-6`}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <span className="grid h-5 w-5 place-items-center rounded bg-indigo-600 text-[10px] text-white">
              AI
            </span>
            添削結果
          </h2>
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7">
            {result}
          </pre>
          <p className="mt-4 border-t border-zinc-100 pt-3 text-xs text-zinc-400 dark:border-zinc-800">
            ※ 無料AIのため入力が学習に使われる場合があります。添削は参考で、最終判断はご自身で。
          </p>
        </div>
      )}
    </main>
  );
}
