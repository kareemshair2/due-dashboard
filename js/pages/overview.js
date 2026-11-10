import { pageScaffold, mountPage } from "../components/page.js";
import { kpiCard, kpiGrid } from "../components/kpi.js";
import { chartCard, renderChart, CHART_COLORS } from "../components/chart.js";
import { coverageStrip, dataNote } from "../components/states.js";
import { icon } from "../utils/icons.js";
import {
  formatCurrency,
  formatDate,
  formatDateRange,
  formatDecimal,
  formatNumber,
  formatPercent,
} from "../utils/formatters.js";
import { previousRange } from "../utils/date-utils.js";
import {
  distinctValues,
  filterBranches,
  filterCars,
  filterExceptionalBranches,
  filterOrders,
} from "../analytics/filters.js";
import { summarizeOrders } from "../analytics/orders-analytics.js";
import { summarizeBranches } from "../analytics/branches-analytics.js";
import { summarizeCars } from "../analytics/cars-analytics.js";
import { buildInsights } from "../analytics/insights.js";

export const meta = {
  title: "النظرة العامة",
  description:
    "ملخص تشغيلي موحد للطلبات والفروع والعربات، محسوب مباشرة من بيانات Google Sheets وفق الفلاتر المحددة.",
};

function optionsFor(state) {
  return {
    date: true,
    statuses: [
      { value: "PICK_UP", label: "PICK UP" },
      { value: "HOLD", label: "HOLD" },
      { value: "OTHER", label: "أخرى" },
    ],
    branches: distinctValues(
      state.data.branches.filter((row) => !row.isExceptional),
      (row) => row.branch,
    ).map((value) => ({ value, label: value })),
    vehicles: distinctValues(state.data.cars, (row) => row.vehicle).map((value) => ({
      value,
      label: value,
    })),
  };
}

function compute(state, filters) {
  const orders = summarizeOrders(filterOrders(state.data.orders, filters));
  const exceptional = filterExceptionalBranches(state.data.branches, filters);
  const branches = summarizeBranches(filterBranches(state.data.branches, filters), exceptional);
  const cars = summarizeCars(filterCars(state.data.cars, filters));

  let previous = null;
  if (filters.from && filters.to) {
    const range = previousRange(filters.from, filters.to);
    if (range.from && range.to) {
      const prevFilters = { ...filters, from: range.from, to: range.to };
      previous = {
        orders: summarizeOrders(filterOrders(state.data.orders, prevFilters)),
        branches: summarizeBranches(
          filterBranches(state.data.branches, prevFilters),
          filterExceptionalBranches(state.data.branches, prevFilters),
        ),
        cars: summarizeCars(filterCars(state.data.cars, prevFilters)),
      };
    }
  }

  return { orders, branches, cars, previous };
}

function pctDelta(current, previous, invert = false) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  const value = ((current - previous) / previous) * 100;
  const positive = value >= 0;
  return { value, tone: (invert ? !positive : positive) ? "good" : "bad" };
}

