"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as WebLLM from "@mlc-ai/web-llm";
import { checkOnshaKisha, countChars } from "@/lib/checks";
import { REVIEW_SYSTEM, buildReviewPrompt } from "@/lib/prompt";

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900";

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
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">ブラウザ内AI添削（Gemma）</h1>
          <a href="/" className="text-sm text-blue-600 hover:underline">
            ← 即時チェックに戻る
          </a>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          モデルはあなたのブラウザ上で動きます。ESの内容はサーバーに送信されません（課金・通信ゼロ）。
        </p>
      </header>

      {webgpuOk === false && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          このブラウザは <b>WebGPU 非対応</b>です。Chrome または Edge（最新版）でお試しください。
        </div>
      )}

      {/* モデル読み込み */}
      <section className="mb-6 flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">モデル</span>
            <select
              className={inputClass}
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
          </label>
          <button
            type="button"
            onClick={loadModel}
            disabled={loading || loaded || !modelId || webgpuOk === false}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            {loaded ? "読み込み済み" : loading ? "読み込み中…" : "モデルを読み込む"}
          </button>
        </div>
        {(loading || status) && (
          <div>
            <div className="h-2 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">{status}</p>
          </div>
        )}
        <p className="text-xs text-zinc-400">
          初回はモデル（数百MB〜）をダウンロードします。以降はブラウザにキャッシュされます。
        </p>
      </section>

      {/* 入力 */}
      <section className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">企業名</span>
            <input className={inputClass} value={company} onChange={(e) => setCompany(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">応募職種</span>
            <input className={inputClass} value={role} onChange={(e) => setRole(e.target.value)} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">設問</span>
          <input className={inputClass} value={question} onChange={(e) => setQuestion(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">回答本文</span>
            <span className="text-zinc-500">
              {charCount} 文字
              {misuse.length > 0 && (
                <span className="ml-2 text-amber-600">
                  ・{misuse.map((m) => `${m.spoken}→${m.written}`).join(" ")}
                </span>
              )}
            </span>
          </div>
          <textarea
            className={`${inputClass} min-h-[14rem] resize-y leading-7`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="ここにESの回答を入力"
          />
        </label>

        <button
          type="button"
          onClick={review}
          disabled={!loaded || running || !body.trim()}
          className="w-fit rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {running ? "添削中…" : "ブラウザで添削する"}
        </button>
      </section>

      {/* 結果 */}
      {output && (
        <section className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-2 text-sm font-semibold">添削結果</h2>
          <pre className="whitespace-pre-wrap break-words text-sm leading-7">{output}</pre>
          <p className="mt-3 text-xs text-zinc-400">
            ※ 小型モデルのため、採点や指摘は参考程度に。最終判断はご自身で。
          </p>
        </section>
      )}
    </main>
  );
}
