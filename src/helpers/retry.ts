import { warning } from "@actions/core";

/**
 * Status codes that can be retried. 408 (request timeout), 425 (too early),
 * 429 (rate limited) and the standard "transient server failure" 5xx codes
 * all map to a backoff-and-retry policy. Any other unexpected status flows
 * straight back to the caller as a permanent failure.
 */
const TRANSIENT_STATUSES = new Set<number>([408, 425, 429, 500, 502, 503, 504]);

export interface RetryOptions {
  /**
   * Maximum number of additional attempts after the initial call. The total
   * number of HTTP calls per request is `1 + maxRetries`. Defaults to 5.
   */
  maxRetries?: number;
  /**
   * Cap (ms) on any single backoff sleep. The Azure-supplied `Retry-After`
   * header is honored exactly when present; otherwise an exponentially
   * growing jittered sleep is used, capped at this value. Defaults to
   * 30000ms (30s).
   */
  retryBackoffMs?: number;
}

/** Result the translate-call shape must satisfy for retry to function. */
export interface RetryableResponse {
  status: string | number;
  // `any` here so the SDK's narrower `Record<string, string>` headers type
  // (RawHttpHeaders) still satisfies the constraint without forcing callers
  // to widen their response types. The retry helper only ever reads via
  // `parseRetryAfter` which is itself permissive.
  headers?: Record<string, any>;
}

/**
 * Parses an HTTP `Retry-After` header — RFC 7231 allows either a delta in
 * seconds or an HTTP-date. Returns `undefined` when the value is missing or
 * unparseable so callers can fall back to exponential backoff.
 */
export const parseRetryAfter = (
  headers: RetryableResponse["headers"] | undefined,
  now: number = Date.now(),
): number | undefined => {
  if (!headers) return undefined;
  const raw = pickHeader(headers, "retry-after");
  if (!raw) return undefined;

  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // delta-seconds form
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const seconds = Number.parseFloat(trimmed);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.round(seconds * 1000);
    }
  }

  // HTTP-date form
  const ts = Date.parse(trimmed);
  if (Number.isFinite(ts)) {
    const delta = ts - now;
    return delta > 0 ? delta : 0;
  }
  return undefined;
};

const pickHeader = (
  headers: NonNullable<RetryableResponse["headers"]>,
  name: string,
): string | undefined => {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== lower) continue;
    if (Array.isArray(value)) return value[0];
    return value as string | undefined;
  }
  return undefined;
};

/**
 * Async sleep helper. Exposed for tests so they can `jest.useFakeTimers()`.
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes `fn` and, when its returned response carries a transient HTTP
 * status, schedules another attempt. The backoff strategy honors
 * `Retry-After` headers when present, otherwise applies jittered exponential
 * backoff (`min(retryBackoffMs, 2^attempt * 500ms +/- 250ms)`).
 *
 * Permanent (non-transient) failures and successful responses both flow
 * straight back to the caller. The wrapper never throws; callers continue to
 * inspect `isUnexpected(response)` themselves to decide what to do with the
 * final response.
 */
export const retryablePost = async <T extends RetryableResponse>(
  fn: () => PromiseLike<T>,
  isTransient: (response: T) => boolean,
  options?: RetryOptions,
  /** Injected only for tests; defaults to the real `sleep`. */
  sleepFn: (ms: number) => Promise<void> = sleep,
): Promise<T> => {
  const maxRetries = Math.max(0, options?.maxRetries ?? 5);
  const cap = Math.max(0, options?.retryBackoffMs ?? 30000);

  let attempt = 0;
  let response = await fn();

  while (isTransient(response) && attempt < maxRetries) {
    const status = Number(response.status);
    const retryAfterMs = parseRetryAfter(response.headers);
    const expBackoff = Math.min(
      cap,
      Math.round(2 ** attempt * 500 + (Math.random() - 0.5) * 500),
    );
    const sleepMs = Math.min(cap, retryAfterMs ?? expBackoff);

    warning(
      `Translator returned HTTP ${status} (attempt ${
        attempt + 1
      } of ${maxRetries}). Sleeping ${sleepMs}ms before retrying${
        retryAfterMs !== undefined ? " (Retry-After honored)" : ""
      }.`,
    );

    await sleepFn(Math.max(0, sleepMs));
    attempt++;
    response = await fn();
  }

  return response;
};

/**
 * Default predicate matching the codes we treat as transient. Exposed so
 * call sites that already have an `isUnexpected`-style guard can compose
 * the two cleanly: only retry when the response is BOTH unexpected AND
 * carries a transient status.
 */
export const isTransientStatus = (status: string | number): boolean => {
  const n = typeof status === "number" ? status : Number.parseInt(status, 10);
  return Number.isFinite(n) && TRANSIENT_STATUSES.has(n);
};
