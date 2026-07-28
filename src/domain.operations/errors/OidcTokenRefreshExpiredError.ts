import { ConstraintError } from 'helpful-errors';

/**
 * the refresh token is dead — the caller must re-authenticate (rfc-6749 §5.2 `invalid_grant`)
 *
 * fault
 * - caller-fault ✋ (extends ConstraintError) — the credential is spent
 *
 * note
 * - `invalid_grant` covers revoked / expired / issued-to-another-client; the exact provider
 *   reason rides in the metadata. recovery is identical (re-auth) for every cause.
 *
 * metadata:
 * - `status` — the http status the provider answered with (typically 400)
 * - `data` — the raw provider response body, verbatim + UNSCRUBBED (`unknown` by design); a caller
 *   that logs `.metadata.data` must treat it as untrusted input (scrub / size-cap first)
 */
export class OidcTokenRefreshExpiredError extends ConstraintError<{
  status: number;
  data: unknown;
}> {}