function rankList(branches) {
  if (!branches.list.length) {
    return `<div class="table-empty">لا توجد سجلات فروع مطابقة.</div>`;
  }
  const max = Math.max(1, ...branches.list.map((item) => item.pickup));
  return `
    <div class="rank-list">
      ${branches.list
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

function insightList(insights) {
  if (!insights.length) {
    return `<div class="table-empty">لا توجد مؤشرات كافية لعرضها.</div>`;
  }
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

function exceptionPanel(branches) {
  if (!branches.exceptionalRows.length) return "";
  const names = [...new Set(branches.exceptionalRows.map((row) => row.branch))].join("، ");
  return `
    <div class="exception-panel">
      <span class="icon-wrap">${icon("AlertCircle", 17)}</span>
      <div>
        <h4>سجل استثنائي: ${names}</h4>
        <p>
          القيمة المسجلة <strong>${formatNumber(branches.exceptionalTotal)}</strong> PICK UP،
          ومستبعدة من مؤشرات الفروع وترتيبها. تظهر فقط كاستثناء تشغيلي.
        </p>
      </div>
    </div>
  `;
}

function contentHtml(state, filters) {
  const { orders, branches, cars, previous } = compute(state, filters);
  const insights = buildInsights({
    orders,
    branches,
    cars,
    validation: state.validation,
    meta: state.meta,
  }).slice(0, 8);

  const cards = [
    kpiCard({
      label: "إجمالي الكمية",
      value: formatNumber(orders.totalQuantity),
      unit: "وحدة",
      note: `${formatNumber(orders.count)} طلب`,
      iconName: "Package",
      accent: true,
      delta: previous ? pctDelta(orders.totalQuantity, previous.orders.totalQuantity) : null,
    }),
    kpiCard({
      label: "PICK UP",
      value: formatNumber(orders.pickUpQuantity),
      unit: "وحدة",
      note: `${formatNumber(orders.pickUpCount)} طلب · ${formatPercent(orders.pickUpShare)}`,
      iconName: "ShoppingBag",
      delta: previous ? pctDelta(orders.pickUpQuantity, previous.orders.pickUpQuantity) : null,
    }),
    kpiCard({
      label: "HOLD",
      value: formatNumber(orders.holdQuantity),
      unit: "وحدة",
      note: `${formatNumber(orders.holdCount)} طلب · ${formatPercent(orders.holdShare)}`,
      iconName: "AlertTriangle",
    }),
    kpiCard({
      label: "متوسط الكمية لكل طلب",
      value: formatDecimal(orders.averageQuantity),
      unit: "وحدة",
      note: `${formatNumber(orders.customersCount)} عميل`,
      iconName: "TrendingUp",
    }),
    kpiCard({
      label: "PICK UP الفروع",
      value: formatNumber(branches.totalPickup),
      unit: "وحدة",
      note: `${formatNumber(branches.activeCount)} فرع نشط من ${formatNumber(branches.count)}`,
      iconName: "GitBranch",
    }),
    kpiCard({
      label: "رحلات العربات",
      value: formatNumber(cars.tripCount),
      unit: "رحلة",
      note: `${formatNumber(cars.records)} سجل · ${formatNumber(cars.vehicleCount)} عربة`,
      iconName: "Route",
      delta: previous ? pctDelta(cars.tripCount, previous.cars.tripCount) : null,
    }),
    kpiCard({
      label: "إجمالي المسافة",
      value: formatNumber(cars.totalDistance),
      unit: "كم",
      note: `متوسط ${formatDecimal(cars.averageTrip)} كم/رحلة`,
      iconName: "Gauge",
      delta: previous ? pctDelta(cars.totalDistance, previous.cars.totalDistance) : null,
    }),
    kpiCard({
      label: "كفاءة الوقود",
      value: formatDecimal(cars.efficiency),
      unit: "كم/لتر",
      note: `${formatNumber(cars.totalFuel)} لتر · ${formatCurrency(cars.totalCost)}`,
      iconName: "Fuel",
    }),
  ];

  const trendData = orders.byDay;
  const branchData = branches.list.slice(0, 8);
  const vehicleData = cars.byVehicle.slice(0, 8);

  const coverage = coverageStrip([
    { label: "طلبات", value: formatNumber(orders.count) },
    { label: "فروع", value: formatNumber(branches.count) },
    { label: "عربات", value: formatNumber(cars.records) },
    { label: "ملاحظات جودة", value: formatNumber(state.validation.summary.total), muted: state.validation.summary.total > 0 },
    { label: "الفترة", value: formatDateRange(filters.from, filters.to) },
  ]);

  const qualityNote =
    state.validation.summary.total > 0
      ? dataNote({
          warning: state.validation.summary.bySeverity.critical > 0,
          iconName: "ShieldCheck",
          text: `توجد <strong>${formatNumber(state.validation.summary.total)}</strong> ملاحظة جودة بيانات. <a href="#/data-quality">عرض التفاصيل</a>`,
        })
      : "";

  return `
    ${coverage}
    <div style="height:14px"></div>
    ${exceptionPanel(branches)}
    ${branches.exceptionalRows.length ? '<div style="height:14px"></div>' : ""}
    ${kpiGrid(cards)}

    <div class="section chart-grid">
      ${chartCard({
        id: "ov-trend",
        title: "اتجاه الكمية اليومي",
        subtitle: "إجمالي الكمية مقابل كمية PICK UP",
        span: true,
        empty: trendData.length === 0,
        height: 260,
      })}
      ${chartCard({
        id: "ov-status",
        title: "الكمية حسب الحالة",
        subtitle: "توزيع الكمية على حالات الطلبات",
        empty: orders.totalQuantity === 0,
        height: 260,
      })}
    </div>

    <div class="section chart-grid">
      ${chartCard({
        id: "ov-branches",
        title: "PICK UP حسب الفرع",
        subtitle: "أعلى 8 فروع بعد استبعاد السجلات الاستثنائية",
        empty: branchData.length === 0,
        height: 280,
      })}
      ${chartCard({
        id: "ov-vehicles",
        title: "المسافة حسب العربة",
        subtitle: "المسافة المحسوبة من فروق العدادات",
        empty: vehicleData.length === 0,
        height: 280,
      })}
    </div>

    <div class="section insight-columns">
      <section class="card">
        <div class="card-head">
          <div class="card-head-copy">
            <span class="card-title">ترتيب الفروع</span>
            <span class="card-subtitle">حسب عدد PICK UP في الفترة المحددة</span>
          </div>
          <a class="btn btn-ghost btn-sm" href="#/branches">${icon("ArrowUpRight", 14)} التفاصيل</a>
        </div>
        <div class="card-body">${rankList(branches)}</div>
      </section>
      <section class="card">
        <div class="card-head">
          <div class="card-head-copy">
            <span class="card-title">مؤشرات محسوبة</span>
            <span class="card-subtitle">قراءات مباشرة من البيانات دون تعليق أو توصيات</span>
          </div>
        </div>
        <div class="card-body">${insightList(insights)}</div>
      </section>
    </div>

    ${qualityNote ? `<div class="section">${qualityNote}</div>` : ""}
  `;
}

function mount(root, state) {
  const options = optionsFor(state);
  mountPage(root, {
    state,
    page: "overview",
    options,
    renderContent: (filters) => contentHtml(state, filters),
    mountContent: (contentHost) => {
      const filters = state.filters.overview;
      const { orders, branches, cars } = compute(state, filters);

      if (orders.byDay.length) {
        renderChart("ov-trend", {
          type: "line",
          data: {
            labels: orders.byDay.map((day) => formatDate(day.date)),
            datasets: [
              {
                label: "إجمالي الكمية",
                data: orders.byDay.map((day) => day.quantity),
                borderColor: CHART_COLORS[0],
                backgroundColor: "rgba(164, 14, 14, 0.12)",
                fill: true,
                tension: 0.35,
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: CHART_COLORS[0],
              },
              {
                label: "PICK UP",
                data: orders.byDay.map((day) => day.pickUpQuantity),
                borderColor: CHART_COLORS[1],
                backgroundColor: "transparent",
                tension: 0.35,
                borderWidth: 2,
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

      if (orders.totalQuantity > 0) {
        renderChart("ov-status", {
          type: "doughnut",
          data: {
            labels: ["PICK UP", "HOLD", "أخرى"],
            datasets: [
              {
                data: [orders.pickUpQuantity, orders.holdQuantity, orders.otherQuantity],
                backgroundColor: [CHART_COLORS[0], CHART_COLORS[1], CHART_COLORS[2]],
                borderColor: "transparent",
                borderWidth: 2,
                hoverOffset: 4,
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

      const branchData = branches.list.slice(0, 8);
      if (branchData.length) {
        renderChart("ov-branches", {
          type: "bar",
          data: {
            labels: branchData.map((item) => item.branch),
            datasets: [
              {
                label: "PICK UP",
                data: branchData.map((item) => item.pickup),
                backgroundColor: branchData.map((_, index) =>
                  index === 0 ? CHART_COLORS[0] : "rgba(164, 14, 14, 0.35)",
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

      const vehicleData = cars.byVehicle.slice(0, 8);
      if (vehicleData.length) {
        renderChart("ov-vehicles", {
          type: "bar",
          data: {
            labels: vehicleData.map((item) => item.vehicle),
            datasets: [
              {
                label: "المسافة (كم)",
                data: vehicleData.map((item) => item.distance),
                backgroundColor: vehicleData.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
                borderRadius: 5,
                borderSkipped: false,
                barThickness: 18,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false } },
              y: { beginAtZero: true, ticks: { precision: 0 } },
            },
          },
        });
      }

      void contentHost;
    },
  });
}

export function render(state) {
  const options = optionsFor(state);
  return pageScaffold({
    meta,
    filters: state.filters.overview,
    options,
    page: "overview",
    actions: `<button type="button" class="btn btn-secondary" data-action="print">${icon("Printer", 16)} طباعة التقرير</button>`,
  });
}

export { mount };
