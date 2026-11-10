import { describe, expect, it } from "vitest";
import {
  validateAll,
  validateBranches,
  validateCars,
  validateOrders,
} from "../js/data/data-validator.js";
import { parseAll, parseTab } from "../js/data/data-parser.js";
import {
  branchesRaw,
  carsRaw,
  ordersRaw,
  rawTabs,
  testConfig,
} from "./fixtures/raw-data.js";

const { data } = parseAll(rawTabs, testConfig);

describe("validateOrders", () => {
  const rows = parseTab("orders", ordersRaw, testConfig).rows;

  it("finds no issues in clean order rows", () => {
    expect(validateOrders(rows)).toEqual([]);
  });

  it("flags missing, invalid, and negative quantities with string severities", () => {
    const tab = parseTab(
      "orders",
      {
        headers: ordersRaw.headers,
        rows: [
          ["2026-11-09", "عميل", "PICK UP", "abc", ""],
          ["2026-11-09", "عميل", "PICK UP", -5, ""],
        ],
      },
      testConfig,
    );
    const issues = validateOrders(tab.rows);
    expect(issues.map((issue) => issue.code).sort()).toEqual([
      "ORD_INVALID_QTY",
      "ORD_NEGATIVE_QTY",
    ]);
    for (const issue of issues) {
      expect(typeof issue.severity).toBe("string");
      expect(["critical", "warning", "info"]).toContain(issue.severity);
    }
    expect(issues.find((issue) => issue.code === "ORD_NEGATIVE_QTY").severity).toBe("critical");
  });

  it("flags missing dates as critical", () => {
    const tab = parseTab(
      "orders",
      { headers: ordersRaw.headers, rows: [["", "عميل", "PICK UP", 5, ""]] },
      testConfig,
    );
    const issues = validateOrders(tab.rows);
    expect(issues.map((issue) => issue.code)).toContain("ORD_MISSING_DATE");
    expect(issues.find((issue) => issue.code === "ORD_MISSING_DATE").severity).toBe("critical");
  });

  it("flags ambiguous dates as informational", () => {
    const tab = parseTab(
      "orders",
      { headers: ordersRaw.headers, rows: [["11/9/2026", "عميل", "PICK UP", 5, ""]] },
      testConfig,
    );
    const issue = validateOrders(tab.rows).find((item) => item.code === "ORD_AMBIGUOUS_DATE");
    expect(issue.severity).toBe("info");
    expect(tab.rows[0].date).toBe("2026-09-11");
  });

  it("flags unknown statuses", () => {
    const tab = parseTab(
      "orders",
      { headers: ordersRaw.headers, rows: [["2026-11-09", "عميل", "قيد الانتظار", 5, ""]] },
      testConfig,
    );
    expect(validateOrders(tab.rows).map((issue) => issue.code)).toContain("ORD_UNKNOWN_STATUS");
  });

  it("detects duplicate rows", () => {
    const tab = parseTab(
      "orders",
      {
        headers: ordersRaw.headers,
        rows: [
          ["2026-11-09", "جو", "PICK UP", 15, ""],
          ["2026-11-09", "جو", "PICK UP", 15, ""],
        ],
      },
      testConfig,
    );
    const issues = validateOrders(tab.rows).filter((issue) => issue.code === "ORD_DUPLICATE");
    expect(issues).toHaveLength(2);
    expect(issues[0].severity).toBe("warning");
  });
});

describe("validateBranches", () => {
  const rows = parseTab("branches", branchesRaw, testConfig).rows;

  it("reports the exceptional Hold record as info", () => {
    const issues = validateBranches(rows);
    const exceptional = issues.find((issue) => issue.code === "BR_EXCEPTIONAL");
    expect(exceptional).toMatchObject({ severity: "info", tab: "branches" });
    expect(exceptional.message).toContain("Hold");
  });

  it("has no other issues in clean branch rows", () => {
    expect(validateBranches(rows).map((issue) => issue.code)).toEqual(["BR_EXCEPTIONAL"]);
  });

  it("flags missing branch names as critical", () => {
    const tab = parseTab(
      "branches",
      { headers: branchesRaw.headers, rows: [["2026-11-09", "", 5, ""]] },
      testConfig,
    );
    const issue = validateBranches(tab.rows).find((item) => item.code === "BR_MISSING_BRANCH");
    expect(issue.severity).toBe("critical");
  });
});

describe("validateCars", () => {
  const rows = parseTab("cars", carsRaw, testConfig).rows;

  it("reports the zero odometer reading as a warning", () => {
    const issues = validateCars(rows);
    const zero = issues.find((issue) => issue.code === "CAR_ZERO_READINGS");
    expect(zero).toMatchObject({ severity: "warning", tab: "cars" });
    expect(zero.row).toBe(4);
  });

  it("has no other issues in clean car rows", () => {
    expect(validateCars(rows).map((issue) => issue.code)).toEqual(["CAR_ZERO_READINGS"]);
  });

  it("flags end-before-start as critical", () => {
    const tab = parseTab(
      "cars",
      {
        headers: carsRaw.headers,
        rows: [["2026-11-09", "صباحية", "أحمد", "EV404", 1000, 900, 10, 100, 100, ""]],
      },
      testConfig,
    );
    const issue = validateCars(tab.rows).find((item) => item.code === "CAR_END_BEFORE_START");
    expect(issue.severity).toBe("critical");
  });

  it("flags fuel and cost without a valid distance", () => {
    const tab = parseTab(
      "cars",
      {
        headers: carsRaw.headers,
        rows: [["2026-11-09", "صباحية", "أحمد", "EV404", 0, 0, 10, 50, 0, ""]],
      },
      testConfig,
    );
    const codes = validateCars(tab.rows).map((issue) => issue.code);
    expect(codes).toEqual(
      expect.arrayContaining(["CAR_FUEL_WITHOUT_DISTANCE", "CAR_COST_WITHOUT_DISTANCE"]),
    );
  });

  it("flags a raw kilometer value that differs from the computed distance", () => {
    const tab = parseTab(
      "cars",
      {
        headers: carsRaw.headers,
        rows: [["2026-11-09", "صباحية", "أحمد", "EV404", 2000, 2100, 10, 100, 200, ""]],
      },
      testConfig,
    );
    expect(validateCars(tab.rows).map((issue) => issue.code)).toContain("CAR_KM_MISMATCH");
  });
});

describe("validateAll", () => {
  const result = validateAll(data);

  it("summarizes the expected real-data findings", () => {
    expect(result.summary.total).toBe(2);
    expect(result.summary.bySeverity).toEqual({ critical: 0, warning: 1, info: 1 });
    expect(result.summary.byTab).toEqual({ orders: 0, branches: 1, cars: 1 });
  });

  it("sorts critical issues first, then warnings, then info", () => {
    const ranks = { critical: 0, warning: 1, info: 2 };
    const sorted = result.issues.map((issue) => ranks[issue.severity]);
    expect(sorted).toEqual([...sorted].sort((a, b) => a - b));
  });

  it("counts affected rows and codes", () => {
    expect(result.summary.affectedRows).toBe(2);
    expect(result.summary.byCode).toEqual({
      BR_EXCEPTIONAL: 1,
      CAR_ZERO_READINGS: 1,
    });
  });

  it("handles empty data", () => {
    const empty = validateAll({});
    expect(empty.issues).toEqual([]);
    expect(empty.summary.total).toBe(0);
    expect(empty.summary.affectedRows).toBe(0);
  });
});
