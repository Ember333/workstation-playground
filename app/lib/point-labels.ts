const NEGATIVE_CIRCLED_NUMBERS = [
  "❶",
  "❷",
  "❸",
  "❹",
  "❺",
  "❻",
  "❼",
  "❽",
  "❾",
  "❿",
  "⓫",
  "⓬",
  "⓭",
  "⓮",
  "⓯",
  "⓰",
  "⓱",
  "⓲",
  "⓳",
  "⓴",
] as const;

export function getPointLabel(index: number) {
  return NEGATIVE_CIRCLED_NUMBERS[index] ?? String(index + 1);
}
