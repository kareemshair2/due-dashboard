import { icon } from "../utils/icons.js";
import { formatDelta } from "../utils/formatters.js";

export function deltaBadge(delta) {
  if (!delta) return "";
  const tone = delta.tone || "neutral";
  const value = delta.value;
  const iconName = !Number.isFinite(value) || value === 0 ? "Minus" : value > 0 ? "ArrowUpRight" : "ArrowDownRight";
  const label = Number.isFinite(value) ? formatDelta(value) : delta.label || "—";
  return `<span class="delta is-${tone}">${icon(iconName, 12)}${label}</span>`;
}

export function kpiCard({
  label,
  value,
  unit = "",
  note = "",
  iconName = "Circle",
  accent = false,
  tooltip = "",
  delta = null,
}) {
  return `
    <article class="kpi-card${accent ? " is-accent" : ""}">
      <div class="kpi-top">
        <span class="kpi-label">
          ${label}
          ${tooltip ? `<span class="info-dot" tabindex="0" data-tooltip="${tooltip}">${icon("CircleHelp", 13)}</span>` : ""}
        </span>
        <span class="kpi-icon">${icon(iconName, 16)}</span>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-value">${value}</span>
        ${unit ? `<span class="kpi-unit">${unit}</span>` : ""}
      </div>
      <div class="kpi-bottom">
        <span class="kpi-note">${note || "&nbsp;"}</span>
        ${deltaBadge(delta)}
      </div>
    </article>
  `;
}

export function kpiGrid(cards) {
  return `<div class="kpi-grid">${cards.join("")}</div>`;
}
