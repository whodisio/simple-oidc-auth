# review.self: has-complete-hazard-scan

## scanned for

- test hazards
- cicd hazards
- path hazards
- config hazards

## found issues

### 1. repository URL mismatch (FIXED)

**what**: package.json changed repository URLs from `whodisio` to `whodis`
- `"repository": "whodis/simple-oidc-auth"` but actual repo is `whodisio/simple-oidc-auth`
- same for homepage and bugs URLs

**fix**: revert repository URLs back to `whodisio/simple-oidc-auth`

## non-issues

### path hazards: directory renames

the directory renames from `src/logic/` to `src/domain.operations/` and `src/domain/` to `src/domain.objects/` are handled correctly:
- all imports updated by declapract
- tsconfig path aliases added for `@src/*`
- no external consumers of internal paths (this is an npm package, exports via `src/index.ts`)

### config hazards: tsconfig changes

tsconfig changes are standard declapract patterns:
- extended configs updated to modern versions
- path aliases added
- module resolution updated to node16
- target updated to es2020

these changes are safe for an npm package consumed via dist.

### cicd hazards: workflow changes

workflows updated to use:
- pnpm instead of npm (matches packageManager in package.json)
- oidc for aws auth (falls back gracefully if not configured)
- test shard pattern (performance optimization)

no changes that break the test suite itself.

### test hazards: jest config changes

jest configs updated to use:
- @swc/jest instead of ts-jest (faster, compatible)
- moduleNameMapper for @src/* path alias
- reporters for slow test reports

snapshot tests will need `--updateSnapshot` if output format changed, but this is normal and expected.

## verdict

one issue found and fixed. all other changes are standard declapract patterns with no hazards.
