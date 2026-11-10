import { pageScaffold, mountPage } from "../components/page.js";
import { kpiCard, kpiGrid } from "../components/kpi.js";
import { chartCard, renderChart, CHART_COLORS } from "../components/chart.js";
import { tableCard, sortRows } from "../components/table.js";
import { icon } from "../utils/icons.js";
import {
  formatDate,
  formatDateRange,
  formatDecimal,
  formatNumber,
  formatPercent,
} from "../utils/formatters.js";
import { downloadCSV } from "../utils/csv.js";
import { downloadExcel } from "../utils/excel.js";
import { distinctValues, filterOrders } from "../analytics/filters.js";
import { summarizeOrders } from "../analytics/orders-analytics.js";
import { buildInsights } from "../analytics/insights.js";
import { statusLabel } from "../data/schema.js";

export const meta = {
  title: "الطلبات",
  description:
    "تحليل الطلبات والكميات حسب الحالة والعميل والفترة الزمنية، مع تصدير البيانات المفلترة.",
};

/** @type {{ sort: { key: string, dir: string }, page: number, pageSize: number | "all" }} */
const ui = { sort: { key: "date", dir: "desc" }, page: 1, pageSize: 10 };

function optionsFor(state) {
  return {
    date: true,
    search: { placeholder: "ابحث باسم العميل أو الحالة" },
    statuses: [
      { value: "PICK_UP", label: "PICK UP" },
      { value: "HOLD", label: "HOLD" },
      { value: "OTHER", label: "أخرى" },
    ],
    customers: distinctValues(state.data.orders, (row) => row.customer).map((value) => ({
      value,
      label: value,
    })),
  };
}

function statusBadge(row) {
  const className =
    row.status === "PICK_UP" ? "badge-orange" : row.status === "HOLD" ? "badge-warning" : "badge-neutral";
  return `<span class="badge ${className}">${statusLabel(row.status)}</span>`;
}

function exportColumns() {
  return [
    { label: "التاريخ", value: (row) => row.date || "" },
    { label: "العميل", value: (row) => row.customer || "" },
    { label: "الحالة", value: (row) => statusLabel(row.status) },
    { label: "الكمية", value: (row) => row.quantity ?? "" },
  ];
}

