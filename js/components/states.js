import { icon } from "../utils/icons.js";
import { formatRelativeTime } from "../utils/formatters.js";

export function skeletonPage(title = "جارٍ تحميل البيانات") {
  return `
    <div class="page-head">
      <div class="page-head-copy">
        <h2>${title}</h2>
        <p>يتم تحميل السجلات من Google Sheets.</p>
      </div>
    </div>
    <div class="kpi-grid">
      ${Array.from({ length: 4 }, () => '<div class="skeleton skeleton-kpi"></div>').join("")}
    </div>
    <div class="chart-grid" style="margin-top:16px">
      <div class="skeleton" style="height:320px;border-radius:18px"></div>
      <div class="skeleton" style="height:320px;border-radius:18px"></div>
    </div>
  `;
}

export function emptyState({ iconName = "Inbox", title, text = "", action = "" }) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon(iconName, 23)}</div>
      <h4>${title}</h4>
      ${text ? `<p>${text}</p>` : ""}
      ${action}
    </div>
  `;
}

export function errorState({ title = "تعذر تحميل البيانات", message = "" }) {
  return `
    <div class="load-error">
      <div class="empty-icon">${icon("WifiOff", 23)}</div>
      <h2>${title}</h2>
      <p>${message || "راجع اتصال الشبكة أو إعدادات مصدر البيانات ثم حاول مرة أخرى."}</p>
      <button class="btn btn-primary" data-action="refresh">${icon("RefreshCw", 16)} إعادة المحاولة</button>
    </div>
  `;
}

export function connectionBanner(state) {
  const banners = [];

  if (state.status === "stale") {
    banners.push(`
      <div class="connection-banner">
        ${icon("AlertTriangle", 17)}
        <div>
          <strong>يتم عرض نسخة محفوظة من البيانات</strong>
          <p>تعذر التحديث من المصدر. آخر نسخة محفوظة ${formatRelativeTime(state.fetchedAt)}.${state.lastError ? ` (${state.lastError})` : ""}</p>
        </div>
        <button class="btn btn-secondary btn-sm banner-action" data-action="refresh">${icon("RefreshCw", 14)} تحديث</button>
      </div>
    `);
  }

  if (state.errors?.length) {
    banners.push(`
      <div class="connection-banner">
        ${icon("AlertTriangle", 17)}
        <div>
          <strong>بعض التابات لم تُحمّل بالكامل</strong>
          <p>${state.errors.map((error) => error.message).join(" · ")}</p>
        </div>
      </div>
    `);
  }

  return banners.join("");
}

export function coverageStrip(items) {
  if (!items.length) return "";
  return `
    <div class="coverage-strip">
      ${items
        .map(
          (item) => `
            <span class="coverage-item${item.muted ? " is-muted" : ""}">
              <span class="coverage-dot"></span>
              ${item.label}
              <strong>${item.value}</strong>
            </span>
          `,
        )
        .join("")}
    </div>
  `;
}

export function dataNote({ text, warning = false, iconName = "Info" }) {
  return `<div class="data-note${warning ? " is-warning" : ""}">${icon(iconName, 14)}<span>${text}</span></div>`;
}
