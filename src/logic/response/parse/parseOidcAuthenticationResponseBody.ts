import { parseQueryParams } from 'url-fns';

import { base64UrlDecode } from '../../base64Url/base64UrlDecode';
import { OidcAuthenticationResponseMalformedError } from '../../errors/OidcAuthenticationResponseMalformedError';

/**
 * extract the oidc authentication response data present in the query params of a post request
 *
 * note
 * - this should not be used directly by callers of this library, instead callers should use `extractOidcAuthenticationResponse`
 */
export const parseOidcAuthenticationResponseBody = ({
  body,
}: {
  body: string;
}): {
  oidcResponseCode: string;
  oidcRequestHash: string;
} => {
  // base64 decode the body
  const decoded = base64UrlDecode(body);

  // queryparams parse the body, since that is how formposts are encoded
  const parsed = parseQueryParams(decoded);

  // extract the oidc auth code from the parsed body
  const oidcResponseCode = parsed.code;
  if (!oidcResponseCode)
    throw new OidcAuthenticationResponseMalformedError(
      'the `code` parameter was missing from the authentication response body',
      { parsed },
    );

  // extract the challenge uuid from the parsed body
  const state = parsed.state;
  if (!state)
    throw new OidcAuthenticationResponseMalformedError(
      'the `state` parameter was missing from the authentication response body',
      {
        parsed: {
          ...parsed,
          code: '__REDACTED__', // redact the code from the error message to avoid exposing sensitive data
        },
      },
    );
  const parsedState = parseQueryParams(state);
  const oidcRequestHash = parsedState.hash;
  if (!oidcRequestHash)
    throw new OidcAuthenticationResponseMalformedError(
      'the `hash` was missing from the parsed output of the `state` parameter',
      { state, parsedState },
    );

  // return both values
  return {
    oidcResponseCode,
    oidcRequestHash,
  };
};
