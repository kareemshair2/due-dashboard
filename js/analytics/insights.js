import {
  formatCurrency,
  formatDate,
  formatDecimal,
  formatNumber,
  formatPercent,
} from "../utils/formatters.js";

function text(parts) {
  return parts.filter(Boolean).join(" ");
}

/** @param {{ orders?: any, branches?: any, cars?: any, validation?: any, meta?: any }} input */
export function buildInsights({ orders, branches, cars, validation, meta }) {
  const insights = [];

  if (orders && orders.count > 0) {
    if (Number.isFinite(orders.pickUpShare)) {
      insights.push({
        id: "orders-pickup-share",
        severity: "info",
        icon: "Package",
        title: "توزيع الكمية حسب الحالة",
        text: text([
          "كمية PICK UP",
          `<strong>${formatNumber(orders.pickUpQuantity)}</strong>`,
          "من إجمالي",
          `<strong>${formatNumber(orders.totalQuantity)}</strong>`,
          `(${formatPercent(orders.pickUpShare)}).`,
        ]),
      });
    }

    if (orders.holdQuantity > 0) {
      insights.push({
        id: "orders-hold",
        severity: "warning",
        icon: "AlertTriangle",
        title: "طلبات HOLD",
        text: text([
          `يوجد <strong>${formatNumber(orders.holdCount)}</strong> طلب HOLD بكمية`,
          `<strong>${formatNumber(orders.holdQuantity)}</strong>`,
          `تمثل ${formatPercent(orders.holdShare)} من إجمالي الكمية.`,
        ]),
      });
    }

    if (orders.topCustomer && orders.totalQuantity > 0) {
      const share = (orders.topCustomer.quantity / orders.totalQuantity) * 100;
      insights.push({
        id: "orders-top-customer",
        severity: share >= 50 ? "warning" : "info",
        icon: "Users",
        title: "أكبر عميل بالكمية",
        text: text([
          `<strong>${orders.topCustomer.customer}</strong>`,
          `بكمية <strong>${formatNumber(orders.topCustomer.quantity)}</strong>`,
          `تمثل ${formatPercent(share)} من إجمالي الكمية.`,
        ]),
      });
    }

    if (Number.isFinite(orders.averageQuantity)) {
      insights.push({
        id: "orders-average",
        severity: "info",
        icon: "TrendingUp",
        title: "متوسط الكمية لكل طلب",
        text: `<strong>${formatDecimal(orders.averageQuantity)}</strong> وحدة لكل طلب على ${formatNumber(orders.count)} طلب.`,
      });
    }
  }

  if (branches && branches.count > 0) {
    if (branches.top && branches.totalPickup > 0) {
      insights.push({
        id: "branches-top",
        severity: "info",
        icon: "Building2",
        title: "أعلى فرع في PICK UP",
        text: text([
          `<strong>${branches.top.branch}</strong>`,
          `بعدد <strong>${formatNumber(branches.top.pickup)}</strong>`,
          `بنسبة ${formatPercent(branches.top.share)} من إجمالي PICK UP للفروع.`,
        ]),
      });
    }

    if (branches.zeroCount > 0) {
      insights.push({
        id: "branches-zero",
        severity: "warning",
        icon: "GitBranch",
        title: "فروع بدون PICK UP",
        text: text([
          `يوجد <strong>${formatNumber(branches.zeroCount)}</strong> فرع بقيمة صفر:`,
          branches.zero.map((item) => item.branch).join("، "),
          ".",
        ]),
      });
    }

    if (branches.exceptionalRows?.length) {
      const names = [...new Set(branches.exceptionalRows.map((row) => row.branch))].join("، ");
      insights.push({
        id: "branches-exceptional",
        severity: "info",
        icon: "AlertCircle",
        title: "سجل استثنائي مستبعد",
        text: text([
          `تم استبعاد سجل <strong>${names}</strong> من مؤشرات الفروع،`,
          `بقيمة <strong>${formatNumber(branches.exceptionalTotal)}</strong>`,
          "ويظهر منفصلًا كاستثناء.",
        ]),
      });
    }
  }

  if (cars && cars.records > 0) {
    if (cars.invalidCount > 0) {
      insights.push({
        id: "cars-invalid",
        severity: "warning",
        icon: "Car",
        title: "سجلات عداد غير صالحة",
        text: text([
          `يوجد <strong>${formatNumber(cars.invalidCount)}</strong> سجل بقراءات عداد غير صالحة`,
          "من إجمالي",
          `<strong>${formatNumber(cars.records)}</strong> سجل، ولا تدخل في حساب المسافة.`,
        ]),
      });
    }

    if (cars.tripCount > 0) {
      insights.push({
        id: "cars-distance",
        severity: "info",
        icon: "Route",
        title: "المسافة والرحلات",
        text: text([
          `تم احتساب <strong>${formatNumber(cars.tripCount)}</strong> رحلة صالحة`,
          `بإجمالي <strong>${formatNumber(cars.totalDistance)}</strong> كم`,
          `ومتوسط <strong>${formatDecimal(cars.averageTrip)}</strong> كم لكل رحلة.`,
        ]),
      });
    }

    if (Number.isFinite(cars.efficiency)) {
      insights.push({
        id: "cars-efficiency",
        severity: "info",
        icon: "Fuel",
        title: "كفاءة الوقود",
        text: text([
          `متوسط الكفاءة المحسوب <strong>${formatDecimal(cars.efficiency)}</strong> كم/لتر`,
          `على <strong>${formatNumber(cars.totalFuel)}</strong> لتر في الرحلات الصالحة.`,
        ]),
      });
    }

    if (Number.isFinite(cars.totalCost) && cars.totalCost > 0) {
      insights.push({
        id: "cars-cost",
        severity: "info",
        icon: "CircleDollarSign",
        title: "تكلفة التشغيل",
        text: text([
          `إجمالي التكلفة <strong>${formatCurrency(cars.totalCost)}</strong>`,
          Number.isFinite(cars.costPerKm)
            ? `بمتوسط ${formatDecimal(cars.costPerKm, "—")} ج.م لكل كم.`
            : ".",
        ]),
      });
    }
  }

  if (validation?.summary) {
    const { total, bySeverity } = validation.summary;
    insights.push({
      id: "quality-summary",
      severity: bySeverity.critical > 0 ? "critical" : total > 0 ? "warning" : "success",
      icon: bySeverity.critical > 0 ? "AlertTriangle" : total > 0 ? "ShieldCheck" : "CheckCircle2",
      title: "جودة البيانات",
      text:
        total === 0
          ? "لا توجد ملاحظات جودة بيانات على السجلات المحملة."
          : text([
              `إجمالي الملاحظات <strong>${formatNumber(total)}</strong>`,
              `(حرجة: ${formatNumber(bySeverity.critical)}،`,
              `تحذير: ${formatNumber(bySeverity.warning)}،`,
              `ملاحظة: ${formatNumber(bySeverity.info)}).`,
            ]),
    });
  }

  if (meta) {
    const dates = [
      ...(meta.orders?.dates || []),
      ...(meta.branches?.dates || []),
      ...(meta.cars?.dates || []),
    ]
      .filter(Boolean)
      .sort();
    if (dates.length) {
      const unique = [...new Set(dates)];
      insights.push({
        id: "coverage-dates",
        severity: "info",
        icon: "CalendarDays",
        title: "نطاق التواريخ في البيانات",
        text:
          unique.length === 1
            ? `كل السجلات المحملة بتاريخ <strong>${formatDate(unique[0])}</strong>.`
            : `السجلات تغطي من <strong>${formatDate(unique[0])}</strong> إلى <strong>${formatDate(unique[unique.length - 1])}</strong> (${formatNumber(unique.length)} يوم).`,
      });
    }
  }

  const order = { critical: 0, warning: 1, info: 2, success: 3 };
  return insights.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
}
