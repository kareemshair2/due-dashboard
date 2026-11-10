import { icon } from "../utils/icons.js";
import { formatDateTime, formatRelativeTime } from "../utils/formatters.js";
import { downloadCSV } from "../utils/csv.js";
import { downloadExcel } from "../utils/excel.js";
import { showToast } from "../components/toast.js";
import {
  clearCachedData,
  setAutoRefresh,
  setDateOrder,
  setTheme,
} from "../store.js";

export const meta = {
  title: "الإعدادات",
  description:
    "ضبط المظهر والتحديث التلقائي وتفسير التواريخ ومصدر البيانات، مع أدوات التصدير والطباعة.",
};

const AUTO_OPTIONS = [
  { value: 0, label: "متوقف" },
  { value: 5, label: "كل 5 دقائق" },
  { value: 15, label: "كل 15 دقيقة" },
  { value: 30, label: "كل 30 دقيقة" },
  { value: 60, label: "كل ساعة" },
];

function exportColumns(key) {
  if (key === "orders") {
    return [
      { label: "التاريخ", value: (row) => row.date || "" },
      { label: "العميل", value: (row) => row.customer || "" },
      { label: "الحالة", value: (row) => row.statusRaw || "" },
      { label: "الكمية", value: (row) => row.quantity ?? "" },
      { label: "الصف", value: (row) => row.__row },
    ];
  }
  if (key === "branches") {
    return [
      { label: "التاريخ", value: (row) => row.date || "" },
      { label: "الفرع", value: (row) => row.branch || "" },
      { label: "عدد PICK UP", value: (row) => row.pickup ?? "" },
      { label: "استثنائي", value: (row) => (row.isExceptional ? "نعم" : "لا") },
      { label: "الصف", value: (row) => row.__row },
    ];
  }
  return [
    { label: "التاريخ", value: (row) => row.date || "" },
    { label: "الوردية", value: (row) => row.shift || "" },
    { label: "السائق", value: (row) => row.driver || "" },
    { label: "العربة", value: (row) => row.vehicle || "" },
    { label: "عداد الاستلام", value: (row) => row.start ?? "" },
    { label: "عداد التسليم", value: (row) => row.end ?? "" },
    { label: "المسافة المحسوبة", value: (row) => row.distance ?? "" },
    { label: "الوقود", value: (row) => row.fuel ?? "" },
    { label: "التكلفة", value: (row) => row.cost ?? "" },
    { label: "الصف", value: (row) => row.__row },
  ];
}

function settingsHead(state) {
  return `
    <div class="page-head">
      <div class="page-head-copy">
        <h2>${meta.title}</h2>
        <p>${meta.description}</p>
      </div>
      <div class="page-head-actions">
        <button type="button" class="btn btn-secondary" data-action="refresh">${icon("RefreshCw", 16)} تحديث الآن</button>
        <button type="button" class="btn btn-secondary" data-action="print">${icon("Printer", 16)} طباعة</button>
      </div>
    </div>
  `;
}

function appearanceCard(state) {
  return `
    <section class="settings-card">
      <div class="settings-card-head">
        <h3>المظهر</h3>
        <p>اختر نمط العرض المناسب لبيئة العمل.</p>
      </div>
      <div class="settings-card-body">
        <div class="form-row">
          <div class="form-row-copy">
            <strong>نمط الألوان</strong>
            <span>الوضع الفاتح أو الداكن.</span>
          </div>
          <div class="segmented" role="group" aria-label="نمط الألوان">
            <button type="button" class="${state.theme === "light" ? "is-active" : ""}" data-theme-set="light">${icon("Sun", 13)} فاتح</button>
            <button type="button" class="${state.theme === "dark" ? "is-active" : ""}" data-theme-set="dark">${icon("Moon", 13)} داكن</button>
          </div>
        </div>
        <div class="form-row">
          <div class="form-row-copy">
            <strong>القائمة الجانبية</strong>
            <span>تصغير القائمة على الشاشات الكبيرة.</span>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" data-action="collapse-sidebar">${icon("ChevronsUpDown", 14)} ${state.sidebarCollapsed ? "توسيع" : "تصغير"}</button>
        </div>
      </div>
    </section>
  `;
}

