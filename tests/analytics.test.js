import { describe, expect, it } from "vitest";
import { summarizeBranches, branchShare } from "../js/analytics/branches-analytics.js";
import { summarizeCars } from "../js/analytics/cars-analytics.js";
import { summarizeOrders } from "../js/analytics/orders-analytics.js";
import { buildInsights } from "../js/analytics/insights.js";
import { parseAll } from "../js/data/data-parser.js";
import { validateAll } from "../js/data/data-validator.js";
import { rawTabs, testConfig } from "./fixtures/raw-data.js";

const { data } = parseAll(rawTabs, testConfig);

describe("summarizeOrders", () => {
  const summary = summarizeOrders(data.orders);

  it("counts rows and quantities by status", () => {
    expect(summary).toMatchObject({
      count: 4,
      totalQuantity: 38,
      pickUpCount: 3,
      pickUpQuantity: 18,
      holdCount: 1,
      holdQuantity: 20,
      otherCount: 0,
      customersCount: 4,
    });
  });

  it("computes shares and averages", () => {
    expect(summary.pickUpShare).toBeCloseTo((18 / 38) * 100, 10);
    expect(summary.holdShare).toBeCloseTo((20 / 38) * 100, 10);
    expect(summary.averageQuantity).toBe(9.5);
  });

  it("ranks customers by quantity", () => {
    expect(summary.byCustomer[0]).toEqual({
      customer: "ايس بوست",
      count: 1,
      quantity: 20,
    });
    expect(summary.topCustomer.customer).toBe("ايس بوست");
  });

  it("groups by day", () => {
    expect(summary.byDay).toEqual([
      {
        date: "2026-11-09",
        count: 4,
        quantity: 38,
        pickUpQuantity: 18,
        holdQuantity: 20,
      },
    ]);
  });

  it("returns null shares for an empty data set", () => {
    const empty = summarizeOrders([]);
    expect(empty.count).toBe(0);
    expect(empty.totalQuantity).toBe(0);
    expect(empty.pickUpShare).toBeNull();
    expect(empty.averageQuantity).toBeNull();
    expect(empty.topCustomer).toBeNull();
  });
});

describe("summarizeBranches", () => {
  const normal = data.branches.filter((row) => !row.isExceptional);
  const exceptional = data.branches.filter((row) => row.isExceptional);
  const summary = summarizeBranches(normal, exceptional);

  it("totals only normal branches", () => {
    expect(summary).toMatchObject({
      count: 5,
      totalPickup: 18,
      activeCount: 3,
      zeroCount: 2,
      exceptionalTotal: 20,
    });
    expect(summary.exceptionalRows).toHaveLength(1);
  });

  it("sorts branches by pickup descending", () => {
    expect(summary.list.map((item) => item.branch)).toEqual([
      "Gesr El Suez Branch",
      "Menib Branch",
      "Speed",
      "Kaabo",
      "Light Speed",
    ]);
    expect(summary.top.branch).toBe("Gesr El Suez Branch");
    expect(summary.top.share).toBeCloseTo((11 / 18) * 100, 10);
  });

  it("returns zero-value branches separately", () => {
    expect(summary.zero.map((item) => item.branch).sort()).toEqual(["Kaabo", "Light Speed"]);
    expect(summary.averageActive).toBe(6);
  });

  it("exposes a branch share lookup", () => {
    expect(branchShare(summary, "Menib Branch")).toBeCloseTo((5 / 18) * 100, 10);
    expect(branchShare(summary, "Hold")).toBeNull();
  });

  it("handles an empty branch list", () => {
    const empty = summarizeBranches([], []);
    expect(empty.totalPickup).toBe(0);
    expect(empty.top).toBeNull();
    expect(empty.averageActive).toBeNull();
  });
});

describe("summarizeCars", () => {
  const summary = summarizeCars(data.cars);

  it("totals only valid trips", () => {
    expect(summary).toMatchObject({
      records: 3,
      tripCount: 2,
      invalidCount: 1,
      vehicleCount: 2,
      driverCount: 3,
      totalDistance: 342,
      totalFuel: 33,
      totalCost: 0,
      totalKmRaw: 342,
    });
  });

  it("computes efficiency and cost per km", () => {
    expect(summary.efficiency).toBeCloseTo(342 / 33, 10);
    expect(summary.costPerKm).toBe(0);
    expect(summary.averageTrip).toBe(171);
  });

  it("groups by vehicle with driver counts", () => {
    const ev = summary.byVehicle.find((item) => item.vehicle === "EV404");
    expect(ev).toMatchObject({ records: 2, trips: 2, distance: 342, fuel: 33 });
    expect(ev.driverCount).toBe(2);
    const suzuki = summary.byVehicle.find((item) => item.vehicle === "SUZUKI_GT06N");
    expect(suzuki).toMatchObject({ records: 1, trips: 0, distance: 0, invalid: 1 });
  });

  it("keeps invalid rows available for review", () => {
    expect(summary.invalidRows).toHaveLength(1);
    expect(summary.invalidRows[0].vehicle).toBe("SUZUKI_GT06N");
  });

  it("returns null efficiency when there is no fuel or distance", () => {
    const empty = summarizeCars([]);
    expect(empty.efficiency).toBeNull();
    expect(empty.costPerKm).toBeNull();
    expect(empty.averageTrip).toBeNull();
  });
});

describe("buildInsights", () => {
  const orders = summarizeOrders(data.orders);
  const branches = summarizeBranches(
    data.branches.filter((row) => !row.isExceptional),
    data.branches.filter((row) => row.isExceptional),
  );
  const cars = summarizeCars(data.cars);
  const validation = validateAll(data);
  const meta = {
    orders: { dates: data.orders.map((row) => row.date) },
    branches: { dates: data.branches.map((row) => row.date) },
    cars: { dates: data.cars.map((row) => row.date) },
  };
  const insights = buildInsights({ orders, branches, cars, validation, meta });
  const ids = insights.map((item) => item.id);

  it("builds computed insights for every section", () => {
    expect(ids).toEqual(
      expect.arrayContaining([
        "orders-pickup-share",
        "orders-hold",
        "orders-top-customer",
        "branches-top",
        "branches-zero",
        "branches-exceptional",
        "cars-invalid",
        "cars-distance",
        "cars-efficiency",
        "quality-summary",
        "coverage-dates",
      ]),
    );
  });

  it("sorts warnings before informational insights", () => {
    const severities = insights.map((item) => item.severity);
    const firstInfo = severities.indexOf("info");
    expect(severities.slice(0, firstInfo).every((value) => value !== "info")).toBe(true);
  });

  it("returns no insights for empty data", () => {
    expect(buildInsights({})).toEqual([]);
  });
});
