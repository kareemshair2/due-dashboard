import { FIELD_LABELS, SEVERITY, normalizeKey, statusLabel } from "./schema.js";

let issueCounter = 0;

function makeIssue({ tab, row, code, severity, field, value, message, record }) {
  issueCounter += 1;
  return {
    id: `${tab}-${row}-${code}-${issueCounter}`,
    tab,
    row,
    code,
    severity,
    field,
    fieldLabel: FIELD_LABELS[field] || field,
    value: value === undefined ? null : value,
    message,
    record,
  };
}

function duplicateIssues(rows, keyFn, tab, code) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const issues = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (const row of group) {
      const others = group.filter((item) => item !== row).map((item) => item.__row);
      issues.push(
        makeIssue({
          tab,
          row: row.__row,
          code,
          severity: "warning",
          field: "date",
          value: row.date,
          message: `قد يكون السجل مكررًا مع الصف ${others.join("، ")}.`,
          record: row,
        }),
      );
    }
  }
  return issues;
}

export function validateOrders(rows) {
  const issues = [];
  for (const row of rows) {
    if (!row.date) {
      issues.push(
        makeIssue({
          tab: "orders",
          row: row.__row,
          code: "ORD_MISSING_DATE",
          severity: "critical",
          field: "date",
          value: row.dateRaw,
          message: "تاريخ الطلب مفقود أو غير صالح.",
          record: row,
        }),
      );
    } else if (row.dateAmbiguous) {
      issues.push(
        makeIssue({
          tab: "orders",
          row: row.__row,
          code: "ORD_AMBIGUOUS_DATE",
          severity: "info",
          field: "date",
          value: row.dateRaw,
          message: "تنسيق التاريخ غامض وتم تفسيره حسب إعداد DMY/MDY.",
          record: row,
        }),
      );
    }

    if (!row.customer) {
      issues.push(
        makeIssue({
          tab: "orders",
          row: row.__row,
          code: "ORD_MISSING_CUSTOMER",
          severity: "warning",
          field: "customer",
          value: row.customerRaw,
          message: "اسم العميل مفقود.",
          record: row,
        }),
      );
    }

    if (!row.statusRaw || String(row.statusRaw).trim() === "") {
      issues.push(
        makeIssue({
          tab: "orders",
          row: row.__row,
          code: "ORD_MISSING_STATUS",
          severity: "warning",
          field: "status",
          value: row.statusRaw,
          message: "حالة الطلب مفقودة.",
          record: row,
        }),
      );
    } else if (row.status === "OTHER") {
      issues.push(
        makeIssue({
          tab: "orders",
          row: row.__row,
          code: "ORD_UNKNOWN_STATUS",
          severity: "warning",
          field: "status",
          value: row.statusRaw,
          message: `حالة غير معروفة: ${row.statusRaw}.`,
          record: row,
        }),
      );
    }

    if (row.quantity === null) {
      issues.push(
        makeIssue({
          tab: "orders",
          row: row.__row,
          code: "ORD_INVALID_QTY",
          severity: "warning",
          field: "quantity",
          value: row.quantityRaw,
          message: "الكمية مفقودة أو غير رقمية.",
          record: row,
        }),
      );
    } else if (row.quantity < 0) {
      issues.push(
        makeIssue({
          tab: "orders",
          row: row.__row,
          code: "ORD_NEGATIVE_QTY",
          severity: "critical",
          field: "quantity",
          value: row.quantity,
          message: "الكمية سالبة وتحتاج مراجعة.",
          record: row,
        }),
      );
    }
  }

  issues.push(
    ...duplicateIssues(
      rows,
      (row) => `${row.date || ""}|${normalizeKey(row.customer)}|${row.status || ""}|${row.quantity ?? ""}`,
      "orders",
      "ORD_DUPLICATE",
    ),
  );
  return issues;
}

