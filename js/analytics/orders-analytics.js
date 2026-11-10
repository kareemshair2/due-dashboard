import { sum } from "../utils/number-utils.js";

function quantityOf(rows) {
  return sum(rows.map((row) => row.quantity).filter((value) => Number.isFinite(value)));
}

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

export function summarizeOrders(rows) {
  const pickUpRows = rows.filter((row) => row.status === "PICK_UP");
  const holdRows = rows.filter((row) => row.status === "HOLD");
  const otherRows = rows.filter((row) => row.status !== "PICK_UP" && row.status !== "HOLD");
  const totalQuantity = quantityOf(rows);
  const pickUpQuantity = quantityOf(pickUpRows);
  const holdQuantity = quantityOf(holdRows);
  const otherQuantity = quantityOf(otherRows);
  const validRows = rows.filter((row) => Number.isFinite(row.quantity));

  const byStatus = [
    {
      key: "PICK_UP",
      label: "PICK UP",
      count: pickUpRows.length,
      quantity: pickUpQuantity,
    },
    {
      key: "HOLD",
      label: "HOLD",
      count: holdRows.length,
      quantity: holdQuantity,
    },
    {
      key: "OTHER",
      label: "أخرى",
      count: otherRows.length,
      quantity: otherQuantity,
    },
  ];

  const dayMap = groupBy(rows, (row) => row.date || "غير محدد");
  const byDay = [...dayMap.entries()]
    .map(([date, dayRows]) => ({
      date,
      count: dayRows.length,
      quantity: quantityOf(dayRows),
      pickUpQuantity: quantityOf(dayRows.filter((row) => row.status === "PICK_UP")),
      holdQuantity: quantityOf(dayRows.filter((row) => row.status === "HOLD")),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const customerMap = groupBy(rows, (row) => row.customer);
  const byCustomer = [...customerMap.entries()]
    .map(([customer, customerRows]) => ({
      customer,
      count: customerRows.length,
      quantity: quantityOf(customerRows),
    }))
    .sort((a, b) => b.quantity - a.quantity || b.count - a.count);

  return {
    rows,
    count: rows.length,
    totalQuantity,
    pickUpCount: pickUpRows.length,
    pickUpQuantity,
    holdCount: holdRows.length,
    holdQuantity,
    otherCount: otherRows.length,
    otherQuantity,
    averageQuantity: validRows.length ? totalQuantity / validRows.length : null,
    customersCount: customerMap.size,
    pickUpShare: totalQuantity > 0 ? (pickUpQuantity / totalQuantity) * 100 : null,
    holdShare: totalQuantity > 0 ? (holdQuantity / totalQuantity) * 100 : null,
    topCustomer: byCustomer[0] || null,
    byStatus,
    byDay,
    byCustomer,
  };
}
