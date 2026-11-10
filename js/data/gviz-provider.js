import { TAB_DEFINITIONS } from "./schema.js";

const GVIZ_BASE = "https://docs.google.com/spreadsheets/d";

function withTimeout(ms = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, clear: () => clearTimeout(timer) };
}

export async function fetchGvizTab(spreadsheetId, tabKey, signal) {
  const def = TAB_DEFINITIONS[tabKey];
  if (!def) throw new Error(`Unknown tab: ${tabKey}`);
  const url = `${GVIZ_BASE}/${encodeURIComponent(spreadsheetId)}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(def.name)}`;
  const timeout = withTimeout();
  const combined = signal ? AbortSignal.any?.([signal, timeout.controller.signal]) || timeout.controller.signal : timeout.controller.signal;
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: combined,
      headers: { Accept: "application/json,text/plain,*/*" },
    });
    if (!response.ok) {
      throw new Error(`تعذر قراءة تاب ${def.label} (HTTP ${response.status})`);
    }
    const text = await response.text();
    const match = text.match(/setResponse\(([\s\S]*)\);?\s*$/);
    if (!match) {
      throw new Error(`استجابة غير متوقعة من تاب ${def.label}. تأكد من أن الشيت متاح للقراءة.`);
    }
    const payload = JSON.parse(match[1]);
    if (payload.status !== "ok") {
      const message = payload.errors?.[0]?.detailed_message || payload.errors?.[0]?.message || "خطأ غير معروف";
      throw new Error(`تعذر قراءة تاب ${def.label}: ${message}`);
    }
    const table = payload.table || {};
    const headers = (table.cols || []).map((col) => col.label || "");
    const rows = (table.rows || []).map((row) =>
      (row.c || []).map((cell) => (cell ? cell.v : null)),
    );
    return {
      key: tabKey,
      name: def.name,
      label: def.label,
      headers,
      rows,
      fetchedAt: Date.now(),
    };
  } finally {
    timeout.clear();
  }
}

export async function fetchGvizAll(config, { force = false } = {}) {
  const keys = Object.keys(TAB_DEFINITIONS);
  const results = await Promise.allSettled(
    keys.map((key) => fetchGvizTab(config.spreadsheetId, key)),
  );
  const tabs = {};
  const errors = [];
  results.forEach((result, index) => {
    const key = keys[index];
    if (result.status === "fulfilled") tabs[key] = result.value;
    else errors.push({ tab: key, message: result.reason?.message || String(result.reason) });
  });
  return {
    provider: "gviz",
    tabs,
    errors,
    fetchedAt: Date.now(),
    meta: {
      title: "DUE Spreadsheet",
      locale: config.locale,
      timeZone: "Africa/Cairo",
      source: "Google Sheets gviz",
    },
    force,
  };
}
