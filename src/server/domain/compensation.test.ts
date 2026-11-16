import { describe, expect, it } from "vitest";
import { bandPosition, changePercent, compaRatio, payGapPercent, rangePenetration, tenureYears } from "./compensation";
import { median, summarize } from "./stats";
import { currencyOf, toUsd } from "./countries";

const band = { min: 80_000, mid: 100_000, max: 120_000 };

describe("compaRatio", () => {
  it("is salary divided by the band midpoint, to 2 decimals", () => {
    expect(compaRatio(100_000, band)).toBe(1);
    expect(compaRatio(85_000, band)).toBe(0.85);
    expect(compaRatio(123_456, band)).toBe(1.23);
  });
});

describe("rangePenetration", () => {
  it("is 0 at the minimum and 1 at the maximum", () => {
    expect(rangePenetration(80_000, band)).toBe(0);
    expect(rangePenetration(100_000, band)).toBe(0.5);
    expect(rangePenetration(120_000, band)).toBe(1);
  });

  it("goes below 0 or above 1 when out of band", () => {
    expect(rangePenetration(70_000, band)).toBe(-0.25);
    expect(rangePenetration(130_000, band)).toBe(1.25);
  });
});

describe("bandPosition", () => {
  it("classifies against min and max, inclusive", () => {
    expect(bandPosition(79_999, band)).toBe("below");
    expect(bandPosition(80_000, band)).toBe("within");
    expect(bandPosition(120_000, band)).toBe("within");
    expect(bandPosition(120_001, band)).toBe("above");
  });
});

describe("payGapPercent", () => {
  it("is the men-to-women median gap as a share of the men's median", () => {
    expect(payGapPercent({ men: 100_000, women: 90_000 })).toBe(10);
  });

  it("is negative when women are paid more", () => {
    expect(payGapPercent({ men: 100_000, women: 104_000 })).toBe(-4);
  });

  it("rounds to one decimal", () => {
    expect(payGapPercent({ men: 3, women: 2 })).toBe(33.3);
  });
});

describe("tenureYears", () => {
  it("counts whole years since hire", () => {
    expect(tenureYears("2020-06-15", new Date("2026-06-14"))).toBe(5);
    expect(tenureYears("2020-06-15", new Date("2026-06-15"))).toBe(6);
  });
});

describe("changePercent", () => {
  it("returns the % change rounded to one decimal", () => {
    expect(changePercent(100_000, 105_000)).toBe(5);
    expect(changePercent(90_000, 81_000)).toBe(-10);
    expect(changePercent(3, 4)).toBe(33.3);
  });
});

describe("stats", () => {
  it("summarises min, max, rounded average and median", () => {
    expect(summarize([300, 100, 200])).toEqual({ count: 3, min: 100, max: 300, average: 200, median: 200 });
  });

  it("returns zeros for an empty list", () => {
    expect(summarize([])).toEqual({ count: 0, min: 0, max: 0, average: 0, median: 0 });
  });

  it("takes the mean of the two middle values for an even count", () => {
    expect(median([1, 4, 2, 3])).toBe(2.5);
  });

  it("does not mutate the input", () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe("countries", () => {
  it("derives currency from country and converts with fixed rates", () => {
    expect(currencyOf("DE")).toBe("EUR");
    expect(toUsd(1000, "GB")).toBe(1270);
    expect(toUsd(1000, "US")).toBe(1000);
  });
});
