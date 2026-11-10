import Chart from "chart.js/auto";
import { icon } from "../utils/icons.js";

const registry = new Map();

export const CHART_COLORS = [
  "#ff4015",
  "#202020",
  "#8a9099",
  "#16a34a",
  "#d97706",
  "#2563eb",
  "#7c3aed",
  "#db2777",
];

function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name);
  return value ? value.trim() : fallback;
}

export function applyChartDefaults() {
  const family = '"IBM Plex Sans Arabic", "Segoe UI", sans-serif';
  Chart.defaults.font.family = family;
  Chart.defaults.font.size = 11;
  Chart.defaults.color = cssVar("--muted", "#6b7280");
  Chart.defaults.borderColor = cssVar("--border", "#e8e8e8");
  Chart.defaults.maintainAspectRatio = false;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.plugins.legend.labels.boxHeight = 8;
  Chart.defaults.plugins.legend.labels.padding = 12;
  Chart.defaults.plugins.legend.rtl = true;
  Chart.defaults.plugins.legend.textDirection = "rtl";
  Chart.defaults.plugins.tooltip.rtl = true;
  Chart.defaults.plugins.tooltip.textDirection = "rtl";
  Chart.defaults.plugins.tooltip.titleFont = { family, weight: 600 };
  Chart.defaults.plugins.tooltip.bodyFont = { family };
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
}

export function destroyCharts() {
  registry.forEach((chart) => {
    try {
      chart.destroy();
    } catch {
      /* noop */
    }
  });
  registry.clear();
}

export function renderChart(id, config) {
  /** @type {HTMLCanvasElement | null} */
  const canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById(id));
  if (!canvas) return null;
  if (registry.has(id)) {
    registry.get(id).destroy();
    registry.delete(id);
  }
  applyChartDefaults();
  const chart = new Chart(canvas, config);
  registry.set(id, chart);
  return chart;
}

export function chartCard({
  id,
  title,
  subtitle = "",
  span = false,
  height = 250,
  actions = "",
  empty = false,
  emptyTitle = "لا توجد بيانات",
  emptyText = "لا توجد سجلات مطابقة للفلاتر الحالية.",
}) {
  return `
    <section class="card chart-card${span ? " span-2" : ""}">
      <div class="card-head">
        <div class="card-head-copy">
          <span class="card-title">${title}</span>
          ${subtitle ? `<span class="card-subtitle">${subtitle}</span>` : ""}
        </div>
        ${actions ? `<div class="card-actions">${actions}</div>` : ""}
      </div>
      <div class="chart-body">
        <div class="chart-canvas-wrap" style="height:${height}px">
          ${
            empty
              ? `<div class="chart-empty">${icon("BarChart3", 26)}<strong>${emptyTitle}</strong><span>${emptyText}</span></div>`
              : `<canvas id="${id}" role="img" aria-label="${title}"></canvas>`
          }
        </div>
      </div>
    </section>
  `;
}
