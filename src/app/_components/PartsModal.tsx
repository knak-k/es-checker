"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Col, Form, Modal, Row } from "react-bootstrap";
import { countChars } from "@/lib/checks";
import {
  PART_CATEGORIES,
  type Part,
  type PartVersion,
  loadParts,
  newPart,
  newVersion,
  partLabel,
  saveParts,
} from "@/lib/parts";

type Props = {
  show: boolean;
  onHide: () => void;
  onInsert: (text: string) => void;
};

export function PartsModal({ show, onHide, onInsert }: Props) {
  const [parts, setParts] = useState<Part[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      setParts(loadParts());
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveParts(parts);
  }, [hydrated, parts]);

  function addPart() {
    setParts((ps) => [newPart(), ...ps]);
  }

  function updatePart(id: string, patch: Partial<Part>) {
    setParts((ps) =>
      ps.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)),
    );
  }

  function deletePart(id: string, label: string) {
    if (!window.confirm(`「${label}」を削除しますか？（全バージョンが削除されます）`)) return;
    setParts((ps) => ps.filter((p) => p.id !== id));
  }

  function addVersionTo(partId: string) {
    setParts((ps) =>
      ps.map((p) =>
        p.id === partId
          ? {
              ...p,
              versions: [...p.versions, newVersion(`バージョン${p.versions.length + 1}`)],
              updatedAt: Date.now(),
            }
          : p,
      ),
    );
  }

  function updateVersion(partId: string, versionId: string, patch: Partial<PartVersion>) {
    setParts((ps) =>
      ps.map((p) =>
        p.id === partId
          ? {
              ...p,
              versions: p.versions.map((v) =>
                v.id === versionId ? { ...v, ...patch } : v,
              ),
              updatedAt: Date.now(),
            }
          : p,
      ),
    );
  }

  function deleteVersion(partId: string, versionId: string) {
    setParts((ps) =>
      ps.map((p) => {
        if (p.id !== partId || p.versions.length <= 1) return p;
        return {
          ...p,
          versions: p.versions.filter((v) => v.id !== versionId),
          updatedAt: Date.now(),
        };
      }),
    );
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="h6 mb-0">ESパーツ</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <p className="text-body-secondary small mb-0">
            使い回す文章（自己PR・ガクチカなど）を登録しておき、本文の末尾に挿入できます。
            1つのパーツに文字数違いの複数バージョンを持たせられます。
          </p>
          <Button size="sm" variant="outline-primary" onClick={addPart} className="ms-2 flex-shrink-0">
            ＋ 新規パーツ
          </Button>
        </div>

        {parts.length === 0 ? (
          <p className="text-body-secondary mb-0">まだパーツがありません。</p>
        ) : (
          <div className="d-flex flex-column gap-3">
            {parts.map((p) => (
              <div key={p.id} className="border rounded p-3">
                <Row className="g-2 align-items-center">
                  <Col sm={7}>
                    <Form.Control
                      size="sm"
                      value={p.title}
                      onChange={(e) => updatePart(p.id, { title: e.target.value })}
                      placeholder={partLabel(p)}
                    />
                  </Col>
                  <Col sm={4}>
                    <Form.Select
                      size="sm"
                      value={p.category}
                      onChange={(e) => updatePart(p.id, { category: e.target.value })}
                    >
                      {PART_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col sm={1} className="text-end">
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => deletePart(p.id, partLabel(p))}
                    >
                      削除
                    </Button>
                  </Col>
                </Row>

                <div className="d-flex flex-column gap-2 mt-2">
                  {p.versions.map((v) => (
                    <div key={v.id} className="bg-body-tertiary rounded p-2">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <Form.Control
                          size="sm"
                          style={{ maxWidth: 200 }}
                          value={v.label}
                          onChange={(e) =>
                            updateVersion(p.id, v.id, { label: e.target.value })
                          }
                        />
                        <Badge bg="secondary" className="font-monospace">
                          {countChars(v.body)} 字
                        </Badge>
                        <div className="ms-auto d-flex gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => onInsert(v.body)}
                            disabled={!v.body.trim()}
                          >
                            本文に挿入
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => deleteVersion(p.id, v.id)}
                            disabled={p.versions.length <= 1}
                          >
                            削除
                          </Button>
                        </div>
                      </div>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={v.body}
                        onChange={(e) =>
                          updateVersion(p.id, v.id, { body: e.target.value })
                        }
                        placeholder="ここに使い回す文章を入力"
                      />
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="link"
                    className="align-self-start"
                    onClick={() => addVersionTo(p.id)}
                  >
                    ＋ バージョン追加（字数違いなど）
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}
