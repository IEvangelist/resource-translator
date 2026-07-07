const REPO = "IEvangelist/resource-translator";

/**
 * Memoized so the whole static build (hundreds of localized pages) makes a
 * single unauthenticated GitHub API call instead of one per rendered footer —
 * which would blow the 60 req/hr rate limit and yield inconsistent counts.
 */
let cached: Promise<string | null> | undefined;

async function fetchStarCount(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: {
        "User-Agent": "resource-translator-docs",
        Accept: "application/vnd.github+json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const data = (await response.json()) as { stargazers_count?: unknown };
    return typeof data.stargazers_count === "number"
      ? new Intl.NumberFormat("en").format(data.stargazers_count)
      : null;
  } catch {
    // Offline builds / rate limiting / timeouts degrade gracefully to no count.
    return null;
  }
}

/** Formatted stargazer count (e.g. "1,024"), or null when unavailable. */
export function getStarCount(): Promise<string | null> {
  cached ??= fetchStarCount();
  return cached;
}
