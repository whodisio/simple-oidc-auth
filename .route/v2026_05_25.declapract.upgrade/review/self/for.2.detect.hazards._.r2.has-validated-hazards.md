# review.self r2: has-validated-hazards

## pause and reflect

took a second look at each hazard. questioned whether any were mistaken.

## hazard 1: circular dependency in helpful-errors

**is this mistaken?** no.

**why it holds**:
- ran `npm run test:lint:cycles` — fails with exit code 1
- cycle is real: `helpful-errors@1.5.3` HelpfulError.js -> withHelpfulError.js
- this is a transitive dependency from declapract-typescript-ehmpathy, declastruct, declastruct-github
- user explicitly said "no overrides" — we must wait for upstream fix

**conclusion**: real blocker, no fix available without overrides.

## hazard 2: type export for OidcResponseClaims

**is this mistaken?** no.

**why it holds**:
- ran `npm run test:types` — passes
- typescript isolatedModules requires `export type` for type-only re-exports
- fix was correct: changed `export { OidcResponseClaims }` to `export type { OidcResponseClaims }`

**conclusion**: real issue, fix is correct.

## hazard 3: pkg.private reference in provision

**is this mistaken?** no.

**why it holds**:
- package.json does not have a `private` field
- declapract template expected `pkg.private` but public packages don't have it
- hardcode `visibility: 'public'` and `private: false` is correct for public npm package

**conclusion**: real issue, fix is correct.

## hazard 4: unused dev dependencies

**is this mistaken?** no.

**why it holds**:
- ran `npm run test:lint:deps` — passes with "No depcheck issue"
- packages were orphaned after eslint/prettier -> biome migration
- @trivago/prettier-plugin-sort-imports: was prettier plugin, no longer needed
- @tsconfig/node-lts-strictest: replaced by @tsconfig/strictest + @tsconfig/node20
- core-js: was jest setupFiles, no longer used with @swc/jest
- ts-jest: replaced by @swc/jest
- ts-node: replaced by tsx

**conclusion**: real issues, removals correct.

## hazard 5: repository URL mismatch

**is this mistaken?** no.

**why it holds**:
- `gh repo view` shows repo is `whodisio/simple-oidc-auth`
- package.json was changed by declapract to `whodis/simple-oidc-auth`
- this was likely a template variable issue in declapract.use.yml
- fixed by update to correct `whodisio` URLs

**conclusion**: real issue, fix is correct.

## verdict

reviewed all 5 hazards. none mistaken. all validated via tests or external verification.

one blocker remains: circular dependency in helpful-errors@1.5.3. wait for upstream fix.
