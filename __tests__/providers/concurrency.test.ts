import { mapWithConcurrency } from "../../src/providers/shared/concurrency";

describe("mapWithConcurrency", () => {
  it("preserves input order regardless of completion order", async () => {
    const input = [30, 10, 20, 0];
    const result = await mapWithConcurrency(input, 2, async (ms, i) => {
      await new Promise((r) => setTimeout(r, ms));
      return `${i}:${ms}`;
    });
    expect(result).toEqual(["0:30", "1:10", "2:20", "3:0"]);
  });

  it("never exceeds the concurrency limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const items = Array.from({ length: 12 }, (_, i) => i);

    await mapWithConcurrency(items, 3, async (item) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return item;
    });

    expect(peak).toBeLessThanOrEqual(3);
  });

  it("handles an empty input list", async () => {
    const result = await mapWithConcurrency([], 5, async (x) => x);
    expect(result).toEqual([]);
  });

  it("maps every item exactly once", async () => {
    const items = Array.from({ length: 7 }, (_, i) => i);
    const result = await mapWithConcurrency(items, 4, async (x) => x * 2);
    expect(result).toEqual([0, 2, 4, 6, 8, 10, 12]);
  });
});
