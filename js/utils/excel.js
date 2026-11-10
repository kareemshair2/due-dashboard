function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function cellValue(row, column) {
  if (typeof column.value === "function") return column.value(row);
  return row[column.key];
}

export function downloadExcel(filename, rows, columns) {
  const header = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((column) => {
            const value = cellValue(row, column);
            const numeric = typeof value === "number";
            return `<td${numeric ? ' style="mso-number-format:\\@"' : ""}>${escapeHtml(value ?? "")}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");

  const html = `\uFEFF<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" /><style>table{border-collapse:collapse}th,td{border:1px solid #d9d9d9;padding:4px 8px;font-family:Arial,sans-serif;font-size:11pt;text-align:right}th{background:#f2f2f2}</style></head><body dir="rtl"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
