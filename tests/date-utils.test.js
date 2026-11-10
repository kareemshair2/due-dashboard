import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  diffDaysISO,
  getPresetRange,
  isValidISO,
  maxISO,
  minISO,
  parseDate,
  previousRange,
  serialToISO,
  toISO,
  todayISO,
} from "../js/utils/date-utils.js";

describe("toISO", () => {
  it("formats valid calendar dates", () => {
    expect(toISO(2026, 11, 9)).toBe("2026-11-09");
    expect(toISO(2026, 1, 1)).toBe("2026-01-01");
    expect(toISO(2024, 2, 29)).toBe("2024-02-29");
  });

  it("rejects impossible dates and out-of-range parts", () => {
    expect(toISO(2026, 2, 29)).toBeNull();
    expect(toISO(2026, 13, 1)).toBeNull();
    expect(toISO(2026, 0, 10)).toBeNull();
    expect(toISO(2026, 4, 31)).toBeNull();
    expect(toISO(Number.NaN, 1, 1)).toBeNull();
  });
});

describe("serialToISO", () => {
  it("converts Google Sheets serial numbers using the 1899-12-30 epoch", () => {
    expect(serialToISO(25569)).toBe("1970-01-01");
    expect(serialToISO(0)).toBe("1899-12-30");
  });

  it("returns null for non-numeric input", () => {
    expect(serialToISO(null)).toBeNull();
    expect(serialToISO("25569")).toBeNull();
  });
});

describe("parseDate", () => {
  it("reads gviz Date(...) values without ambiguity", () => {
    const parsed = parseDate("Date(2026,10,9)");
    expect(parsed.iso).toBe("2026-11-09");
    expect(parsed.ambiguous).toBe(false);
    expect(parsed.source).toBe("gviz");
  });

  it("reads ISO strings and real Date objects", () => {
    expect(parseDate("2026-11-09")).toMatchObject({
      iso: "2026-11-09",
      ambiguous: false,
      source: "text",
    });
    expect(parseDate(new Date(Date.UTC(2026, 10, 9)))).toMatchObject({
      iso: "2026-11-09",
      source: "date",
    });
  });

  it("honours the configured day/month order for ambiguous slash dates", () => {
    expect(parseDate("11/9/2026", "DMY")).toMatchObject({
      iso: "2026-09-11",
      ambiguous: true,
    });
    expect(parseDate("11/9/2026", "MDY")).toMatchObject({
      iso: "2026-11-09",
      ambiguous: true,
    });
  });

  it("resolves unambiguous slash dates regardless of order", () => {
    expect(parseDate("31/12/2026", "DMY")).toMatchObject({
      iso: "2026-12-31",
      ambiguous: false,
    });
    expect(parseDate("12/31/2026", "DMY")).toMatchObject({
      iso: "2026-12-31",
      ambiguous: false,
    });
  });

  it("reads named Arabic and English months", () => {
    expect(parseDate("9 نوفمبر 2026").iso).toBe("2026-11-09");
    expect(parseDate("9 Nov 2026").iso).toBe("2026-11-09");
    expect(parseDate("9 September 2026").iso).toBe("2026-09-09");
  });

  it("handles Arabic-Indic digits", () => {
    expect(parseDate("٢٠٢٦-١١-٠٩").iso).toBe("2026-11-09");
  });

  it("returns an empty result for blank input and invalid for garbage", () => {
    expect(parseDate("")).toMatchObject({ iso: null, source: "empty" });
    expect(parseDate(null)).toMatchObject({ iso: null, source: "empty" });
    expect(parseDate("not a date")).toMatchObject({ iso: null, source: "invalid" });
  });
});

describe("date range helpers", () => {
  it("adds and subtracts days across month boundaries", () => {
    expect(addDaysISO("2026-11-01", -1)).toBe("2026-10-31");
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
    expect(diffDaysISO("2026-11-01", "2026-11-09")).toBe(8);
  });

  it("builds presets from an explicit today", () => {
    expect(getPresetRange("today", "2026-11-09")).toEqual({
      from: "2026-11-09",
      to: "2026-11-09",
    });
    expect(getPresetRange("last7", "2026-11-09")).toEqual({
      from: "2026-11-03",
      to: "2026-11-09",
    });
    expect(getPresetRange("last30", "2026-11-09")).toEqual({
      from: "2026-10-11",
      to: "2026-11-09",
    });
    expect(getPresetRange("thisMonth", "2026-11-09")).toEqual({
      from: "2026-11-01",
      to: "2026-11-09",
    });
    expect(getPresetRange("all", "2026-11-09")).toEqual({ from: "", to: "" });
  });

  it("computes the previous period of equal length", () => {
    expect(previousRange("2026-11-03", "2026-11-09")).toEqual({
      from: "2026-10-27",
      to: "2026-11-02",
    });
    expect(previousRange("", "")).toEqual({ from: "", to: "" });
  });

  it("validates, sorts, and bounds ISO strings", () => {
    expect(isValidISO("2026-11-09")).toBe(true);
    expect(isValidISO("2026-1-9")).toBe(false);
    expect(minISO(["2026-11-09", "2026-01-02", null])).toBe("2026-01-02");
    expect(maxISO(["2026-11-09", "2026-01-02", "bad"])).toBe("2026-11-09");
    expect(minISO([])).toBeNull();
  });

  it("returns a local today in ISO form", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
