import type { OidcTokenEndpointMalfunctionError } from '@src/domain.operations/errors/OidcTokenEndpointMalfunctionError';
import { OidcTokenRefreshExpiredError } from '@src/domain.operations/errors/OidcTokenRefreshExpiredError';
import { OidcTokenRequestRejectedError } from '@src/domain.operations/errors/OidcTokenRequestRejectedError';

import { asOidcTokenMalfunctionError } from './asOidcTokenMalfunctionError';
import { getUnknownObjectProp } from './getUnknownObjectProp';
import { httpClientMin, httpServerMin, httpTooMany } from './httpStatusBands';

/**
 * the milliseconds in one second, to convert a `Retry-After` delta-seconds hint
 */
const msPerSecond = 1000;

/**
 * .what = read a `Retry-After` header's delta-seconds hint into milliseconds
 * .why = a 429 caller backs off the provider-named interval instead of a blind retry
 *
 * note
 * - only a well-formed non-negative integer yields a number; a NaN / negative / the
 *   rfc-7231 http-date form (unhandled here) yields null — never a NaN leak
 */
const asRetryAfterMs = (
  headers: Record<string, unknown> | undefined,
): number | null => {
  const raw = headers?.['retry-after'];
  if (typeof raw !== 'string') return null;

  // delta-seconds form only; a http-date form yields NaN → treated as absent
  const seconds = Number(raw);
  if (!Number.isInteger(seconds) || seconds < 0) return null;

  return seconds * msPerSecond;
};

/**
 * .what = classify a non-2xx token-endpoint response into one typed error
 * .why = the caller discriminates re-auth vs fix-request vs retry from the thrown
 *        type alone — the pit-of-success guarantee of the refresh grant
 *
 * classification (status band first, then refine a 4xx by its error code):
 * - status >= 500        → OidcTokenEndpointMalfunctionError (💥) retry
 * - status === 429       → OidcTokenEndpointMalfunctionError (💥) retry with backoff
 * - status < 400         → OidcTokenEndpointMalfunctionError (💥) retry (an unexpected 3xx anomaly)
 * - 4xx + invalid_grant  → OidcTokenRefreshExpiredError      (✋) re-auth
 * - 4xx + other/absent   → OidcTokenRequestRejectedError     (✋) fix the request
 *
 * note
 * - a 4xx is a caller fault by http semantics, so an unrecognized 4xx defaults to
 *   fix-request (non-retryable) — a caller never loops-retries a request the provider
 *   will reject on every attempt. the one retryable 4xx is 429, pulled out ahead of the default
 * - a status below 400 (e.g. a 3xx redirect that axios did not auto-follow) is not a caller
 *   fault, so it is bounded out of the Rejected default and routed to Malfunction — the code
 *   and this comment agree that only the 400-499 band reaches the fix-request classification
 * - the error-code read is defensive: a non-object / non-json body yields null,
 *   which on a 4xx routes to the Rejected default rather than a raw TypeError
 */
export const asOidcTokenError = (input: {
  status: number;
  data: unknown;
  headers: Record<string, unknown> | undefined;
}):
  | OidcTokenRefreshExpiredError
  | OidcTokenRequestRejectedError
  | OidcTokenEndpointMalfunctionError => {
  const { status, data, headers } = input;

  // defensive read of the provider's `error` code from a possibly-malformed body
  const providerErrorRaw = getUnknownObjectProp({ from: data, key: 'error' });
  const providerError =
    typeof providerErrorRaw === 'string' ? providerErrorRaw : null;

  // a broken endpoint → retry (no backoff hint on a 5xx)
  // (metadata keys alphabetical so the JSON-embedded message and the structured metadata render alike)
  if (status >= httpServerMin)
    return asOidcTokenMalfunctionError({
      data,
      retryAfterMs: null,
      status,
    });

  // a rate-limit → retry, backed off the provider-named interval when present (else null)
  if (status === httpTooMany)
    return asOidcTokenMalfunctionError({
      data,
      retryAfterMs: asRetryAfterMs(headers),
      status,
    });

  // an unexpected non-4xx (e.g. a 3xx redirect that arrived here) is a provider anomaly → retry;
  // this bounds the Rejected default below to the 400-499 client-error band it documents
  if (status < httpClientMin)
    return asOidcTokenMalfunctionError({
      data,
      retryAfterMs: null,
      status,
    });

  // a dead refresh credential → re-auth
  // (Expired carries no `providerError` — unlike Rejected below — by design, not oversight: this
  // branch is reached ONLY when providerError === 'invalid_grant', so the cause is already fixed
  // by the error's type; there is no variable code to promote. Rejected DOES carry it because it
  // spans several codes (invalid_scope / invalid_request / invalid_client / absent) that a caller
  // must tell apart to fix the request)
  if (providerError === 'invalid_grant')
    return new OidcTokenRefreshExpiredError(
      'refresh token expired/revoked — re-authenticate',
      { data, status },
    );

  // any other 4xx (invalid_scope / invalid_request / invalid_client / absent) → fix the request
  // (`?? 'unrecognized'` guards a malformed 4xx with no `error` key against a literal "undefined")
  return new OidcTokenRequestRejectedError(
    `refresh request rejected: ${providerError ?? 'unrecognized'} — fix the request (scope/credentials), do not retry as-is`,
    { data, providerError, status },
  );
};
