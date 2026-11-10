import { config as baseConfig } from "./config.js";
import { fetchAll, getProviderName, validateConfig } from "./data/provider.js";
import { parseAll } from "./data/data-parser.js";
import { validateAll } from "./data/data-validator.js";
import { clearCache, loadCache, saveCache } from "./utils/cache.js";
import { createFilters } from "./analytics/filters.js";
import { showToast } from "./components/toast.js";

const SETTINGS_KEY = "due.settings.v1";
const THEME_KEY = "due.theme";
const SIDEBAR_KEY = "due.sidebar.collapsed";
const CACHE_PREFIX = "due.cache.v2";

const listeners = new Set();
let refreshTimer = null;

const state = {
  config: { ...baseConfig },
  providerName: getProviderName(baseConfig),
  status: "idle",
  errors: [],
  lastError: null,
  data: { orders: [], branches: [], cars: [] },
  meta: {},
  validation: {
    issues: [],
    summary: {
      total: 0,
      bySeverity: { critical: 0, warning: 0, info: 0 },
      byTab: { orders: 0, branches: 0, cars: 0 },
      byCode: {},
      affectedRows: 0,
    },
  },
  fetchedAt: null,
  source: null,
  refreshing: false,
  theme: "light",
  sidebarCollapsed: false,
  settings: {
    autoRefreshMinutes: baseConfig.autoRefreshMinutes || 0,
    dateOrder: baseConfig.dateOrder || "DMY",
  },
  filters: {
    overview: createFilters(),
    orders: createFilters(),
    branches: createFilters(),
    cars: createFilters(),
    "data-quality": createFilters(),
    settings: createFilters(),
  },
  route: "overview",
};

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(reason = "update") {
  for (const listener of listeners) listener(state, reason);
}

function cacheKey() {
  const names = Object.values(state.config.sheetNames || {}).join("|");
  return `${CACHE_PREFIX}:${state.config.provider}:${state.config.spreadsheetId}:${names}`;
}

function readSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Number.isFinite(parsed.autoRefreshMinutes)) {
      state.settings.autoRefreshMinutes = Math.max(0, parsed.autoRefreshMinutes);
    }
    if (parsed.dateOrder === "MDY" || parsed.dateOrder === "DMY") {
      state.settings.dateOrder = parsed.dateOrder;
    }
  } catch {
    /* ignore malformed settings */
  }
}

function persistSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch {
    /* storage is best effort */
  }
}

function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#161010" : "#A40E0E");
}

export function init() {
  readSettings();
  state.config.dateOrder = state.settings.dateOrder;
  state.providerName = getProviderName(state.config);

  const storedTheme = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  applyTheme(storedTheme || (prefersDark ? "dark" : "light"));

  state.sidebarCollapsed = localStorage.getItem(SIDEBAR_KEY) === "1";
  document.body.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);

  const problems = validateConfig(state.config);
  if (problems.length) {
    state.status = "error";
    state.lastError = problems.join(" ");
  }

  setupAutoRefresh();
  return state;
}

export function hasData() {
  return state.fetchedAt !== null;
}

function applyRaw(raw, { source }) {
  const parsed = parseAll(raw.tabs || {}, state.config);
  state.data = parsed.data;
  const dates = {
    orders: parsed.data.orders.map((row) => row.date),
    branches: parsed.data.branches.map((row) => row.date),
    cars: parsed.data.cars.map((row) => row.date),
  };
  state.meta = {
    ...parsed.meta,
    orders: { ...(parsed.meta.orders || {}), dates: dates.orders },
    branches: { ...(parsed.meta.branches || {}), dates: dates.branches },
    cars: { ...(parsed.meta.cars || {}), dates: dates.cars },
  };
  state.validation = validateAll(parsed.data);
  state.source = source;
  state.fetchedAt = raw.fetchedAt || Date.now();
  return parsed.errors;
}

export async function loadCachedData() {
  const cached = await loadCache(cacheKey());
  if (!cached?.value?.tabs) return false;
  try {
    const parseErrors = applyRaw(
      { tabs: cached.value.tabs, fetchedAt: cached.savedAt },
      { source: "cache" },
    );
    state.errors = [...(cached.value.errors || []), ...parseErrors];
    state.status = "ready";
    notify("data");
    return true;
  } catch (error) {
    state.lastError = error.message;
    return false;
  }
}

export async function fetchData({ force = false, quiet = false } = {}) {
  if (state.refreshing) return;
  if (validateConfig(state.config).length) {
    state.status = "error";
    state.lastError = validateConfig(state.config).join(" ");
    notify("data");
    return;
  }

  state.refreshing = true;
  if (!quiet) state.status = "loading";
  notify("status");

  try {
    const raw = await fetchAll(state.config, { force });
    const parseErrors = applyRaw(raw, { source: "live" });
    state.errors = [...(raw.errors || []), ...parseErrors];
    state.status = "ready";
    state.lastError = null;
    await saveCache(cacheKey(), {
      tabs: raw.tabs,
      errors: raw.errors || [],
      fetchedAt: state.fetchedAt,
      provider: raw.provider,
      meta: raw.meta,
    });
  } catch (error) {
    state.lastError = error.message || String(error);
    state.status = state.fetchedAt ? "stale" : "error";
  } finally {
    state.refreshing = false;
    notify("data");
  }
}

export function refreshNow() {
  return fetchData({ force: true });
}

export function setRoute(route) {
  if (state.route === route) return;
  state.route = route;
  notify("route");
}

export function toggleTheme() {
  applyTheme(state.theme === "dark" ? "light" : "dark");
  try {
    localStorage.setItem(THEME_KEY, state.theme);
  } catch {
    /* noop */
  }
  notify("theme");
}

export function setTheme(theme) {
  applyTheme(theme === "dark" ? "dark" : "light");
  try {
    localStorage.setItem(THEME_KEY, state.theme);
  } catch {
    /* noop */
  }
  notify("theme");
}

export function toggleSidebarCollapsed() {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  document.body.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
  try {
    localStorage.setItem(SIDEBAR_KEY, state.sidebarCollapsed ? "1" : "0");
  } catch {
    /* noop */
  }
}

function setupAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  if (state.settings.autoRefreshMinutes > 0) {
    refreshTimer = setInterval(() => {
      fetchData({ force: true, quiet: true });
    }, state.settings.autoRefreshMinutes * 60000);
  }
}

export function setAutoRefresh(minutes) {
  state.settings.autoRefreshMinutes = Math.max(0, Number(minutes) || 0);
  persistSettings();
  setupAutoRefresh();
  notify("settings");
}

export async function setDateOrder(order) {
  const next = order === "MDY" ? "MDY" : "DMY";
  if (state.settings.dateOrder === next) return;
  state.settings.dateOrder = next;
  state.config.dateOrder = next;
  persistSettings();

  const cached = await loadCache(cacheKey());
  if (cached?.value?.tabs) {
    try {
      const parseErrors = applyRaw(
        { tabs: cached.value.tabs, fetchedAt: cached.savedAt },
        { source: "cache" },
      );
      state.errors = [...(cached.value.errors || []), ...parseErrors];
      notify("data");
    } catch {
      /* keep previous data until refresh completes */
    }
  }
  await fetchData({ force: true, quiet: true });
  showToast("info", "تم تحديث تفسير التاريخ", `ترتيب التاريخ الحالي: ${next}`);
}

export async function clearCachedData() {
  await clearCache();
  showToast("success", "تم مسح الكاش", "سيتم تحميل البيانات من المصدر.");
  await fetchData({ force: true });
}

export function getFilters(page) {
  return state.filters[page];
}
