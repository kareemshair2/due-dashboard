import { pageScaffold, mountPage } from "../components/page.js";
import { kpiCard, kpiGrid } from "../components/kpi.js";
import { tableCard, sortRows } from "../components/table.js";
import { emptyState } from "../components/states.js";
import { icon } from "../utils/icons.js";
import { formatNumber, formatPercent } from "../utils/formatters.js";
import { downloadCSV } from "../utils/csv.js";
import { downloadExcel } from "../utils/excel.js";
import { matchesSearch } from "../analytics/filters.js";
import { SEVERITY, TAB_DEFINITIONS } from "../data/schema.js";

export const meta = {
  title: "جودة البيانات",
  description:
    "مراجعة اكتمال وصحة السجلات، وتغطية الأعمدة لكل تاب، مع قائمة الملاحظات القابلة للتصدير.",
};

/** @type {{ sort: { key: string, dir: string }, page: number, pageSize: number | "all" }} */
const ui = { sort: { key: "severity", dir: "asc" }, page: 1, pageSize: 25 };

const SEVERITY_RANK = { critical: 0, warning: 1, info: 2 };

function optionsFor() {
  return {
    search: { placeholder: "ابحث في الرسالة أو الرمز أو الحقل" },
    severities: [
      { value: "critical", label: "حرجة" },
      { value: "warning", label: "تحذير" },
      { value: "info", label: "ملاحظة" },
    ],
    tabs: Object.values(TAB_DEFINITIONS).map((tab) => ({
      value: tab.key,
      label: tab.label,
    })),
  };
}

function filteredIssues(state, filters) {
  return state.validation.issues.filter((issue) => {
    if (filters.severities.length && !filters.severities.includes(issue.severity)) return false;
    if (filters.tabs.length && !filters.tabs.includes(issue.tab)) return false;
    if (
      filters.search &&
      !matchesSearch(
        [issue.message, issue.code, issue.fieldLabel, String(issue.row), issue.tab],
        filters.search,
      )
    ) {
      return false;
    }
    return true;
  });
}

function summaryOf(issues) {
  const bySeverity = { critical: 0, warning: 0, info: 0 };
  const byTab = { orders: 0, branches: 0, cars: 0 };
  const byCode = {};
  const affected = new Set();
  for (const issue of issues) {
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
    byTab[issue.tab] = (byTab[issue.tab] || 0) + 1;
    byCode[issue.code] = (byCode[issue.code] || 0) + 1;
    affected.add(`${issue.tab}:${issue.row}`);
  }
  return { total: issues.length, bySeverity, byTab, byCode, affectedRows: affected.size };
}

function sortedIssues(issues) {
  const columns = [
    { key: "severity", sortValue: (issue) => SEVERITY_RANK[issue.severity] ?? 9 },
    { key: "tab", sortValue: (issue) => TAB_DEFINITIONS[issue.tab]?.label || issue.tab },
    { key: "row", sortValue: (issue) => issue.row },
    { key: "code", sortValue: (issue) => issue.code },
    { key: "field", sortValue: (issue) => issue.fieldLabel },
  ];
  return sortRows(issues, ui.sort, columns);
}

function exportColumns() {
  return [
    { label: "الخطورة", value: (issue) => SEVERITY[issue.severity]?.label || issue.severity },
    { label: "التاب", value: (issue) => TAB_DEFINITIONS[issue.tab]?.label || issue.tab },
    { label: "الصف", value: (issue) => issue.row },
    { label: "الرمز", value: (issue) => issue.code },
    { label: "الحقل", value: (issue) => issue.fieldLabel },
    { label: "الرسالة", value: (issue) => issue.message },
    { label: "القيمة", value: (issue) => (issue.value === null ? "" : String(issue.value)) },
  ];
}