function sourceCard(state) {
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${state.config.spreadsheetId}/edit`;
  return `
    <section class="settings-card">
      <div class="settings-card-head">
        <h3>مصدر البيانات</h3>
        <p>اتصال قراءة فقط بمصدر Google Sheets.</p>
      </div>
      <div class="settings-card-body">
        <div class="source-summary">
          <div class="source-summary-item"><span>المزوّد</span><strong>${state.providerName}</strong></div>
          <div class="source-summary-item"><span>حالة الاتصال</span><strong>${
            state.status === "ready"
              ? "متصل"
              : state.status === "stale"
                ? "نسخة محفوظة"
                : state.status === "error"
                  ? "تعذر الاتصال"
                  : "جارٍ التحديث"
          }</strong></div>
          <div class="source-summary-item"><span>آخر تحديث</span><strong>${formatDateTime(state.fetchedAt)}</strong></div>
          <div class="source-summary-item"><span>منذ</span><strong>${formatRelativeTime(state.fetchedAt)}</strong></div>
        </div>
        <div class="form-row">
          <div class="form-row-copy">
            <strong>Spreadsheet ID</strong>
            <span><code>${state.config.spreadsheetId}</code></span>
          </div>
          <a class="btn btn-secondary btn-sm" href="${spreadsheetUrl}" target="_blank" rel="noopener noreferrer">${icon("ExternalLink", 14)} فتح</a>
        </div>
        <div class="form-row">
          <div class="form-row-copy">
            <strong>رابط Apps Script</strong>
            <span>${state.config.appsScriptUrl ? "مضبوط في الإعدادات" : "غير مضبوط — الوضع الحالي gviz للقراءة العامة"}</span>
          </div>
          <span class="badge ${state.config.appsScriptUrl ? "badge-success" : "badge-warning"}">${state.config.appsScriptUrl ? "مضبوط" : "غير مضبوط"}</span>
        </div>
        <div class="setting-note">
          التابات المقروءة:
          <strong>${state.config.sheetNames.orders}</strong>،
          <strong>${state.config.sheetNames.branches}</strong>،
          <strong>${state.config.sheetNames.cars}</strong>.
          اللوحة لا تنفذ أي عملية كتابة على الشيت.
        </div>
        <div class="form-row">
          <div class="form-row-copy">
            <strong>الكاش المحلي</strong>
            <span>يُستخدم عند تعذر التحديث من المصدر.</span>
          </div>
          <button type="button" class="btn btn-danger btn-sm" data-action="clear-cache">${icon("RotateCcw", 14)} مسح الكاش</button>
        </div>
      </div>
    </section>
  `;
}

function refreshCard(state) {
  return `
    <section class="settings-card">
      <div class="settings-card-head">
        <h3>التحديث وتفسير البيانات</h3>
        <p>ضبط التحديث التلقائي وطريقة قراءة التواريخ.</p>
      </div>
      <div class="settings-card-body">
        <div class="form-row">
          <div class="form-row-copy">
            <strong>التحديث التلقائي</strong>
            <span>إعادة تحميل البيانات من المصدر دوريًا.</span>
          </div>
          <select class="select" data-setting="auto-refresh">
            ${AUTO_OPTIONS.map(
              (option) =>
                `<option value="${option.value}"${Number(state.settings.autoRefreshMinutes) === option.value ? " selected" : ""}>${option.label}</option>`,
            ).join("")}
          </select>
        </div>
        <div class="form-row">
          <div class="form-row-copy">
            <strong>ترتيب التاريخ</strong>
            <span>الشيت يستخدم <code>M/d/yyyy</code>. التفسير الحالي: ${state.settings.dateOrder === "MDY" ? "شهر/يوم/سنة" : "يوم/شهر/سنة"}.</span>
          </div>
          <select class="select" data-setting="date-order">
            <option value="DMY"${state.settings.dateOrder === "DMY" ? " selected" : ""}>يوم/شهر/سنة</option>
            <option value="MDY"${state.settings.dateOrder === "MDY" ? " selected" : ""}>شهر/يوم/سنة</option>
          </select>
        </div>
        <div class="setting-note">
          تغيير ترتيب التاريخ يعيد قراءة السجلات من الكاش ثم يحدّثها من المصدر. راجع تواريخ السجلات بعد التغيير للتأكد من التفسير الصحيح.
        </div>
      </div>
    </section>
  `;
}

function exportCard(state) {
  const rows = [
    { key: "orders", label: "الطلبات", count: state.data.orders.length },
    { key: "branches", label: "الفروع والوكلاء", count: state.data.branches.length },
    { key: "cars", label: "العربات", count: state.data.cars.length },
  ];
  return `
    <section class="settings-card">
      <div class="settings-card-head">
        <h3>التصدير</h3>
        <p>تصدير كل السجلات المحملة دون فلاتر الصفحات.</p>
      </div>
      <div class="settings-card-body">
        ${rows
          .map(
            (row) => `
              <div class="form-row">
                <div class="form-row-copy">
                  <strong>${row.label}</strong>
                  <span>${row.count} سجل</span>
                </div>
                <div class="card-actions">
                  <button type="button" class="btn btn-secondary btn-sm" data-export="csv" data-export-key="${row.key}">${icon("Download", 14)} CSV</button>
                  <button type="button" class="btn btn-secondary btn-sm" data-export="excel" data-export-key="${row.key}">${icon("FileSpreadsheet", 14)} Excel</button>
                </div>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function aboutCard(state) {
  return `
    <section class="settings-card">
      <div class="settings-card-head">
        <h3>حول اللوحة</h3>
        <p>DUE — Delivery Ultimate Express Operations Intelligence.</p>
      </div>
      <div class="settings-card-body">
        <div class="form-row">
          <div class="form-row-copy">
            <strong>الإصدار</strong>
            <span>1.0.0 · قراءة فقط</span>
          </div>
          <span class="badge badge-orange">DUE</span>
        </div>
        <div class="setting-note">
          هذه اللوحة لا تكتب في Google Sheets ولا ترسل بيانات إلى أي خدمة خارجية غير مصدر البيانات نفسه. جميع المؤشرات محسوبة من السجلات المحملة دون تعليقات أو توصيات.
        </div>
        <div class="form-row">
          <div class="form-row-copy">
            <strong>الشعار</strong>
            <span>يُستخدم شعار مؤقت حتى توفير ملف الشعار الرسمي.</span>
          </div>
          <img src="./logo.svg" alt="DUE" width="40" height="40" style="border-radius:12px" />
        </div>
      </div>
    </section>
  `;
}

function contentHtml(state) {
  return `
    ${settingsHead(state)}
    <div class="settings-grid">
      ${appearanceCard(state)}
      ${sourceCard(state)}
      ${refreshCard(state)}
      ${exportCard(state)}
      ${aboutCard(state)}
    </div>
  `;
}

function bind(root, state) {
  root.querySelectorAll("[data-theme-set]").forEach((button) => {
    button.addEventListener("click", () => setTheme(button.dataset.themeSet));
  });

  root.querySelector('[data-setting="auto-refresh"]')?.addEventListener("change", (event) => {
    const minutes = Number(event.target.value) || 0;
    setAutoRefresh(minutes);
    showToast(
      "success",
      "تم تحديث إعداد التحديث التلقائي",
      minutes > 0 ? `كل ${minutes} دقيقة` : "التحديث التلقائي متوقف",
    );
  });

  root.querySelector('[data-setting="date-order"]')?.addEventListener("change", async (event) => {
    const select = event.target;
    select.disabled = true;
    await setDateOrder(select.value);
    select.disabled = false;
  });

  root.querySelector('[data-action="clear-cache"]')?.addEventListener("click", async () => {
    await clearCachedData();
  });

  root.querySelectorAll("[data-export]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.exportKey;
      const data = state.data[key] || [];
      const filename = `due-${key}-all-${Date.now()}`;
      if (button.dataset.export === "excel") {
        downloadExcel(filename, data, exportColumns(key));
      } else {
        downloadCSV(filename, data, exportColumns(key));
      }
      showToast("success", "تم بدء التصدير", `${data.length} سجل`);
    });
  });
}

export function render(state) {
  return contentHtml(state);
}

export function mount(root, state) {
  bind(root, state);
}