export function validateBranches(rows) {
  const issues = [];
  for (const row of rows) {
    if (!row.date) {
      issues.push(
        makeIssue({
          tab: "branches",
          row: row.__row,
          code: "BR_MISSING_DATE",
          severity: "critical",
          field: "date",
          value: row.dateRaw,
          message: "تاريخ سجل الفرع مفقود أو غير صالح.",
          record: row,
        }),
      );
    } else if (row.dateAmbiguous) {
      issues.push(
        makeIssue({
          tab: "branches",
          row: row.__row,
          code: "BR_AMBIGUOUS_DATE",
          severity: "info",
          field: "date",
          value: row.dateRaw,
          message: "تنسيق التاريخ غامض وتم تفسيره حسب إعداد DMY/MDY.",
          record: row,
        }),
      );
    }

    if (!row.branch) {
      issues.push(
        makeIssue({
          tab: "branches",
          row: row.__row,
          code: "BR_MISSING_BRANCH",
          severity: "critical",
          field: "branch",
          value: row.branchRaw,
          message: "اسم الفرع مفقود.",
          record: row,
        }),
      );
    }

    if (row.pickup === null) {
      issues.push(
        makeIssue({
          tab: "branches",
          row: row.__row,
          code: "BR_INVALID_PICKUP",
          severity: "warning",
          field: "pickup",
          value: row.pickupRaw,
          message: "عدد PICK UP مفقود أو غير رقمي.",
          record: row,
        }),
      );
    } else if (row.pickup < 0) {
      issues.push(
        makeIssue({
          tab: "branches",
          row: row.__row,
          code: "BR_NEGATIVE_PICKUP",
          severity: "critical",
          field: "pickup",
          value: row.pickup,
          message: "عدد PICK UP سالب ويحتاج مراجعة.",
          record: row,
        }),
      );
    }

    if (row.isExceptional) {
      issues.push(
        makeIssue({
          tab: "branches",
          row: row.__row,
          code: "BR_EXCEPTIONAL",
          severity: "info",
          field: "branch",
          value: row.branch,
          message: `سجل استثنائي (${row.branch}) لا يُحتسب كفرع في مؤشرات الفروع.`,
          record: row,
        }),
      );
    }
  }

  issues.push(
    ...duplicateIssues(
      rows,
      (row) => `${row.date || ""}|${row.branchNorm || ""}|${row.pickup ?? ""}`,
      "branches",
      "BR_DUPLICATE",
    ),
  );
  return issues;
}

