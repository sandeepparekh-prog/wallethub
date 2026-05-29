import { describe, it, expect } from "vitest";
import { formatCurrency, formatNumber, formatDate, capitalize } from "./format";

describe("formatCurrency", () => {
  it("should format USD amounts with dollar sign", () => {
    const result = formatCurrency(1000, "USD");
    expect(result).toContain("$");
    expect(result).toContain("1,000");
  });

  it("should format INR amounts with rupee symbol", () => {
    const result = formatCurrency(100000, "INR");
    expect(result).toContain("₹");
  });

  it("should use Indian locale grouping for INR", () => {
    const result = formatCurrency(100000, "INR");
    expect(result).toContain("1,00,000");
  });

  it("should default to USD if no currency specified", () => {
    const result = formatCurrency(500);
    expect(result).toContain("$");
  });

  it("should format zero", () => {
    const result = formatCurrency(0, "USD");
    expect(result).toContain("$");
    expect(result).toContain("0");
  });

  it("should format negative amounts", () => {
    const result = formatCurrency(-1000, "USD");
    expect(result).toContain("1,000");
  });

  it("should not show decimal places", () => {
    const result = formatCurrency(1000.99, "USD");
    expect(result).not.toContain(".99");
  });
});

describe("formatNumber", () => {
  it("should format integers without decimals", () => {
    expect(formatNumber(1000)).toBe("1,000");
  });

  it("should format with up to 2 decimal places", () => {
    expect(formatNumber(1000.5)).toBe("1,000.5");
  });

  it("should truncate beyond 2 decimal places", () => {
    expect(formatNumber(1000.999)).toBe("1,001");
  });

  it("should format zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("should format large numbers with commas", () => {
    expect(formatNumber(1000000)).toBe("1,000,000");
  });

  it("should format negative numbers", () => {
    expect(formatNumber(-500)).toBe("-500");
  });
});

describe("formatDate", () => {
  it("should format a date string", () => {
    const result = formatDate("2024-01-15");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });

  it("should format an ISO date string", () => {
    const result = formatDate("2024-06-30T00:00:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("2024");
  });

  it("should format different months correctly", () => {
    expect(formatDate("2024-12-25")).toContain("Dec");
    expect(formatDate("2024-03-01")).toContain("Mar");
  });
});

describe("capitalize", () => {
  it("should capitalize first letter", () => {
    expect(capitalize("hello")).toBe("Hello");
  });

  it("should handle already capitalized string", () => {
    expect(capitalize("Hello")).toBe("Hello");
  });

  it("should handle single character", () => {
    expect(capitalize("a")).toBe("A");
  });

  it("should return empty string for empty input", () => {
    expect(capitalize("")).toBe("");
  });

  it("should return empty string for null", () => {
    expect(capitalize(null)).toBe("");
  });

  it("should return empty string for undefined", () => {
    expect(capitalize(undefined)).toBe("");
  });

  it("should not change the rest of the string", () => {
    expect(capitalize("hELLO")).toBe("HELLO");
  });
});
