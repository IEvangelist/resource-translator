# Security Policy

## Supported versions

Only the most recent **major** release line of `IEvangelist/resource-translator`
receives security fixes.

| Version  | Status                |
|----------|-----------------------|
| `v3.x`   | ✅ Active (Node 24)   |
| `v2.x`   | ⚠️ End-of-life (Node 16, no longer supported by GitHub Actions) |
| `< v2.0` | ❌ Unsupported        |

Pin your workflow to `@v3` (rolling) or to a specific tag like `@v3.0.0` to
receive automatic patch updates.

## Reporting a vulnerability

**Please do _not_ open a public issue for security reports.**

Use one of the following private channels:

1. **GitHub Security Advisories** — preferred. Open a private advisory at
   <https://github.com/IEvangelist/resource-translator/security/advisories/new>.
2. **Direct contact** — email the maintainer with the subject
   `[SECURITY] resource-translator: <short summary>`. See the maintainer's
   GitHub profile for current contact details.

Please include:

- A clear description of the issue and the impact you observed
- Reproduction steps, including a minimal workflow file when possible
- Affected versions and runtime environment
- Any suggested mitigation

We aim to acknowledge new reports within **3 business days** and will
coordinate a patch + advisory + CVE assignment as warranted.

## Threat model

`resource-translator` runs **inside** your repository's GitHub Actions runner.
It:

- Reads source-language resource files from the workspace.
- Calls the Azure AI Translator REST API using the subscription key you
  supply via the `subscriptionKey` input (which should always come from a
  secret).
- Writes translated sibling files back to the workspace.

It does **not** open pull requests on its own. PR creation is delegated to a
companion step (e.g. `peter-evans/create-pull-request`) so that the secrets
required for translation never need PR-creation scopes.

## Dependency hygiene

- `npm audit` is run in CI; the suite must be clean before any release.
- Dependabot is configured for `npm`, `github-actions`, and the `docs/`
  Astro site. Patch + minor PRs auto-merge once required CI is green; major
  bumps await human review.
- The action bundle (`dist/resource-translator/index.js`) is rebuilt by the
  `dist-build` workflow and verified to match `src/` by `dist-check`.
