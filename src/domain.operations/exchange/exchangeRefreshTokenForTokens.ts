import axios from 'axios';
import { type IsoTimeStamp, now } from 'iso-time';

import type { OidcTokenEndpointMalfunctionError } from '@src/domain.operations/errors/OidcTokenEndpointMalfunctionError';

import { asOidcTokenError } from './asOidcTokenError';
import { asOidcTokenMalfunctionError } from './asOidcTokenMalfunctionError';
import { asOidcTokenSuccess } from './asOidcTokenSuccess';
import { httpSuccessMax } from './httpStatusBands';

/**
 * .what = throw the leg's retryable malfunction from one place
 * .why = the three provider-fault paths (transport drop, malformed non-object body, absent
 *        access_token) all raise the SAME class; this helper throws the shared factory's error so
 *        a new fault path cannot drift in shape (rule-of-three), while the factory keeps the one
 *        construction site shared with the classifier `asOidcTokenError`
 */
const throwEndpointMalfunction = (
  metadata: OidcTokenEndpointMalfunctionError['metadata'],
): never => {
  throw asOidcTokenMalfunctionError(metadata);
};

/**
 * .what = POST the rfc-6749 §6 refresh_token grant and map the response to domain tokens
 * .why = the sole i/o boundary for the refresh grant; it takes flat wire scalars (never
 *        a domain object), owns axios + the transport catch, and delegates the two
 *        decode-friction concerns (error classification, expiry conversion) to transformers
 *
 * note
 * - client_id + client_secret ride in the body (rfc-6749 §2.3.1 MAY; mirrors the code-grant leaf)
 * - scope + resource are already-serialized scalars; a null scalar omits the wire param
 * - the body is a URLSearchParams so axios emits real application/x-www-form-urlencoded
 *   (a plain object would serialize as json, which the token endpoint rejects)
 * - validateStatus lets us classify every http status ourselves; axios still throws on a
 *   transport failure (no response), which we map to a retryable malfunction with its cause
 */
export const exchangeRefreshTokenForTokens = async (input: {
  endpoint: string;
  oidcClientId: string;
  oidcClientSecret: string;
  refreshToken: string;
  scope: string | null;
  resource: string | null;
}): Promise<{
  access: string;
  refresh: string | null;
  expiresAt: IsoTimeStamp | null;
}> => {
  const {
    endpoint,
    oidcClientId,
    oidcClientSecret,
    refreshToken,
    scope,
    resource,
  } = input;

  // POST the refresh grant; a transport failure (no response) is a retryable malfunction
  const response = await axios({
    method: 'POST',
    url: endpoint,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    data: new URLSearchParams({
      grant_type: 'refresh_token', // https://datatracker.ietf.org/doc/html/rfc6749#section-6
      refresh_token: refreshToken,
      client_id: oidcClientId,
      client_secret: oidcClientSecret,
      ...(scope !== null ? { scope } : {}),
      ...(resource !== null ? { resource } : {}), // https://www.rfc-editor.org/rfc/rfc8707
    }),
    validateStatus: () => true, // classify every status ourselves; axios errors lack good messages
  }).catch((error: unknown) => {
    // a rejection here is a transport failure (no http response) — always retryable;
    // validateStatus makes axios reject only for transport faults, never for a status.
    // status + data are null (no response ever arrived) so the metadata shape stays uniform
    // with the http-fault paths — a caller never guesses which fields are present
    // keys alphabetical so the JSON-embedded message and the structured metadata render alike
    return throwEndpointMalfunction({
      cause: error instanceof Error ? error : new Error(String(error)),
      data: null,
      retryAfterMs: null, // a transport fault carries no rate-limit backoff hint
      status: null,
    });
  });

  // a non-2xx response classifies into one typed error (re-auth / fix-request / retry)
  if (response.status > httpSuccessMax)
    throw asOidcTokenError({
      status: response.status,
      data: response.data,
      headers: response.headers,
    });

  // map the 2xx body to domain tokens; null = a malformed success (non-object body, or an
  // absent/non-string access_token) — a provider fault, retryable
  const success = asOidcTokenSuccess({ data: response.data, since: now() });
  if (success === null)
    return throwEndpointMalfunction({
      data: response.data,
      retryAfterMs: null, // a malformed 2xx carries no rate-limit backoff hint
      status: response.status,
    });

  return success;
};
