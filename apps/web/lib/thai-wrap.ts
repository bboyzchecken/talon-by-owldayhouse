// Thai has no spaces, so browsers find line breaks with a word dictionary, and
// that dictionary gets some words wrong: Chrome splits "ต่อยอด" as "ต่อย|อด" and
// "หากลุ่ม" as "หาก|ลุ่ม", and leaves "ส์" or "ล" alone at the start of a line.
// For every word listed here we glue its letter clusters with WORD JOINER so it
// can't split, and put a ZERO WIDTH SPACE on each side so the text around it
// still wraps at the right places. Both characters are invisible.
//
// Found by comparing Chrome's breaks on every Thai page with a dictionary
// segmenter. Add a word when a new mis-break turns up; list the word only, not
// a longer phrase, so the breaks around it stay natural.

const KEEP_WORDS = [
  // Broken into fragments that are not words
  "ต่อยอด",
  "กลุ่ม", // "หากลุ่ม" breaks as "หาก|ลุ่ม"
  "โซเชียล",
  "แดชบอร์ด",
  "อัลกอริทึม",
  "โปรเจกต์",
  "เฮาส์",
  "เฮ้าส์",
  "อาวล์",
  "เช็กลิสต์",
  "เช็ก", // "เช็กชื่อ" breaks as "เช็|กชื่อ"
  "แชตบอต",
  "พื้นที่", // "ลงพื้นที่" breaks as "ลงพื้น|ที่"
  // Loanwords split mid-word
  "คอนเทนต์",
  "ทัชสกรีน",
  "แลนดิ้งเพจ",
  "โปรดักชัน",
  "ซับไตเติล",
];

const WORD_JOINER = "\u2060";
const ZERO_WIDTH_SPACE = "\u200B";

// A Thai letter cluster: an optional leading vowel, a base letter, then any
// marks drawn on or after it. Joiners only go between clusters, never before a
// mark, so vowels and tone marks still attach to their letter.
const CLUSTER = /[\u0E40-\u0E44]?[\u0E01-\u0E30\u0E32\u0E3F\u0E45\u0E46\u0E4F-\u0E5B][\u0E31\u0E33-\u0E3A\u0E47-\u0E4E]*/g;

const glue = (word: string) => ZERO_WIDTH_SPACE + (word.match(CLUSTER) ?? [word]).join(WORD_JOINER) + ZERO_WIDTH_SPACE;

const pattern = new RegExp([...KEEP_WORDS].sort((a, b) => b.length - a.length).join("|"), "g");
const glued = new Map(KEEP_WORDS.map((word) => [word, glue(word)]));

/** Keep the listed Thai words whole when a line wraps. */
export function keepThaiWords(text: string): string {
  return text.replace(pattern, (word) => glued.get(word) ?? word);
}

/** keepThaiWords applied to every string in a content object. */
export function keepThaiWordsDeep<T>(value: T): T {
  if (typeof value === "string") return keepThaiWords(value) as T;
  if (Array.isArray(value)) return value.map(keepThaiWordsDeep) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, keepThaiWordsDeep(item)])) as T;
  }
  return value;
}

/** Remove the invisible wrap characters: for titles, meta tags and JSON-LD. */
export function plainText(text: string): string {
  return text.replace(/[\u2060\u200B]/g, "");
}
