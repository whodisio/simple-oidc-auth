import { OidcTokenEndpointMalfunctionError } from '@src/domain.operations/errors/OidcTokenEndpointMalfunctionError';

/**
 * .what = build the leg's retryable malfunction from one place
 * .why = the retryable-fault paths span two files — the classifier `asOidcTokenError` (5xx, 429,
 *        an unexpected sub-400 anomaly) and the communicator `exchangeRefreshTokenForTokens`
 *        (transport drop, malformed non-object body, absent access_token). one factory funnels
 *        every one through a single construction site, so a new fault path cannot drift the class
 *        or the message in either file (rule-of-three, satisfied twice over)
 *
 * note
 * - the classifier `return`s this error; the communicator `throw`s it — the factory is neutral
 *   to which, so both legs share the exact same construction
 * - the metadata shape is typed off the class itself, so it lives in exactly one place
 */
export const asOidcTokenMalfunctionError = (
  metadata: OidcTokenEndpointMalfunctionError['metadata'],
): OidcTokenEndpointMalfunctionError =>
  new OidcTokenEndpointMalfunctionError(
    'token endpoint malfunction — retry with backoff',
    metadata,
  );
