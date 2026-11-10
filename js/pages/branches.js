import { pageScaffold, mountPage } from "../components/page.js";
import { kpiCard, kpiGrid } from "../components/kpi.js";
import { chartCard, renderChart, CHART_COLORS } from "../components/chart.js";
import { tableCard, sortRows } from "../components/table.js";
import { icon } from "../utils/icons.js";
import {
  formatDateRange,
  formatDecimal,
  formatNumber,
  formatPercent,
} from "../utils/formatters.js";
import { downloadCSV } from "../utils/csv.js";
import { downloadExcel } from "../utils/excel.js";
import {
  distinctValues,
  filterBranches,
  filterExceptionalBranches,
} from "../analytics/filters.js";
import { summarizeBranches } from "../analytics/branches-analytics.js";
import { buildInsights } from "../analytics/insights.js";

export const meta = {
  title: "الفروع والوكلاء",
  description:
    "ترتيب الفروع حسب عدد PICK UP مع استبعاد السجلات الاستثنائية وعرضها منفصلة.",
};

/** @type {{ sort: { key: string, dir: string }, page: number, pageSize: number | "all" }} */
const ui = { sort: { key: "pickup", dir: "desc" }, page: 1, pageSize: 10 };

function optionsFor(state) {
  return {
    date: true,
    search: { placeholder: "ابحث باسم الفرع" },
    branches: distinctValues(
      state.data.branches.filter((row) => !row.isExceptional),
      (row) => row.branch,
    ).map((value) => ({ value, label: value })),
  };
}

function compute(state, filters) {
  const exceptional = filterExceptionalBranches(state.data.branches, filters);
  return summarizeBranches(filterBranches(state.data.branches, filters), exceptional);
}

function sortedItems(summary) {
  const columns = [
    { key: "branch", sortValue: (item) => item.branch },
    { key: "pickup", sortValue: (item) => item.pickup },
    { key: "share", sortValue: (item) => item.share ?? -1 },
  ];
  return sortRows(summary.list, ui.sort, columns);
}

function exportColumns() {
  return [
    { label: "الفرع", value: (item) => item.branch },
    { label: "عدد PICK UP", value: (item) => item.pickup },
    { label: "النسبة", value: (item) => (Number.isFinite(item.share) ? `${item.share.toFixed(1)}%` : "") },
    { label: "الحالة", value: (item) => (item.pickup > 0 ? "نشط" : "صفر") },
  ];
}

