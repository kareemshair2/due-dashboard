import { pageScaffold, mountPage } from "../components/page.js";
import { kpiCard, kpiGrid } from "../components/kpi.js";
import { chartCard, renderChart, CHART_COLORS } from "../components/chart.js";
import { tableCard, sortRows } from "../components/table.js";
import { dataNote } from "../components/states.js";
import { icon } from "../utils/icons.js";
import {
  formatCurrency,
  formatDate,
  formatDateRange,
  formatDecimal,
  formatDecimal2,
  formatNumber,
} from "../utils/formatters.js";
import { downloadCSV } from "../utils/csv.js";
import { downloadExcel } from "../utils/excel.js";
import { distinctValues, filterCars } from "../analytics/filters.js";
import { summarizeCars } from "../analytics/cars-analytics.js";
import { buildInsights } from "../analytics/insights.js";

export const meta = {
  title: "العربات",
  description:
    "تحليل المسافات والوقود والتكلفة المحسوبة من عدادات العربات، مع التحقق من صلاحية القراءات.",
};

/** @type {{ sort: { key: string, dir: string }, page: number, pageSize: number | "all" }} */
const ui = { sort: { key: "date", dir: "desc" }, page: 1, pageSize: 10 };

function optionsFor(state) {
  return {
    date: true,
    search: { placeholder: "ابحث بالسائق أو العربة أو الوردية" },
    vehicles: distinctValues(state.data.cars, (row) => row.vehicle).map((value) => ({
      value,
      label: value,
    })),
    drivers: distinctValues(state.data.cars, (row) => row.driver).map((value) => ({
      value,
      label: value,
    })),
    shifts: distinctValues(state.data.cars, (row) => row.shift).map((value) => ({
      value,
      label: value,
    })),
  };
}

function compute(state, filters) {
  return summarizeCars(filterCars(state.data.cars, filters));
}

function sortedRows(summary) {
  const columns = [
    { key: "date", sortValue: (row) => row.date || "" },
    { key: "vehicle", sortValue: (row) => row.vehicle || "" },
    { key: "distance", sortValue: (row) => row.distance ?? -1 },
    { key: "fuel", sortValue: (row) => row.fuel ?? -1 },
    { key: "cost", sortValue: (row) => row.cost ?? -1 },
    { key: "driver", sortValue: (row) => row.driver || "" },
  ];
  return sortRows(summary.rows, ui.sort, columns);
}

function exportColumns() {
  return [
    { label: "التاريخ", value: (row) => row.date || "" },
    { label: "الوردية", value: (row) => row.shift || "" },
    { label: "السائق", value: (row) => row.driver || "" },
    { label: "العربة", value: (row) => row.vehicle || "" },
    { label: "عداد الاستلام", value: (row) => row.start ?? "" },
    { label: "عداد التسليم", value: (row) => row.end ?? "" },
    { label: "المسافة المحسوبة", value: (row) => row.distance ?? "" },
    { label: "عدد الكيلوات المسجل", value: (row) => row.kmRaw ?? "" },
    { label: "لترات الوقود", value: (row) => row.fuel ?? "" },
    { label: "التكلفة", value: (row) => row.cost ?? "" },
    {
      label: "كفاءة الوقود",
      value: (row) => (Number.isFinite(row.fuelEfficiency) ? row.fuelEfficiency.toFixed(2) : ""),
    },
  ];
}

