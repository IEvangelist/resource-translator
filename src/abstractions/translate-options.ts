/**
 * Translate-time options that are NOT properties of any specific vendor's
 * resource (auth, region, category) — these belong to the action's per-call
 * behavior (retries, placeholder protection, etc). They are provider-agnostic
 * so every translation provider (Azure, AWS, Google) honors them identically.
 */
export interface TranslateOptions {
  /** Wrap placeholders in sentinels before sending to the translator. */
  protectPlaceholders?: boolean;
  /** Extra regex patterns appended to the placeholder protector. */
  customPlaceholderPatterns?: readonly string[];
  /** Max retry attempts on transient translation failures. */
  maxRetries?: number;
  /** Cap (ms) on any single backoff sleep. */
  retryBackoffMs?: number;
}
