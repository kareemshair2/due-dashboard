import { describe, expect, it } from "vitest";
import {
  buildChips,
  countActiveFilters,
  createFilters,
  distinctValues,
  filterBranches,
  filterCars,
  filterExceptionalBranches,
  filterOrders,
  inDateRange,
  matchesSearch,
  removeChip,
  resetFilters,
} from "../js/analytics/filters.js";
import { parseAll } from "../js/data/data-parser.js";
import { rawTabs, testConfig } from "./fixtures/raw-data.js";

const { data } = parseAll(rawTabs, testConfig);

function filters(overrides = {}) {
  return { ...createFilters(), ...overrides };
}

describe("createFilters / resetFilters", () => {
  it("creates an empty filter state", () => {
    expect(createFilters()).toEqual({
      preset: "all",
      from: "",
      to: "",
      search: "",
      statuses: [],
      customers: [],
      branches: [],
      vehicles: [],
      drivers: [],
      shifts: [],
      severities: [],
      tabs: [],
    });
  });

  it("resets in place", () => {
    const state = filters({ search: "جو", statuses: ["PICK_UP"] });
    const result = resetFilters(state);
    expect(result).toBe(state);
    expect(result).toEqual(createFilters());
  });
});

describe("date and search predicates", () => {
  it("matches an open range", () => {
    expect(inDateRange("2026-11-09", "", "")).toBe(true);
    expect(inDateRange(null, "", "")).toBe(true);
  });

  it("requires a date when a range is active", () => {
    expect(inDateRange(null, "2026-11-01", "2026-11-30")).toBe(false);
    expect(inDateRange("2026-11-09", "2026-11-01", "2026-11-30")).toBe(true);
    expect(inDateRange("2026-10-31", "2026-11-01", "2026-11-30")).toBe(false);
    expect(inDateRange("2026-12-01", "2026-11-01", "2026-11-30")).toBe(false);
  });

  it("searches Arabic text with normalization", () => {
    expect(matchesSearch(["جو"], "جو")).toBe(true);
    expect(matchesSearch(["إسم"], "اسم")).toBe(true);
    expect(matchesSearch(["أحمد"], "احمد")).toBe(true);
    expect(matchesSearch(["techno"], "TECH")).toBe(true);
    expect(matchesSearch(["جو"], "ايس")).toBe(false);
  });
});

describe("filterOrders", () => {
  it("filters by status", () => {
    const rows = filterOrders(data.orders, filters({ statuses: ["PICK_UP"] }));
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.status === "PICK_UP")).toBe(true);
  });

  it("filters by customer", () => {
    const rows = filterOrders(data.orders, filters({ customers: ["جو"] }));
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(15);
  });

  it("combines search and date range", () => {
    expect(
      filterOrders(data.orders, filters({ search: "جو", from: "2026-11-09", to: "2026-11-09" })),
    ).toHaveLength(1);
    expect(
      filterOrders(data.orders, filters({ search: "جو", from: "2026-11-10", to: "2026-11-20" })),
    ).toHaveLength(0);
  });

  it("matches the raw status text in search", () => {
    expect(filterOrders(data.orders, filters({ search: "Hold" }))).toHaveLength(1);
  });
});

describe("filterBranches", () => {
  it("excludes exceptional branches by default", () => {
    const rows = filterBranches(data.branches, filters());
    expect(rows).toHaveLength(5);
    expect(rows.some((row) => row.isExceptional)).toBe(false);
  });

  it("can include exceptional branches explicitly", () => {
    const rows = filterBranches(data.branches, filters(), { includeExceptional: true });
    expect(rows).toHaveLength(6);
  });

  it("exposes exceptional rows through their own filter", () => {
    const rows = filterExceptionalBranches(data.branches, filters());
    expect(rows).toHaveLength(1);
    expect(rows[0].branch).toBe("Hold");
  });

  it("filters by branch name and search", () => {
    expect(filterBranches(data.branches, filters({ branches: ["Speed"] }))).toHaveLength(1);
    expect(filterBranches(data.branches, filters({ search: "suez" }))).toHaveLength(1);
  });
});

describe("filterCars", () => {
  it("filters by vehicle, driver, and shift", () => {
    expect(filterCars(data.cars, filters({ vehicles: ["EV404"] }))).toHaveLength(2);
    expect(filterCars(data.cars, filters({ drivers: ["أحمد"] }))).toHaveLength(1);
    expect(filterCars(data.cars, filters({ shifts: ["صباحية"] }))).toHaveLength(2);
  });

  it("searches driver, vehicle, and shift", () => {
    expect(filterCars(data.cars, filters({ search: "suzuki" }))).toHaveLength(1);
    expect(filterCars(data.cars, filters({ search: "محمود" }))).toHaveLength(1);
  });
});

describe("distinctValues", () => {
  it("returns unique non-empty values sorted for Arabic", () => {
    expect(distinctValues(data.cars, (row) => row.vehicle)).toEqual([
      "EV404",
      "SUZUKI_GT06N",
    ]);
  });

  it("drops null, undefined, and blank values", () => {
    expect(distinctValues([{ value: null }, { value: " " }, { value: "x" }], (row) => row.value)).toEqual([
      "x",
    ]);
  });
});

describe("countActiveFilters", () => {
  it("counts ranges, search, and each selected value", () => {
    expect(countActiveFilters(filters())).toBe(0);
    expect(
      countActiveFilters(
        filters({
          from: "2026-11-01",
          to: "2026-11-30",
          search: "جو",
          statuses: ["PICK_UP", "HOLD"],
          vehicles: ["EV404"],
        }),
      ),
    ).toBe(5);
  });
});

describe("buildChips / removeChip", () => {
  it("builds readable chips", () => {
    const chips = buildChips(
      filters({
        from: "2026-11-09",
        to: "2026-11-09",
        search: "جو",
        statuses: ["PICK_UP"],
        branches: ["Speed", "Kaabo"],
      }),
      { statuses: [{ value: "PICK_UP", label: "PICK UP" }] },
    );
    expect(chips).toEqual([
      { key: "range", value: "", label: expect.stringContaining("2026") },
      { key: "search", value: "", label: "بحث: جو" },
      { key: "statuses", value: "PICK_UP", label: "PICK UP" },
      { key: "branches", value: "", label: "Speed +1" },
    ]);
  });

  it("removes a single value, a whole group, or the range", () => {
    const state = filters({
      preset: "last7",
      from: "2026-11-03",
      to: "2026-11-09",
      statuses: ["PICK_UP", "HOLD"],
    });
    removeChip(state, "statuses", "PICK_UP");
    expect(state.statuses).toEqual(["HOLD"]);
    removeChip(state, "statuses", "");
    expect(state.statuses).toEqual([]);
    removeChip(state, "range", "");
    expect(state.from).toBe("");
    expect(state.to).toBe("");
    expect(state.preset).toBe("all");
  });

  it("clears search through its chip", () => {
    const state = filters({ search: "جو" });
    removeChip(state, "search", "");
    expect(state.search).toBe("");
  });
});