function statusBadge(row) {
  if (row.isEndBeforeStart) return `<span class="badge badge-danger">عداد معكوس</span>`;
  if (row.isZeroReading) return `<span class="badge badge-warning">عداد صفر</span>`;
  if (!row.isOdometerValid) return `<span class="badge badge-neutral">قراءة غير صالحة</span>`;
  if (row.isTrip) return `<span class="badge badge-success">رحلة صالحة</span>`;
  return `<span class="badge badge-neutral">بدون مسافة</span>`;
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
  const summary = compute(state, filters);
  const insights = buildInsights({
    cars: summary,
    validation: state.validation,
    meta: state.meta,
  }).slice(0, 6);

  const cards = [
    kpiCard({
      label: "سجلات العربات",
      value: formatNumber(summary.records),
      unit: "سجل",
      note: `${formatNumber(summary.vehicleCount)} عربة · ${formatNumber(summary.driverCount)} سائق`,
      iconName: "Car",
      accent: true,
    }),
    kpiCard({
      label: "رحلات صالحة",
      value: formatNumber(summary.tripCount),
      unit: "رحلة",
      note: `${formatNumber(summary.invalidCount)} سجل غير صالح`,
      iconName: "Route",
    }),
    kpiCard({
      label: "إجمالي المسافة",
      value: formatNumber(summary.totalDistance),
      unit: "كم",
      note: `متوسط ${formatDecimal(summary.averageTrip)} كم/رحلة`,
      iconName: "Gauge",
    }),
    kpiCard({
      label: "الوقود",
      value: formatDecimal(summary.totalFuel),
      unit: "لتر",
      note: "داخل الرحلات الصالحة فقط",
      iconName: "Fuel",
    }),
    kpiCard({
      label: "التكلفة",
      value: formatCurrency(summary.totalCost),
      note: "مجموع عمود التكلفة",
      iconName: "CircleDollarSign",
    }),
    kpiCard({
      label: "كفاءة الوقود",
      value: formatDecimal(summary.efficiency),
      unit: "كم/لتر",
      note: "المسافة ÷ الوقود",
      iconName: "TrendingUp",
    }),
    kpiCard({
      label: "تكلفة الكيلومتر",
      value: formatDecimal2(summary.costPerKm),
      unit: "ج.م/كم",
      note: "التكلفة ÷ المسافة",
      iconName: "CircleDollarSign",
    }),
    kpiCard({
      label: "سجلات غير صالحة",
      value: formatNumber(summary.invalidCount),
      unit: "سجل",
      note: summary.invalidCount ? "مستبعدة من المسافة" : "كل السجلات صالحة",
      iconName: "AlertTriangle",
    }),
  ];

  const rows = sortedRows(summary);
  const columns = [
    {
      key: "date",
      label: "التاريخ",
      render: (row) => `<span class="cell-main">${formatDate(row.date)}</span><span class="cell-sub">صف ${row.__row}</span>`,
    },
    {
      key: "shift",
      label: "الوردية",
      render: (row) => row.shift || "—",
    },
    {
      key: "driver",
      label: "السائق",
      render: (row) => row.driver || "—",
    },
    {
      key: "vehicle",
      label: "العربة",
      render: (row) => `<span class="cell-main">${row.vehicle || "—"}</span>`,
    },
    {
      key: "start",
      label: "عداد الاستلام",
      numeric: true,
      sortable: false,
      render: (row) => formatNumber(row.start),
    },
    {
      key: "end",
      label: "عداد التسليم",
      numeric: true,
      sortable: false,
      render: (row) => formatNumber(row.end),
    },
    {
      key: "distance",
      label: "المسافة المحسوبة",
      numeric: true,
      render: (row) => {
        const mismatch =
          row.kmMismatch !== null && Math.abs(row.kmMismatch) > 1
            ? `<span class="cell-sub text-warning">مسجل: ${formatNumber(row.kmRaw)}</span>`
            : "";
        return `<span class="cell-main">${formatNumber(row.distance)}</span>${mismatch}`;
      },
    },
    {
      key: "fuel",
      label: "الوقود",
      numeric: true,
      render: (row) => formatDecimal(row.fuel),
    },
    {
      key: "cost",
      label: "التكلفة",
      numeric: true,
      render: (row) => (Number.isFinite(row.cost) ? formatCurrency(row.cost) : "—"),
    },
    {
      key: "efficiency",
      label: "كم/لتر",
      numeric: true,
      sortable: false,
      render: (row) => formatDecimal2(row.fuelEfficiency),
    },
    {
      key: "status",
      label: "الحالة",
      sortable: false,
      render: (row) => statusBadge(row),
    },
  ];

  const byDay = summary.byDay;
  const byVehicle = summary.byVehicle;
  const efficiencyVehicles = byVehicle.filter((item) => Number.isFinite(item.efficiency));

  return `
    ${dataNote({
      iconName: "Gauge",
      text:
        "المسافة تُحسب من فرق عدادي الاستلام والتسليم فقط عند صلاحية القراءتين (غير سالبة، التسليم ≥ الاستلام، وليست صفرًا). لا تُستخدم قيمة <strong>عدد الكيلوات</strong> المسجلة كبديل.",
    })}
    <div style="height:14px"></div>
    ${kpiGrid(cards)}

    <div class="section chart-grid">
      ${chartCard({
        id: "car-day",
        title: "المسافة اليومية",
        subtitle: "مجموع المسافات المحسوبة يوميًا",
        span: true,
        empty: byDay.length === 0,
      })}
      ${chartCard({
        id: "car-vehicle",
        title: "المسافة حسب العربة",
        subtitle: "الرحلات الصالحة فقط",
        empty: byVehicle.length === 0,
      })}
    </div>

    <div class="section insight-columns">
      ${chartCard({
        id: "car-efficiency",
        title: "كفاءة الوقود حسب العربة",
        subtitle: "كم لكل لتر",
        empty: efficiencyVehicles.length === 0,
      })}
      <section class="card">
        <div class="card-head">
          <div class="card-head-copy">
            <span class="card-title">مؤشرات العربات</span>
            <span class="card-subtitle">قراءات محسوبة من السجلات المفلترة</span>
          </div>
        </div>
        <div class="card-body">${insightList(insights)}</div>
      </section>
    </div>

    <div class="section">
      ${tableCard({
        columns,
        rows,
        sort: ui.sort,
        page: ui.page,
        pageSize: ui.pageSize,
        title: "سجلات العربات",
        subtitle: formatDateRange(filters.from, filters.to),
        actions: `
          <button type="button" class="btn btn-secondary btn-sm" data-action="export-csv">${icon("Download", 14)} CSV</button>
          <button type="button" class="btn btn-secondary btn-sm" data-action="export-excel">${icon("FileSpreadsheet", 14)} Excel</button>
        `,
      })}
    </div>
  `;
}

