import type { IsoTimeStamp } from 'iso-time';

import { asExpiresAt } from './asExpiresAt';
import { getUnknownObjectProp } from './getUnknownObjectProp';

/**
 * .what = map a 2xx token-endpoint body into the domain success tokens, or null when malformed
 * .why = the success path is decode-friction (untrusted-body guard, snake_case→camelCase read,
 *        rotation default, expiry conversion) exactly like the failure path that
 *        `asOidcTokenError` owns; a named pure transformer keeps the communicator symmetric —
 *        both legs delegate their decode-friction, neither inlines it (rule.require.named-transformers)
 *
 * null = a malformed success (not a json object, or an absent/non-string access_token); the
 * communicator maps that null to a retryable OidcTokenEndpointMalfunctionError, so the caller
 * never receives a token-less success. a non-null result is always a usable access token.
 *
 * note
 * - pure: `since` is passed in (the reference instant), so this does no clock read; the
 *   communicator reads `now()` once and hands it in, so impurity stays at the i/o edge
 * - access_token is REQUIRED — an absent, non-string, or EMPTY one yields null (→ Malfunction),
 *   the same fatal treatment an absent token deserves (a success with no usable access token is
 *   unusable; an empty string is "no token" in spirit and must not pass as a valid success)
 * - refresh_token is OPTIONAL — absent means "no rotation". a non-string OR EMPTY refresh_token is
 *   coalesced to null (read as no rotation), NOT escalated to a fault: the deliberate
 *   pit-of-success is that the caller keeps its current live refresh token rather than
 *   persist an unusable value, and "no usable rotation token" is the safe read of any
 *   non-string-or-empty here (an absent field is already a valid spec outcome, rfc-6749 §6)
 * - expires_in is OPTIONAL — a non-number is coalesced to null (explicit "unknown expiry"),
 *   the same shape asExpiresAt already returns for an omitted lifetime
 */
export const asOidcTokenSuccess = (input: {
  /**
   * the parsed 2xx response body (untrusted — may be any shape or a non-object)
   */
  data: unknown;

  /**
   * the reference instant the lifetime counts from (the moment the response landed)
   */
  since: IsoTimeStamp;
}): {
  access: string;
  refresh: string | null;
  expiresAt: IsoTimeStamp | null;
} | null => {
  const { data, since } = input;

  // a body that is not a json object is a malformed success → null (communicator maps to Malfunction)
  // (guard before the reads so a null/string/number body yields null, not a raw TypeError)
  if (typeof data !== 'object' || data === null) return null;

  // read each field via the shared cast-free untrusted-object read
  const accessToken = getUnknownObjectProp({ from: data, key: 'access_token' });
  const refreshTokenNew = getUnknownObjectProp({
    from: data,
    key: 'refresh_token',
  });
  const expiresIn = getUnknownObjectProp({ from: data, key: 'expires_in' });

  // an absent / non-string / EMPTY access_token is a malformed success → null (the one fatal field)
  if (typeof accessToken !== 'string' || accessToken.length === 0) return null;

  // surface a rotated refresh token; a non-string OR empty (absent/malformed) reads as no rotation
  const refresh =
    typeof refreshTokenNew === 'string' && refreshTokenNew.length > 0
      ? refreshTokenNew
      : null;

  // convert the lifetime to an absolute instant; a non-number reads as unknown expiry
  const expiresAt = asExpiresAt({
    expiresIn: typeof expiresIn === 'number' ? expiresIn : null,
    since,
  });

  return { access: accessToken, refresh, expiresAt };
};
