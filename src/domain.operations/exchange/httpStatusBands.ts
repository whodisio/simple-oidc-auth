/**
 * the http status bands the refresh-grant token exchange classifies by
 *
 * why one file: the communicator (`exchangeRefreshTokenForTokens`) and the classifier
 * (`asOidcTokenError`) both partition the same status axis; co-located here so a new band is
 * added in ONE place, with no drift across the two consumers (both live under `exchange/`,
 * their common ancestor)
 */

/**
 * the highest 2xx status; a status above it is a non-success the classifier must handle
 */
export const httpSuccessMax = 299;

/**
 * the low bound of the 4xx client-error band; a status below it (e.g. a 3xx redirect)
 * is not a caller fault, so it must not fall through to the Rejected default
 */
export const httpClientMin = 400;

/**
 * a 429 names a rate-limit — transient, retryable, distinct from a request to fix
 */
export const httpTooMany = 429;

/**
 * a 5xx or worse names a broken endpoint — a server fault; the caller should retry
 */
export const httpServerMin = 500;
