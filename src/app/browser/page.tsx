"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as WebLLM from "@mlc-ai/web-llm";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  ProgressBar,
  Row,
} from "react-bootstrap";
import { checkOnshaKisha, countChars } from "@/lib/checks";
import { REVIEW_SYSTEM, buildFreeformReviewPrompt } from "@/lib/prompt";

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
            content: buildFreeformReviewPrompt({ company, role, question, body }),
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
    <Container className="py-4 py-sm-5" style={{ maxWidth: 780 }}>
      <div className="mb-4">
        <h1 className="fw-bold">ブラウザ内AI添削（Gemma）</h1>
        <p className="text-body-secondary mb-0">
          モデルはあなたのブラウザ上で動きます。ESの内容はサーバーに送信されません（課金・通信ゼロ）。
          初回はモデルのダウンロードが必要で、WebGPU 対応のPC（Chrome / Edge）向けです。
        </p>
      </div>

      {webgpuOk === false && (
        <Alert variant="warning">
          このブラウザは <b>WebGPU 非対応</b>です。Chrome または
          Edge（最新版）でお試しください。スマホの場合はトップの「AI添削」をご利用ください。
        </Alert>
      )}

      {/* モデル読み込み */}
      <Card className="shadow-sm mb-4">
        <Card.Body className="p-4">
          <Row className="g-2 align-items-end">
            <Col>
              <Form.Group>
                <Form.Label>モデル</Form.Label>
                <Form.Select
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
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs="auto">
              <Button
                variant="outline-primary"
                onClick={loadModel}
                disabled={loading || loaded || !modelId || webgpuOk === false}
              >
                {loaded
                  ? "読み込み済み"
                  : loading
                    ? "読み込み中…"
                    : "モデルを読み込む"}
              </Button>
            </Col>
          </Row>
          {(loading || status) && (
            <div className="mt-3">
              <ProgressBar
                style={{ height: 6 }}
                now={Math.round(progress * 100)}
              />
              <div className="text-body-secondary small mt-1">{status}</div>
            </div>
          )}
          <div className="text-body-secondary small mt-3">
            初回はモデル（数百MB〜）をダウンロードします。以降はブラウザにキャッシュされます。
          </div>
        </Card.Body>
      </Card>

      {/* 入力 */}
      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <Row className="g-3">
            <Col sm={6}>
              <Form.Group>
                <Form.Label>企業名</Form.Label>
                <Form.Control
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group>
                <Form.Label>応募職種</Form.Label>
                <Form.Control
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mt-3">
            <Form.Label>設問</Form.Label>
            <Form.Control
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mt-3">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
              <Form.Label className="mb-0">回答本文</Form.Label>
              <div className="d-flex align-items-center gap-2">
                {misuse.map((m) => (
                  <Badge key={m.spoken} bg="warning" text="dark">
                    {m.spoken}→{m.written} ×{m.count}
                  </Badge>
                ))}
                <span className="small font-monospace text-body-secondary">
                  {charCount} 文字
                </span>
              </div>
            </div>
            <Form.Control
              as="textarea"
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="ここにESの回答を入力"
            />
          </Form.Group>

          <div className="d-grid d-sm-block mt-4">
            <Button
              variant="primary"
              onClick={review}
              disabled={!loaded || running || !body.trim()}
            >
              {running ? "添削中…" : "ブラウザで添削する"}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* 結果 */}
      {output && (
        <Card className="shadow-sm mt-4">
          <Card.Body className="p-4">
            <h2 className="h6 d-flex align-items-center gap-2 mb-3">
              <Badge bg="primary">AI</Badge>
              添削結果
            </h2>
            <div className="review-output">{output}</div>
            <p className="text-body-secondary small border-top pt-3 mt-3 mb-0">
              ※ 小型モデルのため、採点や指摘は参考程度に。最終判断はご自身で。
            </p>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}
