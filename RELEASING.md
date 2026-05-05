# Releasing

Releases of the `resource-translator` GitHub Action are tagged from `main` once
CI is green and the `dist/` bundle has been refreshed.

## Steps

1. Make sure `main` is green and `dist/` is up to date (CI's `dist-check`
   workflow enforces this on every PR; the `dist-build` workflow opens a PR
   when bundle output drifts after a merge).
2. Update `CHANGELOG.md` with the new version's notes (Keep a Changelog format).
3. Bump `package.json` `version` (e.g. `3.0.0`).
4. Commit:
   ```bash
   git commit -am "chore(release): vX.Y.Z"
   ```
5. Tag and push:
   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin main --follow-tags
   ```

The `release` workflow then:

- Reinstalls deps, runs lint/format/test/build.
- Verifies that the committed `dist/` matches a fresh build.
- Force-pushes the rolling major tag (e.g. `v3`) to point at the new release.
- Creates a GitHub Release with auto-generated notes.

## Versioning

We follow [SemVer](https://semver.org):

- **Major** — breaking changes (e.g., dropping Node 20 support, removing or
  renaming inputs).
- **Minor** — new features that are additive and backwards compatible.
- **Patch** — bug fixes and dependency updates.

Consumers should pin to the rolling major tag (e.g. `IEvangelist/resource-translator@v3`)
to receive non-breaking improvements automatically.
