const numberFormatter = new Intl.NumberFormat("en-EG", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("en-EG", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const decimal2Formatter = new Intl.NumberFormat("en-EG", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatNumber(value, fallback = "—") {
  if (!Number.isFinite(value)) return fallback;
  return numberFormatter.format(value);
}

export function formatDecimal(value, fallback = "—") {
  if (!Number.isFinite(value)) return fallback;
  return decimalFormatter.format(value);
}

export function formatDecimal2(value, fallback = "—") {
  if (!Number.isFinite(value)) return fallback;
  return decimal2Formatter.format(value);
}

export function formatCurrency(value, currency = "EGP", fallback = "—") {
  if (!Number.isFinite(value)) return fallback;
  return `${numberFormatter.format(value)} ${currency === "EGP" ? "ج.م" : currency}`;
}

export function formatPercent(value, digits = 1, fallback = "—") {
  if (!Number.isFinite(value)) return fallback;
  return `${value.toFixed(digits)}%`;
}

export function formatDate(iso, fallback = "—") {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return fallback;
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return fallback;
  return dateFormatter.format(date);
}

export function formatDateTime(timestamp, fallback = "—") {
  if (!timestamp) return fallback;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return fallback;
  return dateTimeFormatter.format(date);
}

export function formatRelativeTime(timestamp) {
  if (!timestamp) return "لم يتم التحديث بعد";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 10) return "الآن";
  if (seconds < 60) return `منذ ${seconds} ثانية`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export function formatDateRange(from, to) {
  if (!from && !to) return "كل الفترات";
  if (from && to && from === to) return formatDate(from);
  if (from && to) return `${formatDate(from)} — ${formatDate(to)}`;
  if (from) return `من ${formatDate(from)}`;
  return `حتى ${formatDate(to)}`;
}

export function formatDelta(value, digits = 1) {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatCount(value) {
  return formatNumber(value);
}
