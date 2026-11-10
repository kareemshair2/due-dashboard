import { icon } from "../utils/icons.js";
import { getPresetRange } from "../utils/date-utils.js";
import {
  buildChips,
  countActiveFilters,
  removeChip,
} from "../analytics/filters.js";

const PRESETS = [
  { value: "all", label: "كل الفترات" },
  { value: "today", label: "اليوم" },
  { value: "yesterday", label: "أمس" },
  { value: "last7", label: "آخر 7 أيام" },
  { value: "last30", label: "آخر 30 يوم" },
  { value: "thisMonth", label: "هذا الشهر" },
  { value: "custom", label: "مخصص" },
];

const FIELD_LABELS = {
  statuses: "الحالة",
  customers: "العميل",
  branches: "الفرع",
  vehicles: "العربة",
  drivers: "السائق",
  shifts: "الوردية",
  severities: "الخطورة",
  tabs: "التاب",
};

const MULTI_KEYS = ["statuses", "customers", "branches", "vehicles", "drivers", "shifts", "severities", "tabs"];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fieldItems(options, key) {
  const field = options?.[key];
  if (!field) return [];
  return Array.isArray(field) ? field : field.items || [];
}

function multiSummary(filters, options, key) {
  const selected = filters[key] || [];
  const label = FIELD_LABELS[key] || key;
  return `${label}: ${selected.length ? `${selected.length} محدد` : "الكل"}`;
}

function renderMulti(filters, options, key) {
  const items = fieldItems(options, key);
  if (!items.length) return "";
  const selected = filters[key] || [];
  return `
    <details class="ms filter-field" data-ms="${key}">
      <summary class="ms-trigger${selected.length ? " has-value" : ""}">
        <span class="ms-value">${multiSummary(filters, options, key)}</span>
        ${icon("ChevronDown", 13)}
      </summary>
      <div class="ms-panel">
        <div class="ms-options">
          ${items
            .map(
              (item) => `
                <label class="ms-option">
                  <input type="checkbox" data-multi-key="${key}" value="${escapeHtml(item.value)}"${selected.includes(item.value) ? " checked" : ""} />
                  <span>${escapeHtml(item.label)}</span>
                </label>
              `,
            )
            .join("")}
        </div>
        <div class="ms-footer">
          <span class="ms-count">${items.length} خيار</span>
          <button type="button" data-action="clear-multi" data-multi-key="${key}">مسح</button>
        </div>
      </div>
    </details>
  `;
}

function renderChips(filters, options) {
  const chips = buildChips(filters, options);
  if (!chips.length) return "";
  return chips
    .map(
      (chip) => `
        <span class="chip">
          ${escapeHtml(chip.label)}
          <button type="button" class="chip-x" data-chip-key="${chip.key}" data-chip-value="${escapeHtml(chip.value)}" aria-label="إزالة الفلتر">
            ${icon("X", 11)}
          </button>
        </span>
      `,
    )
    .join("");
}

/** @param {{ filters: any, options?: any, page?: string }} args */
export function renderFilterBar({ filters, options = {}, page }) {
  const activeCount = countActiveFilters(filters);
  return `
    <div class="filter-bar" data-page="${page}">
      <div class="filter-bar-head">
        <div class="filter-bar-title">
          ${icon("SlidersHorizontal", 15)}
          الفلاتر
          <span class="filter-count"${activeCount ? "" : " hidden"}>${activeCount}</span>
        </div>
        <div class="filter-bar-actions">
          <button type="button" class="filter-clear" data-action="clear-filters">${icon("RotateCcw", 13)} مسح الكل</button>
          <button type="button" class="btn btn-secondary btn-sm filter-toggle" data-action="toggle-filters">${icon("Filter", 14)} فلاتر</button>
        </div>
      </div>
      <div class="filter-controls">
        ${
          options.date
            ? `
              <div class="filter-field is-wide">
                <span class="field-label">الفترة</span>
                <select class="select" data-filter="preset">
                  ${PRESETS.map(
                    (preset) =>
                      `<option value="${preset.value}"${filters.preset === preset.value ? " selected" : ""}>${preset.label}</option>`,
                  ).join("")}
                </select>
              </div>
              <div class="filter-field">
                <span class="field-label">من</span>
                <input type="date" class="input" data-filter="date" data-bound="from" value="${filters.from || ""}" />
              </div>
              <div class="filter-field">
                <span class="field-label">إلى</span>
                <input type="date" class="input" data-filter="date" data-bound="to" value="${filters.to || ""}" />
              </div>
            `
            : ""
        }
        ${
          options.search
            ? `
              <div class="filter-field is-search">
                <span class="field-label">بحث</span>
                <div class="input-wrap">
                  ${icon("Search", 15)}
                  <input type="search" class="input" data-filter="search" value="${escapeHtml(filters.search || "")}" placeholder="${escapeHtml(options.search.placeholder || "بحث")}" />
                </div>
              </div>
            `
            : ""
        }
        ${MULTI_KEYS.map((key) => renderMulti(filters, options, key)).join("")}
      </div>
      <div class="active-filters" id="active-filters"${activeCount ? "" : " hidden"}>${renderChips(filters, options)}</div>
    </div>
  `;
}

