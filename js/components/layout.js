import { icon } from "../utils/icons.js";
import { formatRelativeTime } from "../utils/formatters.js";
import { connectionBanner } from "./states.js";

export const PAGE_META = {
  overview: { title: "لوحة النظرة العامة", eyebrow: "Overview", icon: "LayoutDashboard" },
  orders: { title: "الطلبات", eyebrow: "Orders", icon: "ShoppingBag" },
  branches: { title: "الفروع والوكلاء", eyebrow: "Branches & Agents", icon: "GitBranch" },
  cars: { title: "العربات", eyebrow: "Cars", icon: "Car" },
  "data-quality": { title: "جودة البيانات", eyebrow: "Data Quality", icon: "ShieldCheck" },
  settings: { title: "الإعدادات", eyebrow: "Settings", icon: "Settings" },
};

export const NAV_ITEMS = [
  { route: "overview", label: "النظرة العامة", icon: "LayoutDashboard", section: "التحليلات" },
  { route: "orders", label: "الطلبات", icon: "ShoppingBag", section: "التحليلات" },
  { route: "branches", label: "الفروع والوكلاء", icon: "GitBranch", section: "التحليلات" },
  { route: "cars", label: "العربات", icon: "Car", section: "التحليلات" },
  { route: "data-quality", label: "جودة البيانات", icon: "ShieldCheck", section: "النظام", badge: true },
  { route: "settings", label: "الإعدادات", icon: "Settings", section: "النظام" },
];

function syncMeta(state) {
  if (state.status === "loading" || state.status === "idle") {
    return { className: "is-loading", label: "جارٍ التحديث", time: "الآن" };
  }
  if (state.status === "error") {
    return { className: "is-error", label: "تعذر الاتصال", time: "—" };
  }
  if (state.status === "stale") {
    return {
      className: "is-stale",
      label: "نسخة محفوظة",
      time: formatRelativeTime(state.fetchedAt),
    };
  }
  return {
    className: "",
    label: "متصل",
    time: formatRelativeTime(state.fetchedAt),
  };
}

export function renderSyncPill(state) {
  const meta = syncMeta(state);
  return `
    <span class="sync-pill ${meta.className}" id="sync-pill">
      <span class="dot"></span>
      <span class="sync-label">${meta.label}</span>
      <strong id="sync-time">${meta.time}</strong>
    </span>
  `;
}

export function renderSidebar(state) {
  const issueCount = state.validation?.summary?.total || 0;
  const sections = [...new Set(NAV_ITEMS.map((item) => item.section))];
  const meta = syncMeta(state);

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <img class="brand-mark" src="./logo.svg" alt="DUE" width="42" height="42" />
        <div class="brand-text">
          <strong>DUE</strong>
          <span>Delivery Ultimate Express</span>
        </div>
      </div>
      <nav class="sidebar-nav" aria-label="التنقل الرئيسي">
        ${sections
          .map(
            (section) => `
              <div class="nav-section-label">${section}</div>
              ${NAV_ITEMS.filter((item) => item.section === section)
                .map(
                  (item) => `
                    <a class="nav-item${state.route === item.route ? " is-active" : ""}" href="#/${item.route}" title="${item.label}">
                      ${icon(item.icon, 19)}
                      <span class="nav-item-label">${item.label}</span>
                      ${item.badge && issueCount ? `<span class="nav-badge">${issueCount}</span>` : ""}
                    </a>
                  `,
                )
                .join("")}
            `,
          )
          .join("")}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-status ${meta.className === "is-error" ? "is-error" : meta.className === "is-loading" ? "is-loading" : ""}">
          <span class="dot"></span>
          <span>${state.providerName}</span>
        </div>
        <button type="button" class="sidebar-collapse" data-action="collapse-sidebar">
          ${icon("ChevronsUpDown", 14)}
          <span>تصغير القائمة</span>
        </button>
      </div>
    </aside>
  `;
}

export function renderHeader(state) {
  const meta = PAGE_META[state.route] || PAGE_META.overview;
  return `
    <header class="app-header">
      <div class="header-start">
        <button type="button" class="icon-btn mobile-menu-btn" data-action="open-drawer" aria-label="فتح القائمة">
          ${icon("Menu", 18)}
        </button>
        <div class="page-heading">
          <span class="eyebrow">DUE · ${meta.eyebrow}</span>
          <h1>${meta.title}</h1>
        </div>
      </div>
      <div class="header-end">
        ${renderSyncPill(state)}
        <button type="button" class="icon-btn" data-action="refresh" aria-label="تحديث البيانات" title="تحديث البيانات">
          ${icon("RefreshCw", 17)}
        </button>
        <button type="button" class="icon-btn" data-action="toggle-theme" aria-label="تبديل المظهر" title="تبديل المظهر">
          ${icon(state.theme === "dark" ? "Sun" : "Moon", 17)}
        </button>
      </div>
    </header>
  `;
}

export function renderFooter(state) {
  return `
    <footer class="app-footer">
      <span class="footer-brand">DUE · Delivery Ultimate Express</span>
      <span>لوحة قراءة فقط · المصدر: ${state.providerName} · آخر تحديث ${formatRelativeTime(state.fetchedAt)}</span>
    </footer>
  `;
}

export function renderBanner(state) {
  return connectionBanner(state);
}

export function refreshStatusUI(state) {
  const pill = document.getElementById("sync-pill");
  if (pill) {
    const meta = syncMeta(state);
    pill.className = `sync-pill ${meta.className}`.trim();
    const label = pill.querySelector(".sync-label");
    if (label) label.textContent = meta.label;
    const time = pill.querySelector("#sync-time");
    if (time) time.textContent = meta.time;
  }
  const sidebarStatus = document.querySelector(".sidebar-status");
  if (sidebarStatus) {
    sidebarStatus.classList.toggle("is-error", state.status === "error");
    sidebarStatus.classList.toggle(
      "is-loading",
      state.status === "loading" || state.status === "idle",
    );
  }
}
