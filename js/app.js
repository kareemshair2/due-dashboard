import {
  fetchData,
  getState,
  hasData,
  init,
  loadCachedData,
  refreshNow,
  setRoute,
  subscribe,
  toggleSidebarCollapsed,
  toggleTheme,
} from "./store.js";
import { startRouter } from "./router.js";
import {
  PAGE_META,
  refreshStatusUI,
  renderBanner,
  renderFooter,
  renderHeader,
  renderSidebar,
} from "./components/layout.js";
import { destroyCharts } from "./components/chart.js";
import { errorState, skeletonPage } from "./components/states.js";
import { showToast } from "./components/toast.js";
import { formatDateRange, formatDateTime } from "./utils/formatters.js";
import * as overview from "./pages/overview.js";
import * as orders from "./pages/orders.js";
import * as branches from "./pages/branches.js";
import * as cars from "./pages/cars.js";
import * as dataQuality from "./pages/data-quality.js";
import * as settings from "./pages/settings.js";

const PAGES = {
  overview,
  orders,
  branches,
  cars,
  "data-quality": dataQuality,
  settings,
};

let appRoot = null;

function closeDrawer() {
  document.body.classList.remove("drawer-open");
}

function printReportHead(state) {
  const meta = PAGE_META[state.route] || PAGE_META.overview;
  const filters = state.filters[state.route];
  return `
    <div class="print-report-head">
      <h1>DUE — Delivery Ultimate Express</h1>
      <p>تقرير العمليات · ${meta.title}</p>
      <div class="print-meta">
        <span>المصدر: ${state.providerName}</span>
        <span>آخر تحديث: ${formatDateTime(state.fetchedAt)}</span>
        ${
          filters && (filters.from || filters.to)
            ? `<span>الفترة: ${formatDateRange(filters.from, filters.to)}</span>`
            : ""
        }
      </div>
    </div>
  `;
}

function shellHtml(state) {
  return `
    <div class="app-shell">
      ${renderSidebar(state)}
      <div class="drawer-overlay" data-action="close-drawer"></div>
      <div class="app-main">
        ${renderHeader(state)}
        <main class="app-content">
          ${printReportHead(state)}
          <div id="banner-root">${renderBanner(state)}</div>
          <div id="page-root"></div>
        </main>
        ${renderFooter(state)}
      </div>
    </div>
  `;
}

function renderPage() {
  const state = getState();
  const root = document.getElementById("page-root");
  if (!root) return;
  const def = PAGES[state.route] || overview;
  const meta = PAGE_META[state.route] || PAGE_META.overview;

  destroyCharts();

  const banner = document.getElementById("banner-root");
  if (banner) banner.innerHTML = renderBanner(state);

  if ((state.status === "loading" || state.status === "idle") && !hasData()) {
    root.innerHTML = skeletonPage(meta.title);
    return;
  }

  if (state.status === "error" && !hasData()) {
    root.innerHTML = errorState({
      title: "تعذر تحميل البيانات",
      message: state.lastError || "راجع إعدادات مصدر البيانات ثم حاول مرة أخرى.",
    });
    return;
  }

  root.innerHTML = def.render(state);
  def.mount(root, state);
}

function renderAll() {
  const state = getState();
  destroyCharts();
  appRoot.innerHTML = shellHtml(state);
  document.title = `${PAGE_META[state.route]?.title || "لوحة العمليات"} | DUE`;
  renderPage();
}

function updateChrome() {
  const state = getState();
  refreshStatusUI(state);
  const banner = document.getElementById("banner-root");
  if (banner) banner.innerHTML = renderBanner(state);
}

function bindGlobalEvents() {
  document.addEventListener("click", (event) => {
    const target =
      event.target instanceof Element
        ? /** @type {HTMLElement | null} */ (event.target.closest("[data-action]"))
        : null;
    if (target) {
      const action = target.dataset.action;
      if (action === "toggle-theme") {
        toggleTheme();
        return;
      }
      if (action === "refresh") {
        showToast("info", "جارٍ تحديث البيانات", "يتم قراءة السجلات من المصدر.");
        refreshNow();
        return;
      }
      if (action === "print") {
        window.print();
        return;
      }
      if (action === "open-drawer") {
        document.body.classList.add("drawer-open");
        return;
      }
      if (action === "close-drawer") {
        closeDrawer();
        return;
      }
      if (action === "collapse-sidebar") {
        toggleSidebarCollapsed();
        const label = document.querySelector(".sidebar-collapse span");
        if (label) label.textContent = getState().sidebarCollapsed ? "توسيع القائمة" : "تصغير القائمة";
        return;
      }
    }

    const link =
      event.target instanceof Element ? event.target.closest('a[href^="#/"]') : null;
    if (link) closeDrawer();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });
}

function hideBoot() {
  const boot = document.getElementById("boot");
  if (!boot) return;
  boot.classList.add("is-hiding");
  setTimeout(() => boot.remove(), 320);
}

async function main() {
  appRoot = document.getElementById("app");
  appRoot.hidden = false;

  init();

  subscribe((state, reason) => {
    if (reason === "data" || reason === "route" || reason === "theme") {
      renderAll();
      return;
    }
    updateChrome();
    if (reason === "status" && !hasData()) {
      renderPage();
    }
  });

  bindGlobalEvents();

  const initialRoute = startRouter((route) => {
    setRoute(route);
    closeDrawer();
  });

  if (initialRoute !== getState().route) {
    setRoute(initialRoute);
  } else {
    renderAll();
  }

  hideBoot();

  await loadCachedData();
  await fetchData({ force: true });
}

main().catch((error) => {
  const boot = document.getElementById("boot");
  if (boot) boot.remove();
  appRoot = document.getElementById("app");
  if (appRoot) {
    appRoot.hidden = false;
    appRoot.innerHTML = errorState({
      title: "تعذر بدء التشغيل",
      message: error?.message || String(error),
    });
  }
});
