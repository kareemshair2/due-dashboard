import { sum } from "../utils/number-utils.js";

export function summarizeBranches(rows, exceptionalRows = []) {
  const totalPickup = sum(
    rows.map((row) => row.pickup).filter((value) => Number.isFinite(value)),
  );

  const list = rows
    .map((row) => {
      const pickup = Number.isFinite(row.pickup) ? row.pickup : 0;
      return {
        row,
        branch: row.branch || "غير محدد",
        pickup,
        share: totalPickup > 0 ? (pickup / totalPickup) * 100 : null,
      };
    })
    .sort((a, b) => b.pickup - a.pickup || a.branch.localeCompare(b.branch, "ar"));

  const active = list.filter((item) => item.pickup > 0);
  const zero = list.filter((item) => item.pickup <= 0);
  const exceptionalTotal = sum(
    exceptionalRows.map((row) => row.pickup).filter((value) => Number.isFinite(value)),
  );

  return {
    rows,
    list,
    count: list.length,
    totalPickup,
    activeCount: active.length,
    zeroCount: zero.length,
    averageActive: active.length ? totalPickup / active.length : null,
    top: list[0] || null,
    zero,
    exceptionalRows,
    exceptionalTotal,
  };
}

export function branchShare(summary, branchName) {
  const item = summary.list.find((entry) => entry.branch === branchName);
  return item?.share ?? null;
}
