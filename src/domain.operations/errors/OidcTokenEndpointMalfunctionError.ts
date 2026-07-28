import { MalfunctionError } from 'helpful-errors';

/**
 * the token endpoint broke — the caller should back off and retry, never discard a good token
 * (5xx, 429 rate-limit, transport drop, or a malformed 2xx body)
 *
 * fault
 * - server-fault 💥 (extends MalfunctionError) — transient; a retry may succeed
 *
 * metadata — UNIFORM across every construction site, so a caller never guesses which fields are
 * present; absence is always an explicit `null`, never a dropped key (survives a JSON logger):
 * - `status` — the http status, or `null` on a transport fault (no response ever arrived)
 * - `data` — the raw response body, or `null` on a transport fault; verbatim + UNSCRUBBED
 *   (`unknown` by design) — a non-conformant endpoint or proxy could echo arbitrary/oversized
 *   content, so a caller that logs `.metadata.data` must treat it as untrusted (scrub / size-cap first)
 * - `retryAfterMs` — the provider's `Retry-After` hint (429) in ms, or `null` when there is no hint
 *   (a 5xx / transport / malformed fault); the caller backs off the named interval else a default
 * - `cause` — the transport error beneath (dropped socket / timeout); stays optional because an
 *   Error serializes to `{}` under JSON.stringify regardless of null-vs-undefined, so the
 *   JSON-survival rationale that pins the other three does not apply to it
 */
export class OidcTokenEndpointMalfunctionError extends MalfunctionError<{
  status: number | null;
  data: unknown;
  retryAfterMs: number | null;
  cause?: Error;
}> {}
