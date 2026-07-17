// 企業別のES下書きを localStorage で複数管理する。

// 添削を実行するたびに自動保存される、本文のスナップショット（バージョン履歴・比較用）。
export type DraftVersion = {
  id: string;
  body: string;
  overallScore: number | null; // 添削なしで保存した場合は null（現状は常に添削時にのみ作成）
  savedAt: number;
};

export type Draft = {
  id: string;
  company: string;
  role: string;
  question: string;
  body: string;
  maxChars: string;
  updatedAt: number;
  versions?: DraftVersion[]; // 後方互換のため optional（旧データには存在しない）
};

const KEY = "es-checker:drafts:v1";
const LEGACY_KEY = "es-checker:draft:v1"; // 旧・単一下書き
const MAX_VERSIONS = 20;

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

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function newDraft(): Draft {
  return {
    id: newId(),
    company: "",
    role: "",
    question: "",
    body: "",
    maxChars: "",
    updatedAt: Date.now(),
  };
}

// 添削実行時などに、本文のスナップショットを履歴として先頭に追加する（最大 MAX_VERSIONS 件）。
export function addVersion(
  draft: Draft,
  snapshot: { body: string; overallScore: number | null },
): Draft {
  const version: DraftVersion = {
    id: newId(),
    body: snapshot.body,
    overallScore: snapshot.overallScore,
    savedAt: Date.now(),
  };
  const versions = [version, ...(draft.versions ?? [])].slice(0, MAX_VERSIONS);
  return { ...draft, versions };
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
