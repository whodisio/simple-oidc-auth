# review.self: has-validated-hazards

## validation method

ran tests to prove/disprove each hazard.

## hazard 1: circular dependency in helpful-errors

**status**: VALIDATED as BLOCKER

**proof**:
```sh
npm run test:lint:cycles
# exit code 1
# Circular Dependencies
#   1) node_modules/.pnpm/helpful-errors@1.5.3/node_modules/helpful-errors/dist/HelpfulError.js
#      -> node_modules/.pnpm/helpful-errors@1.5.3/node_modules/helpful-errors/dist/withHelpfulError.js
```

this hazard is real and blocks the upgrade until upstream dependencies are updated.

## hazard 2: type export for OidcResponseClaims

**status**: VALIDATED as FIXED

**proof**:
```sh
npm run test:types
# exit code 0
```

the `export type` fix is correct.

## hazard 3: pkg.private reference in provision

**status**: VALIDATED as FIXED

**proof**:
```sh
npm run test:types
# exit code 0
```

hardcoded `visibility: 'public'` and `private: false` compiles correctly.

## hazard 4: unused dev dependencies

**status**: VALIDATED as FIXED

**proof**:
```sh
npm run test:lint:deps
# No depcheck issue
```

all unused packages removed.

## additional hazard found in review

### 5. repository URL mismatch (FIXED)

**what**: package.json had incorrect repository URLs
- `whodis/simple-oidc-auth` should be `whodisio/simple-oidc-auth`

**proof**: `gh repo view` shows actual repo is `whodisio/simple-oidc-auth`

**fix**: updated all URLs in package.json to use `whodisio`

## verdict

all hazards validated. one blocker remains (circular dependency). other fixes confirmed via tests.
