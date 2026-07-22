// ESパーツ（使い回し部品）をカテゴリ別・字数バージョン別に localStorage で管理する。

export type PartVersion = {
  id: string;
  label: string; // 例: "標準版(400字)"
  body: string;
};

export type Part = {
  id: string;
  category: string;
  title: string;
  versions: PartVersion[];
  updatedAt: number;
};

export const PART_CATEGORIES = [
  "自己PR",
  "ガクチカ",
  "志望動機",
  "強み・弱み",
  "その他",
] as const;

const KEY = "es-checker:parts:v1";

function isPartVersion(x: unknown): x is PartVersion {
  if (!x || typeof x !== "object") return false;
  const v = x as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.label === "string" &&
    typeof v.body === "string"
  );
}

function isPart(x: unknown): x is Part {
  if (!x || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.category === "string" &&
    typeof p.title === "string" &&
    Array.isArray(p.versions) &&
    p.versions.length > 0 &&
    p.versions.every(isPartVersion) &&
    typeof p.updatedAt === "number"
  );
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function newVersion(label: string): PartVersion {
  return { id: newId(), label, body: "" };
}

export function newPart(): Part {
  return {
    id: newId(),
    category: PART_CATEGORIES[0],
    title: "",
    versions: [newVersion("標準版")],
    updatedAt: Date.now(),
  };
}

export function loadParts(): Part[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(isPart);
    }
  } catch {
    // 壊れていれば空扱い
  }
  return [];
}

export function saveParts(parts: Part[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(parts));
  } catch {
    // 容量超過などは無視
  }
}

// パーツ一覧表示用のラベル（タイトル → 本文冒頭 → 無題）。
export function partLabel(p: Part): string {
  const pick = (s: string) =>
    s.trim() ? (s.trim().length > 20 ? `${s.trim().slice(0, 20)}…` : s.trim()) : "";
  return pick(p.title) || "無題パーツ";
}
