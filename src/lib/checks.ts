// クライアント完結の即時チェック（AI不要・課金ゼロ）。
// plan.md: 文字数は「改行・空白を除いた本文」をプログラムで計算する。

/**
 * 文字数カウント（改行・空白を除外）。
 * JS の \s は全角スペース(U+3000)・NBSP も含む。code point 単位で数えるため
 * サロゲートペア（絵文字など）も1文字として正しくカウントする。
 */
export function countChars(text: string): number {
  const stripped = text.replace(/\s/gu, "");
  return [...stripped].length;
}

export type MisuseHit = {
  spoken: string; // 話し言葉（面接向け）
  written: string; // 書き言葉（ES向け）
  count: number;
};

// 話し言葉（御〜）→ 書き言葉（貴〜）。ESは書き言葉なので御〜を検出して貴〜を提案する。
const SPOKEN_TO_WRITTEN: Record<string, string> = {
  御社: "貴社",
  御行: "貴行",
  御校: "貴校",
  御庁: "貴庁",
  御院: "貴院",
  御園: "貴園",
  御法人: "貴法人",
  御店: "貴店",
};

/**
 * 御社／貴社の誤用チェック。
 * ES（書き言葉）で話し言葉の「御〜」が使われていたら、対応する「貴〜」を提案する。
 * 「御中」「御礼」などの正当な用法は対象外（マップに載せていない）。
 */
export function checkOnshaKisha(text: string): MisuseHit[] {
  const hits: MisuseHit[] = [];
  for (const [spoken, written] of Object.entries(SPOKEN_TO_WRITTEN)) {
    const count = text.split(spoken).length - 1;
    if (count > 0) hits.push({ spoken, written, count });
  }
  return hits;
}
