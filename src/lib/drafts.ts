// 企業別のES下書きを localStorage で複数管理する。

export type Draft = {
  id: string;
  company: string;
  role: string;
  question: string;
  body: string;
  maxChars: string;
  updatedAt: number;
};

const KEY = "es-checker:drafts:v1";
const LEGACY_KEY = "es-checker:draft:v1"; // 旧・単一下書き

function isDraft(x: unknown): x is Draft {
  if (!x || typeof x !== "object") return false;
  const d = x as Record<string, unknown>;
  return (
    typeof d.id === "string" &&
    typeof d.company === "string" &&
    typeof d.role === "string" &&
    typeof d.question === "string" &&
    typeof d.body === "string" &&
    typeof d.maxChars === "string"
  );
}

export function newDraft(): Draft {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    company: "",
    role: "",
    question: "",
    body: "",
    maxChars: "",
    updatedAt: Date.now(),
  };
}

export function loadDrafts(): Draft[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const valid = parsed.filter(isDraft);
        if (valid.length > 0) return valid;
      }
    }
  } catch {
    // 壊れていれば移行/新規にフォールバック
  }
  // 旧・単一下書きからの移行
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const d = JSON.parse(legacy) as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === "string" ? v : "");
      return [
        {
          ...newDraft(),
          company: str(d.company),
          role: str(d.role),
          question: str(d.question),
          body: str(d.body),
          maxChars: str(d.maxChars),
        },
      ];
    }
  } catch {
    // 無視
  }
  return [];
}

export function saveDrafts(drafts: Draft[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(drafts));
  } catch {
    // 容量超過などは無視
  }
}

// ドロップダウン表示用のラベル（企業名 → 設問 → 本文 → 無題）。
export function draftLabel(d: Draft): string {
  const pick = (s: string) =>
    s.trim() ? (s.trim().length > 14 ? `${s.trim().slice(0, 14)}…` : s.trim()) : "";
  return pick(d.company) || pick(d.question) || pick(d.body) || "無題";
}
