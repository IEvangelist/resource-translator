/**
 * Runs `mapper` over `items` with at most `limit` promises in flight at once,
 * preserving input order in the returned array. Used by vendors whose SDK
 * translates a single string per call (e.g. AWS) so we can fan out without
 * overwhelming the service or tripping throttling limits.
 */
export const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  const workerCount = Math.max(1, Math.min(limit, items.length || 1));
  let cursor = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) {
        return;
      }
      results[index] = await mapper(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
};
