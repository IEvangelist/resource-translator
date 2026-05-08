export type LocalizedHtmlFragment = {
  readonly html: string;
};

export type LocalizedReplacement =
  | string
  | number
  | LocalizedHtmlFragment;

export type LocalizedReplacements = Readonly<Record<string, LocalizedReplacement>>;

type LinkOptions = {
  readonly external?: boolean;
  readonly className?: string;
  readonly ariaLabel?: string;
};

const placeholderPattern = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isHtmlFragment(value: LocalizedReplacement): value is LocalizedHtmlFragment {
  return typeof value === "object" && value !== null && "html" in value;
}

function replacementHtml(value: LocalizedReplacement): string {
  return isHtmlFragment(value) ? value.html : escapeHtml(String(value));
}

export function code(value: string | number): LocalizedHtmlFragment {
  return { html: `<code>${escapeHtml(String(value))}</code>` };
}

export function strong(value: string | number): LocalizedHtmlFragment {
  return { html: `<strong>${escapeHtml(String(value))}</strong>` };
}

export function em(value: string | number): LocalizedHtmlFragment {
  return { html: `<em>${escapeHtml(String(value))}</em>` };
}

export function link(
  label: string | number | LocalizedHtmlFragment,
  href: string,
  options: LinkOptions = {},
): LocalizedHtmlFragment {
  const className = options.className
    ? ` class="${escapeHtml(options.className)}"`
    : "";
  const ariaLabel = options.ariaLabel
    ? ` aria-label="${escapeHtml(options.ariaLabel)}"`
    : "";
  const external = options.external ? ' rel="noopener" target="_blank"' : "";

  return {
    html: `<a href="${escapeHtml(href)}"${className}${ariaLabel}${external}>${replacementHtml(label)}</a>`,
  };
}

export function renderLocalizedText(
  text: string,
  replacements: LocalizedReplacements = {},
): string {
  return escapeHtml(text).replace(placeholderPattern, (match, key: string) => {
    const replacement = replacements[key];
    return replacement === undefined ? match : replacementHtml(replacement);
  });
}
