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
import {
  type Draft,
  draftLabel,
  loadDrafts,
  newDraft,
  saveDrafts,
} from "@/lib/drafts";

const EMPTY = { company: "", role: "", question: "", body: "", maxChars: "" };

export default function Home() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const [reviewing, setReviewing] = useState(false);
  const [result, setResult] = useState("");
  const [apiError, setApiError] = useState("");

  // 起動時に下書きを読み込み（無ければ1件作成）。旧・単一下書きは自動移行。
  useEffect(() => {
    let loaded = loadDrafts();
    if (loaded.length === 0) loaded = [newDraft()];
    setDrafts(loaded);
    setCurrentId(loaded[0].id);
    setHydrated(true);
  }, []);

  // 変更を自動保存
  useEffect(() => {
    if (!hydrated) return;
    saveDrafts(drafts);
  }, [hydrated, drafts]);

  const current = drafts.find((d) => d.id === currentId) ?? null;
  const f = current ?? EMPTY;

  function updateCurrent(patch: Partial<Draft>) {
    if (!currentId) return;
    setDrafts((ds) =>
      ds.map((d) =>
        d.id === currentId ? { ...d, ...patch, updatedAt: Date.now() } : d,
      ),
    );
  }

  function switchDraft(id: string) {
    setCurrentId(id);
    setResult("");
    setApiError("");
  }

  function addDraft() {
    const d = newDraft();
    setDrafts([d, ...drafts]);
    setCurrentId(d.id);
    setResult("");
    setApiError("");
  }

  function deleteCurrent() {
    if (!current) return;
    if (!window.confirm(`「${draftLabel(current)}」を削除しますか？`)) return;
    const rest = drafts.filter((d) => d.id !== currentId);
    if (rest.length === 0) {
      const blank = newDraft();
      setDrafts([blank]);
      setCurrentId(blank.id);
    } else {
      setDrafts(rest);
      setCurrentId(rest[0].id);
    }
    setResult("");
    setApiError("");
  }

  const charCount = useMemo(() => countChars(f.body), [f.body]);
  const misuse = useMemo(() => checkOnshaKisha(f.body), [f.body]);

  const limit = f.maxChars === "" ? null : Number(f.maxChars);
  const over = limit !== null && charCount > limit;
  const overBy = limit !== null ? charCount - limit : 0;
  const ratio = limit && limit > 0 ? Math.min(charCount / limit, 1) : 0;
  const meterVariant = over ? "danger" : ratio >= 0.9 ? "warning" : "info";

  async function runReview() {
    if (!f.body.trim()) return;
    setReviewing(true);
    setApiError("");
    setResult("");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: f.company,
          role: f.role,
          question: f.question,
          body: f.body,
        }),
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

      {/* 下書き（企業別）ツールバー */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <Form.Select
          size="sm"
          style={{ maxWidth: 260 }}
          value={currentId}
          onChange={(e) => switchDraft(e.target.value)}
          aria-label="下書きを選択"
        >
          {drafts.map((d) => (
            <option key={d.id} value={d.id}>
              {draftLabel(d)}
            </option>
          ))}
        </Form.Select>
        <Button size="sm" variant="outline-primary" onClick={addDraft}>
          ＋ 新規
        </Button>
        <Button
          size="sm"
          variant="outline-danger"
          onClick={deleteCurrent}
          disabled={!current}
        >
          削除
        </Button>
        <span className="text-body-secondary small ms-auto">
          この端末に自動保存
        </span>
      </div>

      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <Row className="g-3">
            <Col sm={6}>
              <Form.Group>
                <Form.Label>企業名</Form.Label>
                <Form.Control
                  value={f.company}
                  onChange={(e) => updateCurrent({ company: e.target.value })}
                  placeholder="例）株式会社〇〇"
                />
              </Form.Group>
            </Col>
            <Col sm={6}>
              <Form.Group>
                <Form.Label>応募職種</Form.Label>
                <Form.Control
                  value={f.role}
                  onChange={(e) => updateCurrent({ role: e.target.value })}
                  placeholder="例）研究開発職 / エンジニア"
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mt-3">
            <Form.Label>設問</Form.Label>
            <Form.Control
              value={f.question}
              onChange={(e) => updateCurrent({ question: e.target.value })}
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
              value={f.body}
              onChange={(e) => updateCurrent({ body: e.target.value })}
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
              value={f.maxChars}
              onChange={(e) => updateCurrent({ maxChars: e.target.value })}
              placeholder="例）400"
            />
          </Form.Group>

          <div className="d-grid d-sm-block mt-4">
            <Button
              variant="primary"
              onClick={runReview}
              disabled={reviewing || !f.body.trim()}
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
