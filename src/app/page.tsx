"use client";

import { useEffect, useMemo, useState } from "react";
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
  const meterVariant = over ? "danger" : ratio >= 0.9 ? "warning" : "info";

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
    <Container className="py-4 py-sm-5" style={{ maxWidth: 780 }}>
      <div className="mb-4">
        <h1 className="fw-bold">ESをその場で添削</h1>
        <p className="text-body-secondary mb-0">
          文字数と「御社／貴社」はリアルタイムでチェック。AI添削はサーバー上の Gemini
          が採点します。スマホでもそのまま使えます。
        </p>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="text-body-secondary small">
          下書きはこの端末に自動保存されます
        </span>
        <Button variant="outline-secondary" size="sm" onClick={clearDraft}>
          クリア
        </Button>
      </div>

      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <Row className="g-3">
            <Col sm={6}>
              <Form.Group>
                <Form.Label>企業名</Form.Label>
                <Form.Control
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="例）株式会社〇〇"
                />
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group>
                <Form.Label>応募職種</Form.Label>
                <Form.Control
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="例）研究開発職 / エンジニア"
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mt-3">
            <Form.Label>設問</Form.Label>
            <Form.Control
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="例）学生時代に力を入れたことを教えてください"
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
                <span
                  className={`small font-monospace ${over ? "text-danger fw-semibold" : "text-body-secondary"}`}
                >
                  {charCount}
                  {limit !== null ? ` / ${limit}` : ""} 文字
                </span>
              </div>
            </div>
            <Form.Control
              as="textarea"
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="ここにESの回答を貼り付け／入力してください"
            />
            {limit !== null && (
              <>
                <ProgressBar
                  className="mt-2"
                  style={{ height: 6 }}
                  now={ratio * 100}
                  variant={meterVariant}
                />
                {over && (
                  <div className="text-danger small mt-1">
                    上限を {overBy} 文字オーバー
                  </div>
                )}
              </>
            )}
          </Form.Group>

          <Form.Group className="mt-3" style={{ maxWidth: 180 }}>
            <Form.Label>文字数上限</Form.Label>
            <Form.Control
              type="number"
              min={0}
              value={maxChars}
              onChange={(e) => setMaxChars(e.target.value)}
              placeholder="例）400"
            />
          </Form.Group>

          <div className="d-grid d-sm-block mt-4">
            <Button
              variant="primary"
              onClick={runReview}
              disabled={reviewing || !body.trim()}
            >
              {reviewing ? "添削中…" : "AIで添削する"}
            </Button>
          </div>

          {apiError && (
            <Alert variant="danger" className="mt-3 mb-0">
              {apiError}
            </Alert>
          )}
        </Card.Body>
      </Card>

      {result && (
        <Card className="shadow-sm mt-4">
          <Card.Body className="p-4">
            <h2 className="h6 d-flex align-items-center gap-2 mb-3">
              <Badge bg="primary">AI</Badge>
              添削結果
            </h2>
            <div className="review-output">{result}</div>
            <p className="text-body-secondary small border-top pt-3 mt-3 mb-0">
              ※ 無料AIのため入力が学習に使われる場合があります。添削は参考で、最終判断はご自身で。
            </p>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}