function insightList(insights) {
  if (!insights.length) return `<div class="table-empty">لا توجد مؤشرات كافية.</div>`;
  return `
    <div class="insight-list">
      ${insights
        .map(
          (item) => `
            <div class="insight-item is-${item.severity}">
              <span class="insight-icon">${icon(item.icon, 15)}</span>
              <div class="insight-copy">
                <div class="insight-title">${item.title}</div>
                <div class="insight-text">${item.text}</div>
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function rankList(summary) {
  if (!summary.list.length) return `<div class="table-empty">لا توجد سجلات فروع مطابقة.</div>`;
  const max = Math.max(1, ...summary.list.map((item) => item.pickup));
  return `
    <div class="rank-list">
      ${summary.list
        .slice(0, 10)
        .map(
          (item) => `
            <div class="rank-item${item.pickup <= 0 ? " is-zero" : ""}">
              <span class="rank-label">${icon("Building2", 13)}<span>${item.branch}</span></span>
              <span class="rank-value">${formatNumber(item.pickup)}</span>
              <span class="rank-bar"><span style="width:${Math.round((item.pickup / max) * 100)}%"></span></span>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function exceptionPanel(summary) {
  if (!summary.exceptionalRows.length) return "";
  const names = [...new Set(summary.exceptionalRows.map((row) => row.branch))].join("، ");
  return `
    <div class="exception-panel">
      <span class="icon-wrap">${icon("AlertCircle", 17)}</span>
      <div>
        <h4>سجل استثنائي: ${names}</h4>
        <p>
          إجمالي <strong>${formatNumber(summary.exceptionalTotal)}</strong> PICK UP مسجل في هذا السجل،
          ومستبعد بالكامل من مؤشرات الفروع وترتيبها وحصصها.
        </p>
      </div>
    </div>
  `;
}

function contentHtml(state, filters) {
  const summary = compute(state, filters);
  const insights = buildInsights({
    branches: summary,
    validation: state.validation,
    meta: state.meta,
  }).slice(0, 6);

  const cards = [
    kpiCard({
      label: "إجمالي PICK UP",
      value: formatNumber(summary.totalPickup),
      unit: "وحدة",
      note: formatDateRange(filters.from, filters.to),
      iconName: "Package",
      accent: true,
    }),
    kpiCard({
      label: "عدد الفروع",
      value: formatNumber(summary.count),
      unit: "فرع",
      note: "بعد استبعاد السجلات الاستثنائية",
      iconName: "GitBranch",
    }),
    kpiCard({
      label: "فروع نشطة",
      value: formatNumber(summary.activeCount),
      unit: "فرع",
      note: `من أصل ${formatNumber(summary.count)} فرع`,
      iconName: "Building2",
    }),
    kpiCard({
      label: "فروع بدون PICK UP",
      value: formatNumber(summary.zeroCount),
      unit: "فرع",
      note: summary.zero.length ? summary.zero.map((item) => item.branch).join("، ") : "لا يوجد",
      iconName: "AlertTriangle",
    }),
    kpiCard({
      label: "متوسط PICK UP للفرع النشط",
      value: formatDecimal(summary.averageActive),
      unit: "وحدة",
      note: `${formatNumber(summary.activeCount)} فرع نشط`,
      iconName: "Gauge",
    }),
    kpiCard({
      label: "أعلى فرع",
      value: summary.top ? formatNumber(summary.top.pickup) : "—",
      unit: "وحدة",
      note: summary.top ? summary.top.branch : "لا توجد بيانات",
      iconName: "TrendingUp",
    }),
    kpiCard({
      label: "حصة أعلى فرع",
      value: summary.top ? formatPercent(summary.top.share) : "—",
      note: "من إجمالي PICK UP للفروع",
      iconName: "CircleDollarSign",
    }),
    kpiCard({
      label: "سجل استثنائي",
      value: formatNumber(summary.exceptionalTotal),
      unit: "وحدة",
      note: summary.exceptionalRows.length
        ? [...new Set(summary.exceptionalRows.map((row) => row.branch))].join("، ")
        : "لا يوجد",
      iconName: "AlertCircle",
    }),
  ];

  const tableRows = sortedItems(summary);
  const columns = [
    {
      key: "rank",
      label: "#",
      numeric: true,
      sortable: false,
      render: (item) => String(summary.list.indexOf(item) + 1),
    },
    {
      key: "branch",
      label: "الفرع",
      render: (item) => `<span class="cell-main">${item.branch}</span>`,
    },
    {
      key: "pickup",
      label: "عدد PICK UP",
      numeric: true,
      render: (item) => formatNumber(item.pickup),
    },
    {
      key: "share",
      label: "النسبة",
      numeric: true,
      render: (item) => formatPercent(item.share),
    },
    {
      key: "status",
      label: "الحالة",
      sortable: false,
      render: (item) =>
        item.pickup > 0
          ? `<span class="badge badge-success">نشط</span>`
          : `<span class="badge badge-neutral">صفر</span>`,
    },
  ];

  return `
    ${exceptionPanel(summary)}
    ${summary.exceptionalRows.length ? '<div style="height:14px"></div>' : ""}
    ${kpiGrid(cards)}

    <div class="section chart-grid">
      ${chartCard({
        id: "br-bar",
        title: "PICK UP حسب الفرع",
        subtitle: "ترتيب تنازلي حسب العدد",
        empty: summary.list.length === 0,
        height: 300,
      })}
      ${chartCard({
        id: "br-share",
        title: "توزيع الحصص",
        subtitle: "أعلى 6 فروع + باقي الفروع",
        empty: summary.totalPickup === 0,
        height: 300,
      })}
    </div>

    <div class="section insight-columns">
      <section class="card">
        <div class="card-head">
          <div class="card-head-copy">
            <span class="card-title">ترتيب الفروع</span>
            <span class="card-subtitle">حسب عدد PICK UP</span>
          </div>
        </div>
        <div class="card-body">${rankList(summary)}</div>
      </section>
      <section class="card">
        <div class="card-head">
          <div class="card-head-copy">
            <span class="card-title">مؤشرات الفروع</span>
            <span class="card-subtitle">قراءات محسوبة من السجلات المفلترة</span>
          </div>
        </div>
        <div class="card-body">${insightList(insights)}</div>
      </section>
    </div>

    <div class="section">
      ${tableCard({
        columns,
        rows: tableRows,
        sort: ui.sort,
        page: ui.page,
        pageSize: ui.pageSize,
        title: "سجلات الفروع",
        subtitle: formatDateRange(filters.from, filters.to),
        actions: `
          <button type="button" class="btn btn-secondary btn-sm" data-action="export-csv">${icon("Download", 14)} CSV</button>
          <button type="button" class="btn btn-secondary btn-sm" data-action="export-excel">${icon("FileSpreadsheet", 14)} Excel</button>
        `,
      })}
    </div>
  `;
}

function bindContent(contentHost, filters, summary, refresh) {
  contentHost.querySelectorAll("[data-sort-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.sortKey;
      if (ui.sort.key === key) ui.sort.dir = ui.sort.dir === "asc" ? "desc" : "asc";
      else ui.sort = { key, dir: "asc" };
      refresh();
    });
  });

  contentHost.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      ui.page = Number(button.dataset.page) || 1;
      refresh();
    });
  });

  contentHost.querySelector("[data-page-size]")?.addEventListener("change", (event) => {
    ui.pageSize = event.target.value === "all" ? "all" : Number(event.target.value);
    ui.page = 1;
    refresh();
  });

  const rows = () => sortedItems(summary);
  contentHost.querySelector('[data-action="export-csv"]')?.addEventListener("click", () => {
    downloadCSV(`due-branches-${Date.now()}`, rows(), exportColumns());
  });
  contentHost.querySelector('[data-action="export-excel"]')?.addEventListener("click", () => {
    downloadExcel(`due-branches-${Date.now()}`, rows(), exportColumns());
  });
}

