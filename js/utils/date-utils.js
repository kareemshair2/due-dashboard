import { normalizeDigits } from "./number-utils.js";

const AR_MONTHS = {
  يناير: 1,
  فبراير: 2,
  مارس: 3,
  أبريل: 4,
  ابريل: 4,
  مايو: 5,
  يونيو: 6,
  يوليو: 7,
  أغسطس: 8,
  اغسطس: 8,
  سبتمبر: 9,
  أكتوبر: 10,
  اكتوبر: 10,
  نوفمبر: 11,
  ديسمبر: 12,
};

const EN_MONTHS = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function pad(value) {
  return String(value).padStart(2, "0");
}

export function toISO(year, month, day) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function serialToISO(serial) {
  if (!Number.isFinite(serial)) return null;
  const ms = Date.UTC(1899, 11, 30) + Math.round(serial * 86400000);
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function parseTextDate(text, order = "DMY") {
  const cleaned = normalizeDigits(text)
    .trim()
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[.\-]/g, "/")
    .replace(/\s+/g, " ");

  const iso = cleaned.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (iso) return { iso: toISO(+iso[1], +iso[2], +iso[3]), ambiguous: false };

  const ymd = cleaned.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (ymd) return { iso: toISO(+ymd[1], +ymd[2], +ymd[3]), ambiguous: false };

  const numeric = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (numeric) {
    let a = +numeric[1];
    let b = +numeric[2];
    let year = +numeric[3];
    if (year < 100) year += year < 70 ? 2000 : 1900;
    let ambiguous = false;
    let day;
    let month;
    if (a > 12 && b <= 12) {
      day = a;
      month = b;
    } else if (b > 12 && a <= 12) {
      month = a;
      day = b;
    } else {
      ambiguous = true;
      if (order === "MDY") {
        month = a;
        day = b;
      } else {
        day = a;
        month = b;
      }
    }
    return { iso: toISO(year, month, day), ambiguous };
  }

  const named = cleaned.match(/^(\d{1,2})[\s/-]+([A-Za-z\u0600-\u06FF]+)[\s/-]+(\d{2,4})$/);
  if (named) {
    const day = +named[1];
    const monthName = named[2].toLowerCase();
    const yearRaw = +named[3];
    const year = yearRaw < 100 ? yearRaw + (yearRaw < 70 ? 2000 : 1900) : yearRaw;
    const month = AR_MONTHS[named[2]] || AR_MONTHS[monthName] || EN_MONTHS[monthName];
    if (month) return { iso: toISO(year, month, day), ambiguous: false };
  }

  return { iso: null, ambiguous: false };
}

export function parseDate(value, order = "DMY") {
  if (value === null || value === undefined || value === "") {
    return { iso: null, ambiguous: false, source: "empty" };
  }

  if (typeof value === "number") {
    return { iso: serialToISO(value), ambiguous: false, source: "serial" };
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return { iso: null, ambiguous: false, source: "invalid" };
    return {
      iso: toISO(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate()),
      ambiguous: false,
      source: "date",
    };
  }

  const text = String(value).trim();
  if (!text) return { iso: null, ambiguous: false, source: "empty" };

  const gviz = text.match(/^Date\((\d+),(\d+),(\d+)/);
  if (gviz) {
    return {
      iso: toISO(+gviz[1], +gviz[2] + 1, +gviz[3]),
      ambiguous: false,
      source: "gviz",
    };
  }

  const parsed = parseTextDate(text, order);
  return { ...parsed, source: parsed.iso ? "text" : "invalid" };
}

export function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDaysISO(iso, days) {
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function diffDaysISO(from, to) {
  const a = new Date(`${from}T12:00:00Z`);
  const b = new Date(`${to}T12:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function getPresetRange(preset, today = todayISO()) {
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const day = addDaysISO(today, -1);
      return { from: day, to: day };
    }
    case "last7":
      return { from: addDaysISO(today, -6), to: today };
    case "last30":
      return { from: addDaysISO(today, -29), to: today };
    case "thisMonth":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    default:
      return { from: "", to: "" };
  }
}

export function previousRange(from, to) {
  if (!from || !to) return { from: "", to: "" };
  const length = Math.max(1, diffDaysISO(from, to) + 1);
  return { from: addDaysISO(from, -length), to: addDaysISO(from, -1) };
}

export function isValidISO(iso) {
  return typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso);
}

export function minISO(values) {
  const valid = values.filter(isValidISO).sort();
  return valid[0] || null;
}

export function maxISO(values) {
  const valid = values.filter(isValidISO).sort();
  return valid[valid.length - 1] || null;
}
