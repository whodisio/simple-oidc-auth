import { ConstraintError } from 'helpful-errors';

/**
 * the refresh request itself was rejected — the caller must fix the request, not re-auth or retry
 * (rfc-6749 §5.2 `invalid_scope` / `invalid_request` / `invalid_client`)
 *
 * fault
 * - caller-fault ✋ (extends ConstraintError) — the token may be alive, but the request asked wrong
 *
 * metadata:
 * - `status` — the http status the provider answered with (typically 400 / 401)
 * - `data` — the raw provider response body, verbatim + UNSCRUBBED (`unknown` by design); a caller
 *   that logs `.metadata.data` must treat it as untrusted input (scrub / size-cap first)
 * - `providerError` — the provider's `error` code (e.g. invalid_scope), or null when the body
 *   lacked one; absence is `null`, never `undefined`, so it survives a JSON logger. promoted onto
 *   `.metadata` so a caller has programmatic (non-string-parse) access to the exact rejection code
 */
export class OidcTokenRequestRejectedError extends ConstraintError<{
  status: number;
  data: unknown;
  providerError: string | null;
}> {}
