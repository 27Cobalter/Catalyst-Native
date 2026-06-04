export function emojiToCodepoints(emoji: string): string {
  const codepoints: string[] = [];
  for (const char of emoji) {
    const cp = char.codePointAt(0);
    if (cp !== undefined) {
      codepoints.push(cp.toString(16).padStart(4, "0"));
    }
  }
  return codepoints.join("-");
}

// Twemoji のファイル名ルックアップ用。
// U+FE0F (variation selector-16) は ZWJ (U+200D) の直前のみファイル名に含まれるため、
// それ以外の位置の U+FE0F は除去する。
export function emojiToTwemojiKey(emoji: string): string {
  const chars = [...emoji];
  const codepoints: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const cp = chars[i].codePointAt(0);
    if (cp === undefined) continue;
    if (cp === 0xfe0f && chars[i + 1]?.codePointAt(0) !== 0x200d) continue;
    codepoints.push(cp.toString(16));
  }
  return codepoints.join("-");
}
