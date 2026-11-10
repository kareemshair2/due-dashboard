import { describe, expect, it } from "vitest";
import {
  average,
  clamp,
  median,
  normalizeDigits,
  parseNumber,
  percent,
  safeDivide,
  sum,
} from "../js/utils/number-utils.js";

describe("normalizeDigits", () => {
  it("converts Arabic-Indic and Persian digits", () => {
    expect(normalizeDigits("١٢٣٤")).toBe("1234");
    expect(normalizeDigits("۱۲۳۴")).toBe("1234");
  });

  it("leaves non-string values untouched", () => {
    expect(normalizeDigits(42)).toBe(42);
    expect(normalizeDigits(null)).toBeNull();
  });
});

describe("parseNumber", () => {
  it("passes through finite numbers and rejects non-finite ones", () => {
    expect(parseNumber(12.5)).toBe(12.5);
    expect(parseNumber(0)).toBe(0);
    expect(parseNumber(Number.NaN)).toBeNull();
    expect(parseNumber(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("parses Arabic-Indic digits", () => {
    expect(parseNumber("١٢٣")).toBe(123);
    expect(parseNumber("٤٥.٥")).toBe(45.5);
  });

  it("strips thousands separators, spaces, and currency symbols", () => {
    expect(parseNumber("1,234.5")).toBe(1234.5);
    expect(parseNumber("1 234")).toBe(1234);
    expect(parseNumber("ج.م 1,200")).toBe(1200);
    expect(parseNumber("$1,000")).toBe(1000);
    expect(parseNumber("33%")).toBe(33);
  });

  it("handles accounting negatives and unicode minus signs", () => {
    expect(parseNumber("(250)")).toBe(-250);
    expect(parseNumber("-42")).toBe(-42);
    expect(parseNumber("−42")).toBe(-42);
    expect(parseNumber("–42")).toBe(-42);
  });

  it("treats blanks and explicit placeholders as null", () => {
    for (const value of [null, undefined, "", "   ", "فارغ", "-", "—", "N/A", "null"]) {
      expect(parseNumber(value)).toBeNull();
    }
  });

  it("rejects text that is not a number", () => {
    expect(parseNumber("abc")).toBeNull();
    expect(parseNumber("12abc")).toBeNull();
    expect(parseNumber("1.2.3")).toBeNull();
  });
});

describe("numeric helpers", () => {
  it("sums only finite values", () => {
    expect(sum([1, 2, Number.NaN, null, 3])).toBe(6);
    expect(sum([])).toBe(0);
  });

  it("averages and medians only finite values", () => {
    expect(average([2, 4, 6])).toBe(4);
    expect(average([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it("computes percentages and guarded division", () => {
    expect(percent(25, 200)).toBe(12.5);
    expect(percent(1, 0)).toBeNull();
    expect(safeDivide(10, 4)).toBe(2.5);
    expect(safeDivide(10, 0)).toBeNull();
    expect(safeDivide(Number.NaN, 2)).toBeNull();
  });

  it("clamps values to a range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
