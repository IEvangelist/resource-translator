// Locale-neutral release history for versions prior to 3.0.0.
//
// The canonical, authoritative changelog is CHANGELOG.md at the repository root;
// this mirrors its pre-3.0.0 entries so the docs changelog page can render the
// full version history. Version numbers and dates are locale-independent, and
// the short summaries intentionally stay in English (the docs i18n layer falls
// back to English for untranslated strings anyway).

export type HistoricalRelease = {
  /** Semantic version, e.g. "2.2.1". */
  readonly version: string;
  /** ISO 8601 release date (YYYY-MM-DD). */
  readonly date: string;
  /** Short, human-readable summary lines for the release. */
  readonly changes: readonly string[];
};

export const releaseHistory: readonly HistoricalRelease[] = [
  {
    version: "2.2.1",
    date: "2024-01-05",
    changes: [
      "Security: bumped axios (1.4.0 → 1.6.0), @babel/traverse, semver, and tough-cookie/@azure/ms-rest-js to clear Dependabot alerts.",
    ],
  },
  {
    version: "2.2.0",
    date: "2023-07-05",
    changes: ["Maintenance release (dependency and dist refresh)."],
  },
  {
    version: "2.1.9",
    date: "2023-04-11",
    changes: [
      "Dependency upgrades (including xml2js 0.4.23 → 0.5.0) and a refreshed dist build.",
    ],
  },
  {
    version: "2.1.8",
    date: "2023-01-02",
    changes: [
      "Security: bumped follow-redirects, node-fetch, decode-uri-component, minimist, ansi-regex, jsdom, json5, minimatch, and @actions/core (1.2.6 → 1.9.1).",
    ],
  },
  {
    version: "2.1.7",
    date: "2021-12-09",
    changes: [
      "Use a different delimiter when building the translation map so keys containing the previous separator are handled correctly (#36).",
      "Fixes #32.",
    ],
  },
  {
    version: "2.1.6",
    date: "2021-08-04",
    changes: ["Assorted bug fixes and improved logging."],
  },
  {
    version: "2.1.5",
    date: "2021-07-28",
    changes: ["Fix an issue with file names containing four segments."],
  },
  {
    version: "2.1.4",
    date: "2021-05-20",
    changes: ["Added a JSON parser and .json file support.", "Fix batching bug (#18)."],
  },
  {
    version: "2.1.3",
    date: "2021-02-22",
    changes: ["Maintenance release."],
  },
  {
    version: "2.1.2",
    date: "2021-02-18",
    changes: ["Fixes #15."],
  },
  {
    version: "2.1.1",
    date: "2020-12-02",
    changes: ["Fix the generated step summary."],
  },
  {
    version: "2.1.0",
    date: "2020-12-01",
    changes: [
      "Support for additional resource file formats beyond .resx: .ini, .po, .restext, and .xliff.",
    ],
  },
  {
    version: "2.0.4",
    date: "2020-11-17",
    changes: ["Maintenance release."],
  },
  {
    version: "2.0.3",
    date: "2020-11-15",
    changes: ["Fixes a batching bug and other related issues."],
  },
  {
    version: "2.0.2",
    date: "2020-11-12",
    changes: [
      "File filtering to limit excessive translations.",
      "Batching of the translate API call to avoid rate limiting.",
    ],
  },
  {
    version: "2.0.1",
    date: "2020-11-12",
    changes: [
      "New action outputs: has-new-translations, summary-title, and summary-details.",
      "Fix a bug where an error was logged but the action failure was not set.",
    ],
  },
  {
    version: "2.0.0",
    date: "2020-11-06",
    changes: ["First official, fully functional and verified release."],
  },
  {
    version: "1.0.1",
    date: "2020-11-05",
    changes: ["Build release."],
  },
  {
    version: "1.0.0",
    date: "2020-11-05",
    changes: [
      "Initial release of the Azure AI Translator resource action (.resx support).",
    ],
  },
  {
    version: "0.0.x",
    date: "2020-10-31",
    changes: ["Initial prototype pre-releases (tags 0.01–0.09)."],
  },
];
