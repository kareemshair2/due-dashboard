import { describe, expect, it } from "vitest";
import {
  SchemaError,
  parseAll,
  parseTab,
} from "../js/data/data-parser.js";
import {
  branchesRaw,
  carsEdgeRaw,
  carsRaw,
  ordersRaw,
  rawTabs,
  testConfig,
} from "./fixtures/raw-data.js";

describe("parseAll", () => {
  const result = parseAll(rawTabs, testConfig);

  it("parses every tab without errors", () => {
    expect(result.errors).toEqual([]);
    expect(result.data.orders).toHaveLength(4);
    expect(result.data.branches).toHaveLength(6);
    expect(result.data.cars).toHaveLength(3);
  });

  it("reports row counts and skipped blank rows in meta", () => {
    expect(result.meta.orders).toMatchObject({ count: 4, skippedRows: 1 });
    expect(result.meta.branches).toMatchObject({ count: 6, skippedRows: 1 });
    expect(result.meta.cars).toMatchObject({ count: 3, skippedRows: 1 });
  });

  it("reports a missing tab instead of throwing", () => {
    const partial = parseAll({ orders: ordersRaw }, testConfig);
    expect(partial.errors.map((error) => error.tab).sort()).toEqual(["branches", "cars"]);
    expect(partial.data.orders).toHaveLength(4);
    expect(partial.data.branches).toEqual([]);
  });
});

describe("parseTab: Orders", () => {
  const tab = parseTab("orders", ordersRaw, testConfig);

  it("maps headers and parses typed values", () => {
    const [first] = tab.rows;
    expect(first).toMatchObject({
      tab: "orders",
      date: "2026-11-09",
      dateSource: "gviz",
      customer: "جو",
      status: "PICK_UP",
      quantity: 15,
      __row: 2,
    });
  });

  it("normalizes Hold and unknown statuses", () => {
    expect(tab.rows[1].status).toBe("HOLD");
    const unknown = parseTab(
      "orders",
      {
        headers: ordersRaw.headers,
        rows: [["2026-11-09", "عميل", "قيد المراجعة", 3, ""]],
      },
      testConfig,
    );
    expect(unknown.rows[0].status).toBe("OTHER");
  });

  it("keeps raw values alongside parsed values for data quality", () => {
    expect(tab.rows[0].quantityRaw).toBe(15);
    expect(tab.rows[0].raw.customer).toBe("جو");
    expect(tab.rows[0].raw.__header_customer).toBe("إسم العميل ");
  });

  it("throws SchemaError when a required header is missing", () => {
    expect(() =>
      parseTab(
        "orders",
        { headers: ["التاريخ", "إسم العميل", "الحالة"], rows: [] },
        testConfig,
      ),
    ).toThrow(SchemaError);
  });
});

describe("parseTab: Branches", () => {
  const tab = parseTab("branches", branchesRaw, testConfig);

  it("parses branch pickup counts", () => {
    const speed = tab.rows.find((row) => row.branch === "Speed");
    expect(speed).toMatchObject({ pickup: 2, branchNorm: "speed", isExceptional: false });
    expect(tab.rows.find((row) => row.branch === "Gesr El Suez Branch").pickup).toBe(11);
  });

  it("flags the exceptional Hold record", () => {
    const hold = tab.rows.find((row) => row.branch === "Hold");
    expect(hold.isExceptional).toBe(true);
    expect(hold.pickup).toBe(20);
  });

  it("flags exceptional branches case-insensitively", () => {
    const tabLower = parseTab(
      "branches",
      {
        headers: branchesRaw.headers,
        rows: [["2026-11-09", "hOlD", 5, ""]],
      },
      testConfig,
    );
    expect(tabLower.rows[0].isExceptional).toBe(true);
  });
});

describe("parseTab: Cars odometer rules", () => {
  const tab = parseTab("cars", carsRaw, testConfig);

  it("computes distance from end minus start when both are valid", () => {
    const [first, second] = tab.rows;
    expect(first).toMatchObject({
      vehicle: "EV404",
      start: 5652,
      end: 5940,
      distance: 288,
      isOdometerValid: true,
      isTrip: true,
    });
    expect(second.distance).toBe(54);
    expect(first.kmMismatch).toBe(0);
  });

  it("computes fuel efficiency and cost per km only for valid trips", () => {
    const [first, second] = tab.rows;
    expect(first.fuelEfficiency).toBeCloseTo(288 / 33, 10);
    expect(first.costPerKm).toBeNull();
    expect(second.fuelEfficiency).toBeNull();
    expect(second.costPerKm).toBe(0);
  });

  it("never trusts a zero-zero odometer reading as a trip", () => {
    const zero = tab.rows[2];
    expect(zero).toMatchObject({
      start: 0,
      end: 0,
      distance: null,
      isOdometerValid: false,
      isTrip: false,
      isZeroReading: true,
    });
  });

  it("rejects end-before-start readings and records the reason", () => {
    const edge = parseTab("cars", carsEdgeRaw, testConfig);
    const invalid = edge.rows[0];
    expect(invalid).toMatchObject({
      start: 1000,
      end: 900,
      distance: null,
      isOdometerValid: false,
      isEndBeforeStart: true,
    });
    expect(invalid.kmMismatch).toBeNull();
  });

  it("does not use the raw kilometers column to compute distance", () => {
    const edge = parseTab("cars", carsEdgeRaw, testConfig);
    const valid = edge.rows[1];
    expect(valid.distance).toBe(100);
    expect(valid.kmRaw).toBe(200);
    expect(valid.kmMismatch).toBe(100);
  });

  it("flags fuel or cost entered without a valid distance", () => {
    const edge = parseTab(
      "cars",
      {
        headers: carsRaw.headers,
        rows: [["2026-11-09", "صباحية", "أحمد", "EV404", 0, 0, 10, 50, 0, ""]],
      },
      testConfig,
    );
    expect(edge.rows[0].hasFuelWithoutDistance).toBe(true);
    expect(edge.rows[0].hasCostWithoutDistance).toBe(true);
  });
});