function schemaCards(state) {
  return Object.values(TAB_DEFINITIONS)
    .map((tab) => {
      const tabMeta = state.meta[tab.key] || {};
      const mapped = Object.keys(tabMeta.schema || {}).length;
      const required = tab.required.length;
      return `
        <div class="card">
          <div class="card-head">
            <div class="card-head-copy">
              <span class="card-title">${tab.label}</span>
              <span class="card-subtitle">${tab.name}</span>
            </div>
            <span class="badge ${mapped >= required ? "badge-success" : "badge-danger"}">${mapped}/${required} أعمدة</span>
          </div>
          <div class="card-body">
            <div class="mini-stat-row">
              <div class="mini-stat"><span>صفوف مقروءة</span><strong>${formatNumber(tabMeta.count || 0)}</strong></div>
              <div class="mini-stat"><span>صفوف متجاهلة</span><strong>${formatNumber(tabMeta.skippedRows || 0)}</strong></div>
              <div class="mini-stat"><span>أعمدة مطابقة</span><strong>${formatNumber(mapped)}</strong></div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function contentHtml(state, filters) {
  const issues = filteredIssues(state, filters);
  const summary = summaryOf(issues);
  const totalRows =
    (state.data.orders?.length || 0) +
    (state.data.branches?.length || 0) +
    (state.data.cars?.length || 0);
  const affectedShare = totalRows > 0 ? (summary.affectedRows / totalRows) * 100 : null;
  const qualityClean = state.validation.summary.total === 0;

  const cards = [
    kpiCard({
      label: "إجمالي الملاحظات",
      value: formatNumber(summary.total),
      unit: "ملاحظة",
      note: "بعد تطبيق الفلاتر",
      iconName: "ShieldCheck",
      accent: true,
    }),
    kpiCard({
      label: "حرجة",
      value: formatNumber(summary.bySeverity.critical),
      unit: "ملاحظة",
      note: "تمنع الاعتماد على القيمة",
      iconName: "AlertTriangle",
    }),
    kpiCard({
      label: "تحذير",
      value: formatNumber(summary.bySeverity.warning),
      unit: "ملاحظة",
      note: "تحتاج مراجعة",
      iconName: "AlertCircle",
    }),
    kpiCard({
      label: "ملاحظة",
      value: formatNumber(summary.bySeverity.info),
      unit: "ملاحظة",
      note: "معلوماتية",
      iconName: "Info",
    }),
    kpiCard({
      label: "صفوف متأثرة",
      value: formatNumber(summary.affectedRows),
      unit: "صف",
      note: `من إجمالي ${formatNumber(totalRows)} صف`,
      iconName: "Database",
    }),
    kpiCard({
      label: "نسبة الصفوف المتأثرة",
      value: formatPercent(affectedShare),
      note: "على مستوى التابات الثلاثة",
      iconName: "Gauge",
    }),
  ];

  const rows = sortedIssues(issues);
  const columns = [
    {
      key: "severity",
      label: "الخطورة",
      render: (issue) => `<span class="severity is-${issue.severity}">${SEVERITY[issue.severity]?.label || issue.severity}</span>`,
    },
    {
      key: "tab",
      label: "التاب",
      render: (issue) => TAB_DEFINITIONS[issue.tab]?.label || issue.tab,
    },
    {
      key: "row",
      label: "الصف",
      numeric: true,
      render: (issue) => formatNumber(issue.row),
    },
    {
      key: "code",
      label: "الرمز",
      render: (issue) => `<span class="issue-code">${issue.code}</span>`,
    },
    {
      key: "field",
      label: "الحقل",
      render: (issue) => issue.fieldLabel || "—",
    },
    {
      key: "message",
      label: "الرسالة",
      sortable: false,
      render: (issue) => issue.message,
    },
    {
      key: "value",
      label: "القيمة",
      sortable: false,
      render: (issue) =>
        issue.value === null || issue.value === undefined || issue.value === ""
          ? "—"
          : `<span class="issue-code">${String(issue.value)}</span>`,
    },
  ];

  const passCard = qualityClean
    ? `
      <div class="quality-pass">
        <span class="quality-pass-icon">${icon("CheckCircle2", 22)}</span>
        <div>
          <h3>لا توجد ملاحظات جودة بيانات</h3>
          <p>كل السجلات المحملة اجتازت قواعد التحقق الحالية.</p>
        </div>
      </div>
    `
    : "";

  const tabNote = state.errors?.length
    ? `<div class="data-note is-warning">${icon("AlertTriangle", 14)}<span>${state.errors.map((error) => error.message).join(" · ")}</span></div>`
    : "";

  return `
    ${passCard}
    ${passCard ? '<div style="height:14px"></div>' : ""}
    ${kpiGrid(cards)}

    <div class="section">
      <div class="section-head">
        <div>
          <h3>تغطية التابات</h3>
          <p>عدد الصفوف المقروءة والمتجاهلة والأعمدة المطابقة لكل تاب.</p>
        </div>
      </div>
      <div class="grid-3 page-grid">${schemaCards(state)}</div>
    </div>

    <div class="section">
      ${tableCard({
        columns,
        rows,
        sort: ui.sort,
        page: ui.page,
        pageSize: ui.pageSize,
        title: "ملاحظات جودة البيانات",
        subtitle: "مرتبة حسب الخطورة افتراضيًا",
        emptyTitle: "لا توجد ملاحظات مطابقة",
        emptyText: "جرّب تغيير فلاتر الخطورة أو التاب أو البحث.",
        actions: `
          <button type="button" class="btn btn-secondary btn-sm" data-action="export-csv">${icon("Download", 14)} CSV</button>
          <button type="button" class="btn btn-secondary btn-sm" data-action="export-excel">${icon("FileSpreadsheet", 14)} Excel</button>
        `,
      })}
    </div>

    ${tabNote ? `<div class="section">${tabNote}</div>` : ""}
    ${
      !qualityClean && issues.length === 0
        ? `<div class="section">${emptyState({
            iconName: "Search",
            title: "لا توجد ملاحظات مطابقة للفلاتر",
            text: "غيّر فلاتر الخطورة أو التاب أو عبارة البحث.",
          })}</div>`
        : ""
    }
  `;
}

function bindContent(contentHost, issues, refresh) {
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

  const rows = () => sortedIssues(issues);
  contentHost.querySelector('[data-action="export-csv"]')?.addEventListener("click", () => {
    downloadCSV(`due-data-quality-${Date.now()}`, rows(), exportColumns());
  });
  contentHost.querySelector('[data-action="export-excel"]')?.addEventListener("click", () => {
    downloadExcel(`due-data-quality-${Date.now()}`, rows(), exportColumns());
  });
}

function mount(root, state) {
  const options = optionsFor();
  mountPage(root, {
    state,
    page: "data-quality",
    options,
    renderContent: (filters) => contentHtml(state, filters),
    mountContent: (contentHost, filters, refresh) => {
      bindContent(contentHost, filteredIssues(state, filters), refresh);
    },
  });
}

export function render(state) {
  const options = optionsFor();
  return pageScaffold({
    meta,
    filters: state.filters["data-quality"],
    options,
    page: "data-quality",
    actions: `<button type="button" class="btn btn-secondary" data-action="print">${icon("Printer", 16)} طباعة</button>`,
  });
}

export { mount };
