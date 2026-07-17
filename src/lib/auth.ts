// サイト全体の簡易パスワードゲート。
// middleware（Edge runtime）と /api/login（Node runtime）の両方から呼べるよう、
// 両ランタイムに共通する Web Crypto API (crypto.subtle) のみを使う。

export const AUTH_COOKIE = "es_auth";
const MESSAGE = "es-checker-auth";

export async function computeAuthToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(MESSAGE));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// 文字列比較を一定時間にし、タイミング攻撃で長さ・内容を推測されにくくする。
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
