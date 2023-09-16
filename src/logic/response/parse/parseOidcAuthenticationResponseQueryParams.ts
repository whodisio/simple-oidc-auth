import { parseQueryParams } from 'url-fns';

import { OidcAuthenticationResponseMalformedError } from '../../errors/OidcAuthenticationResponseMalformedError';

/**
 * extract the oidc authentication response data present in the query params of a get request
 *
 * note
 * - this should not be used directly by callers of this library, instead callers should use `extractOidcAuthenticationResponse`
 */
export const parseOidcAuthenticationResponseQueryParams = ({
  queryParams,
}: {
  queryParams: Record<string, string>;
}): {
  oidcResponseCode: string;
  oidcRequestHash: string;
} => {
  // extract the oidc auth code from the query params
  const oidcResponseCode = queryParams.code;
  if (!oidcResponseCode)
    throw new OidcAuthenticationResponseMalformedError(
      'the `code` query parameter was missing from the authentication response query params',
      { queryParams },
    );

  // extract the challenge uuid from the query params
  const state = queryParams?.state;
  if (!state)
    throw new OidcAuthenticationResponseMalformedError(
      'the `state` query parameter was missing from the authentication response query params',
      {
        queryParams: {
          ...queryParams,
          code: '__REDACTED__', // redact the code from the error message to avoid exposing sensitive data
        },
      },
    );
  const parsedState = parseQueryParams(state);
  const oidcRequestHash = parsedState.hash;
  if (!oidcRequestHash)
    throw new OidcAuthenticationResponseMalformedError(
      'the `hash` was missing from the parsed output of the `state` query parameter',
      { state, parsedState },
    );

  // return both values
  return {
    oidcResponseCode,
    oidcRequestHash,
  };
};