export function validateCars(rows) {
  const issues = [];
  for (const row of rows) {
    if (!row.date) {
      issues.push(
        makeIssue({
          tab: "cars",
          row: row.__row,
          code: "CAR_MISSING_DATE",
          severity: "critical",
          field: "date",
          value: row.dateRaw,
          message: "تاريخ السجل مفقود أو غير صالح.",
          record: row,
        }),
      );
    } else if (row.dateAmbiguous) {
      issues.push(
        makeIssue({
          tab: "cars",
          row: row.__row,
          code: "CAR_AMBIGUOUS_DATE",
          severity: "info",
          field: "date",
          value: row.dateRaw,
          message: "تنسيق التاريخ غامض وتم تفسيره حسب إعداد DMY/MDY.",
          record: row,
        }),
      );
    }

    if (!row.driver) {
      issues.push(
        makeIssue({
          tab: "cars",
          row: row.__row,
          code: "CAR_MISSING_DRIVER",
          severity: "warning",
          field: "driver",
          value: row.raw?.driver,
          message: "اسم السائق مفقود.",
          record: row,
        }),
      );
    }

    if (!row.vehicle) {
      issues.push(
        makeIssue({
          tab: "cars",
          row: row.__row,
          code: "CAR_MISSING_VEHICLE",
          severity: "warning",
          field: "vehicle",
          value: row.raw?.vehicle,
          message: "اسم العربة مفقود.",
          record: row,
        }),
      );
    }

    if (row.start === null) {
      issues.push(
        makeIssue({
          tab: "cars",
          row: row.__row,
          code: "CAR_MISSING_START",
          severity: "warning",
          field: "start",
          value: row.raw?.start,
          message: "عداد استلام العربية مفقود.",
          record: row,
        }),
      );
    } else if (row.start < 0) {
      issues.push(
        makeIssue({
          tab: "cars",
          row: row.__row,
          code: "CAR_NEGATIVE_START",
          severity: "critical",
          field: "start",
          value: row.start,
          message: "عداد الاستلام سالب.",
          record: row,
        }),
      );
    }

    if (row.end === null) {
      issues.push(
        makeIssue({
          tab: "cars",
          row: row.__row,
          code: "CAR_MISSING_END",
          severity: "warning",
          field: "end",
          value: row.raw?.end,
          message: "عداد تسليم العربية مفقود.",
          record: row,
        }),
      );
    } else if (row.end < 0) {
      issues.push(
        makeIssue({
          tab: "cars",
          row: row.__row,
          code: "CAR_NEGATIVE_END",
          severity: "critical",
          field: "end",
          value: row.end,
          message: "عداد التسليم سالب.",
          record: row,
        }),
      );
    }

    if (row.isEndBeforeStart) {
      issues.push(
        makeIssue({
          tab: "cars",
          row: row.__row,
          code: "CAR_END_BEFORE_START",
          severity: "critical",
          field: "end",
          value: row.end,
          message: `عداد التسليم (${row.end}) أقل من عداد الاستلام (${row.start}).`,
          record: row,
        }),
      );
    }

    if (row.isZeroReading) {
      issues.push(
        makeIssue({
          tab: "cars",
          row: row.__row,
          code: "CAR_ZERO_READINGS",
          severity: "warning",
          field: "start",
          value: 0,
          message: "قراءتا العداد صفر — لا تُعتبر رحلة فعلية.",
          record: row,
        }),
      );
    }

    if (row.kmRaw !== null && row.kmRaw < 0) {
      issues.push(
        makeIssue({
          tab: "cars",
          row: row.__row,
          code: "CAR_NEGATIVE_KM_RAW",
          severity: "warning",
          field: "km",
          value: row.kmRaw,
          message: "عمود عدد الكيلوات يحتوي على قيمة سالبة.",
          record: row,
        }),
      );
    }

    if (row.fuel !== null && row.fuel < 0) {
      issues.push(
        makeIssue({
          tab: "cars",
          row: row.__row,
          code: "CAR_NEGATIVE_FUEL",
          severity: "critical",
          field: "fuel",
          value: row.fuel,
          message: "لترات الوقود سالبة.",
          record: row,
        }),
      );
    }

    if (row.cost !== null && row.cost < 0) {
      issues.push(
        makeIssue({
          tab: "cars",
          row: row.__row,
          code: "CAR_NEGATIVE_COST",
          severity: "critical",
          field: "cost",
          value: row.cost,
          message: "التكلفة سالبة.",
          record: row,
        }),
      );
    }

    if (row.hasFuelWithoutDistance) {
      issues.push(
        makeIssue({
          tab: "cars",
          row: row.__row,
          code: "CAR_FUEL_WITHOUT_DISTANCE",
          severity: "warning",
          field: "fuel",
          value: row.fuel,
          message: "يوجد وقود بدون مسافة صالحة — لا يمكن حساب كفاءة الوقود.",
          record: row,
        }),
      );
    }

    if (row.hasCostWithoutDistance) {
      issues.push(
        makeIssue({
          tab: "cars",
          row: row.__row,
          code: "CAR_COST_WITHOUT_DISTANCE",
          severity: "warning",
          field: "cost",
          value: row.cost,
          message: "توجد تكلفة بدون مسافة صالحة — لا يمكن حساب التكلفة لكل كيلومتر.",
          record: row,
        }),
      );
    }

    if (row.kmMismatch !== null && Math.abs(row.kmMismatch) > 1) {
      issues.push(
        makeIssue({
          tab: "cars",
          row: row.__row,
          code: "CAR_KM_MISMATCH",
          severity: "warning",
          field: "km",
          value: row.kmRaw,
          message: `عدد الكيلوات المسجل (${row.kmRaw}) يختلف عن المسافة المحسوبة (${row.distance}).`,
          record: row,
        }),
      );
    }
  }

  issues.push(
    ...duplicateIssues(
      rows,
      (row) =>
        `${row.date || ""}|${row.shift || ""}|${normalizeKey(row.driver)}|${normalizeKey(row.vehicle)}|${row.start ?? ""}|${row.end ?? ""}`,
      "cars",
      "CAR_DUPLICATE",
    ),
  );
  return issues;
}

export function validateAll(data) {
  const issues = [
    ...validateOrders(data.orders || []),
    ...validateBranches(data.branches || []),
    ...validateCars(data.cars || []),
  ].sort((a, b) => {
    const rank = (SEVERITY[a.severity]?.rank ?? 9) - (SEVERITY[b.severity]?.rank ?? 9);
    if (rank !== 0) return rank;
    return a.tab.localeCompare(b.tab) || a.row - b.row;
  });

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

  return {
    issues,
    summary: {
      total: issues.length,
      bySeverity,
      byTab,
      byCode,
      affectedRows: affected.size,
    },
  };
}

export function statusText(issue) {
  if (issue.tab === "orders") return statusLabel(issue.record?.status);
  return "";
}