function updateMultiSummary(root, filters, options, key) {
  const details = root.querySelector(`[data-ms="${key}"]`);
  if (!details) return;
  const summary = details.querySelector(".ms-value");
  const selected = filters[key] || [];
  if (summary) summary.textContent = multiSummary(filters, options, key);
  details.querySelector(".ms-trigger")?.classList.toggle("has-value", selected.length > 0);
}

export function updateChips(root, filters, options) {
  const host = root.querySelector("#active-filters");
  if (!host) return;
  const chips = buildChips(filters, options);
  host.innerHTML = renderChips(filters, options);
  host.hidden = chips.length === 0;
  const count = root.querySelector(".filter-count");
  const activeCount = countActiveFilters(filters);
  if (count) {
    count.textContent = String(activeCount);
    count.hidden = activeCount === 0;
  }
}

export function syncFilterControls(root, filters, options) {
  const preset = root.querySelector('[data-filter="preset"]');
  if (preset) preset.value = filters.preset;
  root.querySelectorAll('[data-filter="date"]').forEach((input) => {
    input.value = filters[input.dataset.bound] || "";
  });
  const search = root.querySelector('[data-filter="search"]');
  if (search) search.value = filters.search || "";
  for (const key of MULTI_KEYS) {
    root.querySelectorAll(`[data-multi-key="${key}"]`).forEach((input) => {
      input.checked = (filters[key] || []).includes(input.value);
    });
    updateMultiSummary(root, filters, options, key);
  }
  updateChips(root, filters, options);
}

export function bindFilters(root, { filters, options = {}, onChange, onReset }) {
  let searchTimer = null;

  root.querySelector('[data-action="toggle-filters"]')?.addEventListener("click", () => {
    root.querySelector(".filter-bar")?.classList.toggle("is-open");
  });

  root.querySelector('[data-filter="preset"]')?.addEventListener("change", (event) => {
    const preset = event.target.value;
    filters.preset = preset;
    if (preset !== "custom") {
      const range = getPresetRange(preset);
      filters.from = range.from || "";
      filters.to = range.to || "";
      const fromInput = root.querySelector('[data-bound="from"]');
      const toInput = root.querySelector('[data-bound="to"]');
      if (fromInput) fromInput.value = filters.from;
      if (toInput) toInput.value = filters.to;
    }
    updateChips(root, filters, options);
    onChange();
  });

  root.querySelectorAll('[data-filter="date"]').forEach((input) => {
    input.addEventListener("change", () => {
      filters[input.dataset.bound] = input.value;
      filters.preset = "custom";
      const preset = root.querySelector('[data-filter="preset"]');
      if (preset) preset.value = "custom";
      updateChips(root, filters, options);
      onChange();
    });
  });

  const search = root.querySelector('[data-filter="search"]');
  if (search) {
    search.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        filters.search = search.value.trim();
        updateChips(root, filters, options);
        onChange();
      }, 280);
    });
  }

  root.querySelectorAll("[data-multi-key]").forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.dataset.multiKey;
      const set = new Set(filters[key] || []);
      if (input.checked) set.add(input.value);
      else set.delete(input.value);
      filters[key] = [...set];
      updateMultiSummary(root, filters, options, key);
      updateChips(root, filters, options);
      onChange();
    });
  });

  root.querySelectorAll('[data-action="clear-multi"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const key = button.dataset.multiKey;
      filters[key] = [];
      root.querySelectorAll(`[data-multi-key="${key}"]`).forEach((input) => {
        input.checked = false;
      });
      updateMultiSummary(root, filters, options, key);
      updateChips(root, filters, options);
      onChange();
    });
  });

  root.querySelector('[data-action="clear-filters"]')?.addEventListener("click", () => {
    onReset();
  });

  root.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-chip-key]");
    if (!chip) return;
    removeChip(filters, chip.dataset.chipKey, chip.dataset.chipValue);
    syncFilterControls(root, filters, options);
    onChange();
  });
}