function sortedRows(state, filters) {
  const summary = summarizeOrders(filterOrders(state.data.orders, filters));
  const columns = [
    { key: "date", sortValue: (row) => row.date || "" },
    { key: "customer", sortValue: (row) => row.customer || "" },
    { key: "status", sortValue: (row) => row.status || "" },
    { key: "quantity", sortValue: (row) => row.quantity ?? -1 },
  ];
  return { rows: sortRows(summary.rows, ui.sort, columns), summary };
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

function contentHtml(state, filters) {
  const summary = summarizeOrders(filterOrders(state.data.orders, filters));
  const insights = buildInsights({
    orders: summary,
    validation: state.validation,
    meta: state.meta,
  }).slice(0, 6);

  const cards = [
    kpiCard({
      label: "عدد الطلبات",
      value: formatNumber(summary.count),
      unit: "طلب",
      note: formatDateRange(filters.from, filters.to),
      iconName: "ShoppingBag",
      accent: true,
    }),
    kpiCard({
      label: "إجمالي الكمية",
      value: formatNumber(summary.totalQuantity),
      unit: "وحدة",
      note: `${formatNumber(summary.customersCount)} عميل`,
      iconName: "Package",
    }),
    kpiCard({
      label: "طلبات PICK UP",
      value: formatNumber(summary.pickUpCount),
      unit: "طلب",
      note: `كمية ${formatNumber(summary.pickUpQuantity)}`,
      iconName: "ClipboardCheck",
    }),
    kpiCard({
      label: "كمية PICK UP",
      value: formatNumber(summary.pickUpQuantity),
      unit: "وحدة",
      note: `${formatPercent(summary.pickUpShare)} من الإجمالي`,
      iconName: "TrendingUp",
    }),
    kpiCard({
      label: "طلبات HOLD",
      value: formatNumber(summary.holdCount),
      unit: "طلب",
      note: `كمية ${formatNumber(summary.holdQuantity)}`,
      iconName: "AlertTriangle",
    }),
    kpiCard({
      label: "كمية HOLD",
      value: formatNumber(summary.holdQuantity),
      unit: "وحدة",
      note: `${formatPercent(summary.holdShare)} من الإجمالي`,
      iconName: "AlertCircle",
    }),
    kpiCard({
      label: "متوسط الكمية لكل طلب",
      value: formatDecimal(summary.averageQuantity),
      unit: "وحدة",
      note: "على الطلبات ذات الكمية الصالحة",
      iconName: "Gauge",
    }),
    kpiCard({
      label: "عدد العملاء",
      value: formatNumber(summary.customersCount),
      unit: "عميل",
      note: summary.topCustomer
        ? `أكبر عميل: ${summary.topCustomer.customer}`
        : "لا يوجد عملاء",
      iconName: "Users",
    }),
  ];

  const trend = summary.byDay;
  const customers = summary.byCustomer.slice(0, 7);
  const sorted = sortedRows(state, filters);

  const columns = [
    {
      key: "date",
      label: "التاريخ",
      sortable: true,
      render: (row) => `<span class="cell-main">${formatDate(row.date)}</span><span class="cell-sub">صف ${row.__row}</span>`,
    },
    {
      key: "customer",
      label: "العميل",
      render: (row) => `<span class="cell-main">${row.customer || "—"}</span>`,
    },
    {
      key: "status",
      label: "الحالة",
      render: (row) => statusBadge(row),
    },
    {
      key: "quantity",
      label: "الكمية",
      numeric: true,
      render: (row) => formatNumber(row.quantity),
    },
    {
      key: "share",
      label: "النسبة",
      numeric: true,
      sortable: false,
      render: (row) =>
        summary.totalQuantity > 0 && Number.isFinite(row.quantity)
          ? formatPercent((row.quantity / summary.totalQuantity) * 100)
          : "—",
    },
  ];

  return `
    ${kpiGrid(cards)}

    <div class="section chart-grid">
      ${chartCard({
        id: "ord-trend",
        title: "اتجاه الكمية اليومي",
        subtitle: "إجمالي الكمية وكمية PICK UP",
        span: true,
        empty: trend.length === 0,
      })}
      ${chartCard({
        id: "ord-status",
        title: "الكمية حسب الحالة",
        subtitle: "PICK UP مقابل HOLD",
        empty: summary.totalQuantity === 0,
      })}
    </div>

    <div class="section insight-columns">
      ${chartCard({
        id: "ord-customers",
        title: "أعلى العملاء بالكمية",
        subtitle: "أعلى 7 عملاء في الفترة المحددة",
        empty: customers.length === 0,
      })}
      <section class="card">
        <div class="card-head">
          <div class="card-head-copy">
            <span class="card-title">مؤشرات الطلبات</span>
            <span class="card-subtitle">قراءات محسوبة من السجلات المفلترة</span>
          </div>
        </div>
        <div class="card-body">${insightList(insights)}</div>
      </section>
    </div>

    <div class="section">
      ${tableCard({
        columns,
        rows: sorted.rows,
        sort: ui.sort,
        page: ui.page,
        pageSize: ui.pageSize,
        title: "سجلات الطلبات",
        subtitle: formatDateRange(filters.from, filters.to),
        actions: `
          <button type="button" class="btn btn-secondary btn-sm" data-action="export-csv">${icon("Download", 14)} CSV</button>
          <button type="button" class="btn btn-secondary btn-sm" data-action="export-excel">${icon("FileSpreadsheet", 14)} Excel</button>
        `,
      })}
    </div>
  `;
}

function bindContent(contentHost, state, filters, refresh) {
  contentHost.querySelectorAll("[data-sort-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.sortKey;
      if (ui.sort.key === key) {
        ui.sort.dir = ui.sort.dir === "asc" ? "desc" : "asc";
      } else {
        ui.sort = { key, dir: "asc" };
      }
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

  const exportRows = () => sortedRows(state, filters).rows;
  contentHost.querySelector('[data-action="export-csv"]')?.addEventListener("click", () => {
    downloadCSV(`due-orders-${Date.now()}`, exportRows(), exportColumns());
  });
  contentHost.querySelector('[data-action="export-excel"]')?.addEventListener("click", () => {
    downloadExcel(`due-orders-${Date.now()}`, exportRows(), exportColumns());
  });
}

function mount(root, state) {
  const options = optionsFor(state);
  mountPage(root, {
    state,
    page: "orders",
    options,
    renderContent: (filters) => contentHtml(state, filters),
    mountContent: (contentHost, filters, refresh) => {
      bindContent(contentHost, state, filters, refresh);

      const summary = summarizeOrders(filterOrders(state.data.orders, filters));
      if (summary.byDay.length) {
        renderChart("ord-trend", {
          type: "line",
          data: {
            labels: summary.byDay.map((day) => formatDate(day.date)),
            datasets: [
              {
                label: "إجمالي الكمية",
                data: summary.byDay.map((day) => day.quantity),
                borderColor: CHART_COLORS[0],
                backgroundColor: "rgba(255, 64, 21, 0.12)",
                fill: true,
                tension: 0.35,
                borderWidth: 2,
                pointRadius: 3,
              },
              {
                label: "PICK UP",
                data: summary.byDay.map((day) => day.pickUpQuantity),
                borderColor: CHART_COLORS[1],
                backgroundColor: "transparent",
                borderWidth: 2,
                tension: 0.35,
                pointRadius: 3,
                borderDash: [4, 4],
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: { legend: { position: "bottom" } },
            scales: {
              x: { grid: { display: false } },
              y: { beginAtZero: true, ticks: { precision: 0 } },
            },
          },
        });
      }

      if (summary.totalQuantity > 0) {
        renderChart("ord-status", {
          type: "doughnut",
          data: {
            labels: ["PICK UP", "HOLD", "أخرى"],
            datasets: [
              {
                data: [summary.pickUpQuantity, summary.holdQuantity, summary.otherQuantity],
                backgroundColor: [CHART_COLORS[0], CHART_COLORS[1], CHART_COLORS[2]],
                borderColor: "transparent",
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "62%",
            plugins: { legend: { position: "bottom" } },
          },
        });
      }

      const customers = summary.byCustomer.slice(0, 7);
      if (customers.length) {
        renderChart("ord-customers", {
          type: "bar",
          data: {
            labels: customers.map((item) => item.customer),
            datasets: [
              {
                label: "الكمية",
                data: customers.map((item) => item.quantity),
                backgroundColor: customers.map((_, index) =>
                  index === 0 ? CHART_COLORS[0] : "rgba(255, 64, 21, 0.32)",
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
    },
  });
}

export function render(state) {
  const options = optionsFor(state);
  return pageScaffold({
    meta,
    filters: state.filters.orders,
    options,
    page: "orders",
    actions: `<button type="button" class="btn btn-secondary" data-action="print">${icon("Printer", 16)} طباعة</button>`,
  });
}

export { mount };