function mount(root, state) {
  const options = optionsFor(state);
  mountPage(root, {
    state,
    page: "branches",
    options,
    renderContent: (filters) => contentHtml(state, filters),
    mountContent: (contentHost, filters, refresh) => {
      const summary = compute(state, filters);
      bindContent(contentHost, filters, summary, refresh);

      if (summary.list.length) {
        renderChart("br-bar", {
          type: "bar",
          data: {
            labels: summary.list.map((item) => item.branch),
            datasets: [
              {
                label: "PICK UP",
                data: summary.list.map((item) => item.pickup),
                backgroundColor: summary.list.map((_, index) =>
                  index === 0 ? CHART_COLORS[0] : "rgba(164, 14, 14, 0.32)",
                ),
                borderRadius: 5,
                borderSkipped: false,
                barThickness: 16,
              },
            ],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { beginAtZero: true, ticks: { precision: 0 } },
              y: { reverse: true, grid: { display: false } },
            },
          },
        });
      }

      if (summary.totalPickup > 0) {
        const active = summary.list.filter((item) => item.pickup > 0);
        const top = active.slice(0, 6);
        const rest = active.slice(6).reduce((acc, item) => acc + item.pickup, 0);
        const labels = top.map((item) => item.branch);
        const data = top.map((item) => item.pickup);
        if (rest > 0) {
          labels.push("باقي الفروع");
          data.push(rest);
        }
        renderChart("br-share", {
          type: "doughnut",
          data: {
            labels,
            datasets: [
              {
                data,
                backgroundColor: labels.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
                borderColor: "transparent",
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "60%",
            plugins: { legend: { position: "bottom" } },
          },
        });
      }
    },
  });
}

export function render(state) {
  const options = optionsFor(state);
  return pageScaffold({
    meta,
    filters: state.filters.branches,
    options,
    page: "branches",
    actions: `<button type="button" class="btn btn-secondary" data-action="print">${icon("Printer", 16)} طباعة</button>`,
  });
}

export { mount };
