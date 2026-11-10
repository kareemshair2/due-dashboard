import { icon } from "../utils/icons.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function compareValues(a, b) {
  if (a === b) return 0;
  if (a === null || a === undefined || a === "") return 1;
  if (b === null || b === undefined || b === "") return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "ar", { numeric: true });
}

export function sortRows(rows, sort, columns) {
  if (!sort?.key) return rows;
  const column = columns.find((item) => item.key === sort.key);
  const getter = column?.sortValue || ((row) => row[column?.key]);
  const direction = sort.dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => compareValues(getter(a), getter(b)) * direction);
}

export function pageSizeValue(pageSize) {
  return pageSize === "all" ? Number.MAX_SAFE_INTEGER : Number(pageSize) || 10;
}

export function paginate(rows, page, pageSize) {
  const size = pageSizeValue(pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / size));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (safePage - 1) * size;
  return {
    rows: rows.slice(start, start + size),
    page: safePage,
    totalPages,
    start: rows.length ? start + 1 : 0,
    end: Math.min(start + size, rows.length),
  };
}

function renderPagination({ page, totalPages, start, end, total, pageSize }) {
  if (total === 0) return "";
  const buttons = [];
  const from = Math.max(1, Math.min(page - 2, totalPages - 4));
  const to = Math.min(totalPages, from + 4);
  for (let index = from; index <= to; index += 1) {
    buttons.push(
      `<button type="button" class="page-btn${index === page ? " is-active" : ""}" data-page="${index}">${index}</button>`,
    );
  }
  return `
    <div class="table-pagination">
      <span class="page-info">عرض <strong>${start}–${end}</strong> من <strong>${total}</strong></span>
      <div class="page-controls">
        <button type="button" class="page-btn" data-page="${page - 1}"${page <= 1 ? " disabled" : ""} aria-label="السابق">${icon("ChevronRight", 13)}</button>
        ${buttons.join("")}
        <button type="button" class="page-btn" data-page="${page + 1}"${page >= totalPages ? " disabled" : ""} aria-label="التالي">${icon("ChevronLeft", 13)}</button>
      </div>
      <label class="page-size">
        صفوف
        <select class="select" data-page-size>
          ${[10, 25, 50, 100]
            .map(
              (size) =>
                `<option value="${size}"${String(pageSize) === String(size) ? " selected" : ""}>${size}</option>`,
            )
            .join("")}
          <option value="all"${pageSize === "all" ? " selected" : ""}>الكل</option>
        </select>
      </label>
    </div>
  `;
}

/**
 * @param {{
 *   columns: any[],
 *   rows: any[],
 *   sort?: any,
 *   page?: number,
 *   pageSize?: number | "all",
 *   title?: string,
 *   subtitle?: string,
 *   actions?: string,
 *   emptyTitle?: string,
 *   emptyText?: string,
 * }} options
 */
export function tableCard({
  columns,
  rows,
  sort = null,
  page = 1,
  pageSize = 10,
  title = "",
  subtitle = "",
  actions = "",
  emptyTitle = "لا توجد سجلات",
  emptyText = "لا توجد بيانات مطابقة للفلاتر الحالية.",
}) {
  const pagination = paginate(rows, page, pageSize);
  const header = columns
    .map((column) => {
      const active = sort?.key === column.key;
      const iconName = active ? (sort.dir === "desc" ? "ChevronDown" : "ChevronUp") : "ChevronsUpDown";
      return `
        <th class="${column.numeric ? "is-numeric" : ""}${column.center ? " is-center" : ""}${column.sticky ? " sticky-col" : ""}">
          ${
            column.sortable === false
              ? escapeHtml(column.label)
              : `<button type="button" class="th-sort${active ? " is-active" : ""}" data-sort-key="${column.key}">${escapeHtml(column.label)}${icon(iconName, 11)}</button>`
          }
        </th>
      `;
    })
    .join("");

  const body = pagination.rows.length
    ? pagination.rows
        .map(
          (row) => `
            <tr>
              ${columns
                .map((column) => {
                  const value = column.render
                    ? column.render(row)
                    : escapeHtml(row[column.key] ?? "—");
                  return `<td class="${column.numeric ? "is-numeric" : ""}${column.center ? " is-center" : ""}${column.sticky ? " sticky-col" : ""}">${value}</td>`;
                })
                .join("")}
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="${columns.length}"><div class="table-empty"><strong>${emptyTitle}</strong><div>${emptyText}</div></div></td></tr>`;

  return `
    <div class="table-card">
      <div class="table-toolbar">
        <div class="table-meta">
          ${title ? `<strong>${title}</strong>` : ""}
          ${subtitle ? `<span>${subtitle}</span>` : ""}
          <span>· ${rows.length} سجل</span>
        </div>
        ${actions ? `<div class="table-actions">${actions}</div>` : ""}
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr>${header}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${renderPagination({ ...pagination, total: rows.length, pageSize })}
    </div>
  `;
}
