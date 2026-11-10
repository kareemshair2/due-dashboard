import { destroyCharts } from "./chart.js";
import { bindFilters, renderFilterBar, updateChips } from "./filter-bar.js";
import { resetFilters } from "../analytics/filters.js";
import { icon } from "../utils/icons.js";

export function pageScaffold({ meta, actions = "", filters, options, page }) {
  return `
    <div class="page-head">
      <div class="page-head-copy">
        <h2>${meta.title}</h2>
        <p>${meta.description}</p>
      </div>
      ${actions ? `<div class="page-head-actions">${actions}</div>` : ""}
    </div>
    <div data-filter-host>${renderFilterBar({ filters, options, page })}</div>
    <div data-content-host></div>
  `;
}

export function exportActions({ prefix, note = "" }) {
  return `
    ${note ? `<span class="page-actions-note">${icon("Info", 14)} ${note}</span>` : ""}
    <button type="button" class="btn btn-secondary" data-action="export-csv">${icon("Download", 16)} CSV</button>
    <button type="button" class="btn btn-secondary" data-action="export-excel">${icon("FileSpreadsheet", 16)} Excel</button>
    <button type="button" class="btn btn-secondary" data-action="print">${icon("Printer", 16)} طباعة</button>
  `;
}

export function mountPage(root, { state, page, options, renderContent, mountContent }) {
  const filters = state.filters[page];
  const filterHost = root.querySelector("[data-filter-host]");
  const contentHost = root.querySelector("[data-content-host]");

  const refresh = () => {
    destroyCharts();
    contentHost.innerHTML = renderContent(filters);
    updateChips(filterHost, filters, options);
    mountContent?.(contentHost, filters, refresh);
  };

  const bind = () => {
    bindFilters(filterHost, {
      filters,
      options,
      onChange: refresh,
      onReset: () => {
        resetFilters(filters);
        filterHost.innerHTML = renderFilterBar({ filters, options, page });
        bind();
        refresh();
      },
    });
  };

  bind();
  refresh();
  return { refresh };
}
