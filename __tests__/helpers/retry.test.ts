jest.mock("@actions/core", () => ({
  warning: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
}));

import {
  isTransientStatus,
  parseRetryAfter,
  retryablePost,
} from "../../src/helpers/retry";

describe("retry.isTransientStatus", () => {
  it.each([408, 425, 429, 500, 502, 503, 504, "429"])(
    "marks %p as transient",
    (status) => {
      expect(isTransientStatus(status as number | string)).toBe(true);
    },
  );

  it.each([200, 201, 301, 400, 401, 403, 404, 409, 422])(
    "does NOT mark %p as transient",
    (status) => {
      expect(isTransientStatus(status)).toBe(false);
    },
  );

  it("returns false for unparseable input", () => {
    expect(isTransientStatus("not-a-number")).toBe(false);
  });
});

describe("retry.parseRetryAfter", () => {
  it("parses delta-seconds form", () => {
    expect(parseRetryAfter({ "retry-after": "3" })).toBe(3000);
    expect(parseRetryAfter({ "Retry-After": "1.5" })).toBe(1500);
    expect(parseRetryAfter({ "retry-after": "0" })).toBe(0);
  });

  it("parses HTTP-date form relative to `now`", () => {
    const now = Date.UTC(2024, 0, 1, 12, 0, 0);
    const sixtySecondsLater = new Date(now + 60_000).toUTCString();
    expect(
      parseRetryAfter({ "retry-after": sixtySecondsLater }, now),
    ).toBeGreaterThanOrEqual(59_000);
    expect(
      parseRetryAfter({ "retry-after": sixtySecondsLater }, now),
    ).toBeLessThanOrEqual(60_000);
  });

  it("clamps a past HTTP-date to 0", () => {
    const now = Date.UTC(2024, 0, 2);
    const past = new Date(now - 60_000).toUTCString();
    expect(parseRetryAfter({ "retry-after": past }, now)).toBe(0);
  });

  it("returns undefined when header missing", () => {
    expect(parseRetryAfter(undefined)).toBeUndefined();
    expect(parseRetryAfter({})).toBeUndefined();
  });

  it("returns undefined for unparseable values", () => {
    expect(parseRetryAfter({ "retry-after": "soon" })).toBeUndefined();
    expect(parseRetryAfter({ "retry-after": "" })).toBeUndefined();
  });

  it("handles array-form headers (takes the first value)", () => {
    expect(parseRetryAfter({ "retry-after": ["7"] })).toBe(7000);
  });
});

describe("retry.retryablePost", () => {
  it("returns the first response when not transient", async () => {
    const fn = jest.fn().mockResolvedValue({ status: 200 });
    const sleepFn = jest.fn().mockResolvedValue(undefined);
    const result = await retryablePost(
      fn,
      (r) => Number(r.status) >= 500,
      undefined,
      sleepFn,
    );
    expect(result.status).toBe(200);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleepFn).not.toHaveBeenCalled();
  });

  it("retries on transient response and returns the eventual success", async () => {
    const fn = jest
      .fn()
      .mockResolvedValueOnce({
        status: 429,
        headers: { "retry-after": "1" },
      })
      .mockResolvedValueOnce({ status: 200 });
    const sleepFn = jest.fn().mockResolvedValue(undefined);

    const result = await retryablePost(
      fn,
      (r) => Number(r.status) === 429 || Number(r.status) >= 500,
      { maxRetries: 3, retryBackoffMs: 5000 },
      sleepFn,
    );

    expect(result.status).toBe(200);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleepFn).toHaveBeenCalledTimes(1);
    // Retry-After of 1s should be honored exactly.
    expect(sleepFn.mock.calls[0][0]).toBe(1000);
  });

  it("falls back to exponential backoff when no Retry-After is set", async () => {
    const fn = jest
      .fn()
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ status: 200 });
    const sleepFn = jest.fn().mockResolvedValue(undefined);

    await retryablePost(
      fn,
      (r) => Number(r.status) >= 500,
      { maxRetries: 5, retryBackoffMs: 30_000 },
      sleepFn,
    );

    expect(sleepFn).toHaveBeenCalledTimes(1);
    // 2^0 * 500 +/- 250ms jitter
    const ms = sleepFn.mock.calls[0][0];
    expect(ms).toBeGreaterThanOrEqual(250);
    expect(ms).toBeLessThanOrEqual(750);
  });

  it("caps each backoff sleep at retryBackoffMs", async () => {
    const fn = jest
      .fn()
      .mockResolvedValueOnce({
        status: 429,
        headers: { "retry-after": "9999" },
      })
      .mockResolvedValueOnce({ status: 200 });
    const sleepFn = jest.fn().mockResolvedValue(undefined);

    await retryablePost(
      fn,
      (r) => Number(r.status) === 429,
      { maxRetries: 5, retryBackoffMs: 250 },
      sleepFn,
    );

    expect(sleepFn).toHaveBeenCalledWith(250);
  });

  it("gives up after maxRetries and returns the final transient response", async () => {
    const transient = { status: 429, headers: { "retry-after": "0" } };
    const fn = jest.fn().mockResolvedValue(transient);
    const sleepFn = jest.fn().mockResolvedValue(undefined);

    const result = await retryablePost(
      fn,
      (r) => Number(r.status) === 429,
      { maxRetries: 2 },
      sleepFn,
    );

    expect(result).toBe(transient);
    // Initial call + 2 retries.
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleepFn).toHaveBeenCalledTimes(2);
  });

  it("does not retry when maxRetries is 0", async () => {
    const transient = { status: 503 };
    const fn = jest.fn().mockResolvedValue(transient);
    const sleepFn = jest.fn().mockResolvedValue(undefined);

    const result = await retryablePost(
      fn,
      (r) => Number(r.status) >= 500,
      { maxRetries: 0 },
      sleepFn,
    );

    expect(result).toBe(transient);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleepFn).not.toHaveBeenCalled();
  });
});
