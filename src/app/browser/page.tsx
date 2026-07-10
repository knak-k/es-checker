"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as WebLLM from "@mlc-ai/web-llm";
import { checkOnshaKisha, countChars } from "@/lib/checks";
import { REVIEW_SYSTEM, buildReviewPrompt } from "@/lib/prompt";
import { btnGhost, btnPrimary, card, fieldLabel, input } from "@/lib/ui";

export default function BrowserPage() {
  const [models, setModels] = useState<string[]>([]);
  const [modelId, setModelId] = useState("");
  const [webgpuOk, setWebgpuOk] = useState<boolean | null>(null);

  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [question, setQuestion] = useState("");
  const [body, setBody] = useState("");

  const engineRef = useRef<WebLLM.MLCEngineInterface | null>(null);

  const charCount = useMemo(() => countChars(body), [body]);
  const misuse = useMemo(() => checkOnshaKisha(body), [body]);

  // WebGPU 対応判定 ＋ 利用可能な Gemma モデル一覧の取得（クライアントのみ）
  useEffect(() => {
    setWebgpuOk(typeof navigator !== "undefined" && "gpu" in navigator);
    (async () => {
      const webllm = await import("@mlc-ai/web-llm");
      const gemma = webllm.prebuiltAppConfig.model_list
        .map((m) => m.model_id)
        .filter((id) => id.toLowerCase().includes("gemma"));
      setModels(gemma);
      const preferred =
        gemma.find((id) => id.includes("gemma-2-2b-it-q4f16")) ?? gemma[0] ?? "";
      setModelId(preferred);
    })();
  }, []);

  async function loadModel() {
    if (!modelId) return;
    setLoading(true);
    setLoaded(false);
    setStatus("初期化中…");
    try {
      const webllm = await import("@mlc-ai/web-llm");
      const engine = await webllm.CreateMLCEngine(modelId, {
        initProgressCallback: (r) => {
          setStatus(r.text);
          setProgress(r.progress ?? 0);
        },
      });
      engineRef.current = engine;
      setLoaded(true);
      setStatus("モデル準備完了。添削できます。");
    } catch (e) {
      setStatus(`読み込み失敗: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function review() {
    const engine = engineRef.current;
    if (!engine || !body.trim()) return;
    setRunning(true);
    setOutput("");
    try {
      const stream = await engine.chat.completions.create({
        messages: [
          { role: "system", content: REVIEW_SYSTEM },
          {
            role: "user",
            content: buildReviewPrompt({ company, role, question, body }),
          },
        ],
        temperature: 0.3,
        stream: true,
      });
      let acc = "";
      for await (const chunk of stream) {
        acc += chunk.choices[0]?.delta?.content ?? "";
        setOutput(acc);
      }
    } catch (e) {
      setOutput(`推論エラー: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <section className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          ブラウザ内AI添削（Gemma）
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          モデルはあなたのブラウザ上で動きます。ESの内容はサーバーに送信されません（課金・通信ゼロ）。
          初回はモデルのダウンロードが必要で、WebGPU 対応のPC（Chrome / Edge）向けです。
        </p>
      </section>

      {webgpuOk === false && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          このブラウザは <b>WebGPU 非対応</b>です。Chrome または
          Edge（最新版）でお試しください。スマホの場合はトップの「AI添削」をご利用ください。
        </div>
      )}

      {/* モデル読み込み */}
      <div className={`${card} mb-6 p-5`}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label className={fieldLabel}>モデル</label>
            <select
              className={input}
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              disabled={loading || loaded}
            >
              {models.length === 0 && <option value="">読み込み中…</option>}
              {models.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={loadModel}
            disabled={loading || loaded || !modelId || webgpuOk === false}
            className={btnGhost}
          >
            {loaded ? "読み込み済み" : loading ? "読み込み中…" : "モデルを読み込む"}
          </button>
        </div>
        {(loading || status) && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">{status}</p>
          </div>
        )}
        <p className="mt-3 text-xs text-zinc-400">
          初回はモデル（数百MB〜）をダウンロードします。以降はブラウザにキャッシュされます。
        </p>
      </div>

      {/* 入力 */}
      <div className={`${card} p-5 sm:p-6`}>
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={fieldLabel}>企業名</label>
              <input
                className={input}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={fieldLabel}>応募職種</label>
              <input
                className={input}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={fieldLabel}>設問</label>
            <input
              className={input}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
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
                <span className="tabular-nums text-zinc-500">
                  {charCount} 文字
                </span>
              </div>
            </div>
            <textarea
              className={`${input} min-h-[14rem] resize-y leading-7`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="ここにESの回答を入力"
            />
          </div>

          <button
            type="button"
            onClick={review}
            disabled={!loaded || running || !body.trim()}
            className={`${btnPrimary} w-full sm:w-auto`}
          >
            {running ? "添削中…" : "ブラウザで添削する"}
          </button>
        </div>
      </div>

      {/* 結果 */}
      {output && (
        <div className={`${card} mt-6 p-5 sm:p-6`}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <span className="grid h-5 w-5 place-items-center rounded bg-indigo-600 text-[10px] text-white">
              AI
            </span>
            添削結果
          </h2>
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7">
            {output}
          </pre>
          <p className="mt-4 border-t border-zinc-100 pt-3 text-xs text-zinc-400 dark:border-zinc-800">
            ※ 小型モデルのため、採点や指摘は参考程度に。最終判断はご自身で。
          </p>
        </div>
      )}
    </main>
  );
}