function bindContent(contentHost, summary, refresh) {
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

  const rows = () => sortedRows(summary);
  contentHost.querySelector('[data-action="export-csv"]')?.addEventListener("click", () => {
    downloadCSV(`due-cars-${Date.now()}`, rows(), exportColumns());
  });
  contentHost.querySelector('[data-action="export-excel"]')?.addEventListener("click", () => {
    downloadExcel(`due-cars-${Date.now()}`, rows(), exportColumns());
  });
}

function mount(root, state) {
  const options = optionsFor(state);
  mountPage(root, {
    state,
    page: "cars",
    options,
    renderContent: (filters) => contentHtml(state, filters),
    mountContent: (contentHost, filters, refresh) => {
      const summary = compute(state, filters);
      const efficiencyVehicles = summary.byVehicle.filter((item) =>
        Number.isFinite(item.efficiency),
      );
      bindContent(contentHost, summary, refresh);

      if (summary.byDay.length) {
        renderChart("car-day", {
          type: "line",
          data: {
            labels: summary.byDay.map((day) => formatDate(day.date)),
            datasets: [
              {
                label: "المسافة (كم)",
                data: summary.byDay.map((day) => day.distance),
                borderColor: CHART_COLORS[0],
                backgroundColor: "rgba(164, 14, 14, 0.12)",
                fill: true,
                tension: 0.35,
                borderWidth: 2,
                pointRadius: 3,
              },
              {
                label: "الوقود (لتر)",
                data: summary.byDay.map((day) => day.fuel),
                borderColor: CHART_COLORS[3],
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
              y: { beginAtZero: true },
            },
          },
        });
      }

      if (summary.byVehicle.length) {
        renderChart("car-vehicle", {
          type: "bar",
          data: {
            labels: summary.byVehicle.map((item) => item.vehicle),
            datasets: [
              {
                label: "المسافة (كم)",
                data: summary.byVehicle.map((item) => item.distance),
                backgroundColor: summary.byVehicle.map((_, index) =>
                  CHART_COLORS[index % CHART_COLORS.length],
                ),
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
              y: { beginAtZero: true },
            },
          },
        });
      }

      if (efficiencyVehicles.length) {
        renderChart("car-efficiency", {
          type: "bar",
          data: {
            labels: efficiencyVehicles.map((item) => item.vehicle),
            datasets: [
              {
                label: "كم/لتر",
                data: efficiencyVehicles.map((item) => item.efficiency),
                backgroundColor: efficiencyVehicles.map((_, index) =>
                  CHART_COLORS[index % CHART_COLORS.length],
                ),
                borderRadius: 5,
                borderSkipped: false,
                barThickness: 18,
              },
            ],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { beginAtZero: true },
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
    filters: state.filters.cars,
    options,
    page: "cars",
    actions: `<button type="button" class="btn btn-secondary" data-action="print">${icon("Printer", 16)} طباعة</button>`,
  });
}

export { mount };
