const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function normalizeDigits(value) {
  if (typeof value !== "string") return value;
  return value.replace(/[٠-٩۰-۹]/g, (ch) => {
    const ar = AR_DIGITS.indexOf(ch);
    if (ar >= 0) return String(ar);
    const fa = FA_DIGITS.indexOf(ch);
    return fa >= 0 ? String(fa) : ch;
  });
}

export function parseNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let text = normalizeDigits(String(value)).trim();
  if (!text) return null;
  if (["فارغ", "-", "—", "–", "N/A", "NA", "n/a", "null", "NULL"].includes(text)) return null;

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }

  text = text
    .replace(/[٬,]/g, "")
    .replace(/\s+/g, "")
    .replace(/ج\.م/g, "")
    .replace(/[EGP$€£%]/gi, "")
    .replace(/[−–—]/g, "-");

  if (text.startsWith("-")) {
    negative = true;
    text = text.slice(1);
  }

  if (!/^\d*\.?\d+$/.test(text) && !/^\d+\.\d*$/.test(text)) return null;
  const num = Number(text);
  if (!Number.isFinite(num)) return null;
  return negative ? -num : num;
}

export function sum(values) {
  return values.reduce((acc, value) => acc + (Number.isFinite(value) ? value : 0), 0);
}

export function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? sum(valid) / valid.length : null;
}

export function median(values) {
  const valid = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!valid.length) return null;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
}

export function percent(part, total) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total === 0) return null;
  return (part / total) * 100;
}

export function safeDivide(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return a / b;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
