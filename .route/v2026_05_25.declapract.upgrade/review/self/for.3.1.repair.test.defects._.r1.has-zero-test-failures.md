# review.self: has-zero-test-failures

## test run

```sh
rhx git.repo.test --what unit --mode apply --thorough
rhx git.repo.test --what integration --mode apply --thorough
```

## result

**PASSED** — zero failures

## evidence

```
🐚 git.repo.test --what unit --mode apply --thorough
   ├─ tests: 32 passed, 0 failed, 0 skipped

🐚 git.repo.test --what integration --mode apply --thorough
   ├─ tests: 4 passed, 0 failed, 3 skipped
```

## defects found and fixed

### 1. circular dependency in helpful-errors@1.5.3

- **what**: dpdm detected cycle in `node_modules/.pnpm/helpful-errors@1.5.3`
- **how**: transitive deps pinned helpful-errors@1.5.3 which has internal cycle
- **why**: HelpfulError.js imports withHelpfulError.js which imports HelpfulError.js
- **fix**:
  - upgraded declastruct 1.9.1 → 1.9.2
  - upgraded declastruct-github 1.4.0 → 1.5.4
  - upgraded test-fns 1.15.7 → 1.15.8
  - updated test:lint:cycles to use `--transform` flag and `.dpdmrc.yaml`

### 2. simple-jwt-auth module resolution failure

- **what**: TS2307 cannot find module 'simple-jwt-auth'
- **how**: package.json declared `main: dist/cjs/index.js` but actual output at `dist/index.js`
- **why**: declapract upgrade changed moduleResolution to "node16" which is stricter
- **fix**: filed whodisio/simple-jwt-auth#17, upstream fixed in 0.11.4

## skipped tests

3 integration tests skipped due to credential gates (expected behavior).

## verdict

**PASSED**: zero test failures. all defects from declapract upgrade have been resolved.
