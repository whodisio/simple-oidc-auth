import { OidcResponseClaims } from '../../../domain/OidcResponseClaims';
import { OidcAuthenticationResponseMalformedError } from '../../errors/OidcAuthenticationResponseMalformedError';
import { extractOidcRequestUuidFromOriginationCookie } from './extractOidcRequestUuidFromOriginationCookie';
import { extractUserSessionUuidFromAuthorizationCookie } from './extractUserSessionUuidFromAuthorizationCookie';
import { parseOidcAuthenticationResponseBody } from './parseOidcAuthenticationResponseBody';
import { parseOidcAuthenticationResponseQueryParams } from './parseOidcAuthenticationResponseQueryParams';

/**
 * parse the oidc authentication response data sent to a redirect endpoint via rest.get or rest.post
 *
 * features
 * - handles successful responses by extracting the `oidcResponseCode` and `oidcRequestHash` from the identity provider as well as the `authRequestUuid` and `userSessionUuid` from the samesite cookies
 * - handles unsuccessful responses by extracting the error from the [error response](https://openid.net/specs/openid-connect-core-1_0.html#AuthError)
 */
export const parseOidcAuthenticationResponse = async ({
  method,
  endpoint,
  headers,
  queryParams,
  body,
  session,
}: {
  /**
   * the rest method of the request
   */
  method: 'GET' | 'POST';

  /**
   * the redirect uri endpoint to which this response was sent
   */
  endpoint: string;

  /**
   * the headers of the request
   *
   * note
   * - the `authRequestUuid` and `userSessionUuid` will be extracted from here
   */
  headers: Record<string, string>;

  /**
   * the query parameters of the request
   *
   * note
   * - the oidcResponseCode and oidcRequestHash will be extracted from here, when method=GET
   */
  queryParams: Record<string, string> | null;

  /**
   * the body of the request
   *
   * note
   * - the oidcResponseCode and oidcRequestHash will be extracted from here, when method=POST
   */
  body: string | null;

  /**
   * the expected session auth configuration for the request
   *
   * note
   * - specifies the issuer and audience you expect authed session tokens to be issued from
   * - uses simple-jwt-auth.getAuthedClaims under the hood with these parameters if a token is found
   */
  session: {
    /**
     * the exact issuer you expect authed tokens to come from
     */
    issuer: string;

    /**
     * the exact audience you expect authed tokens to be intended for
     */
    audience: string;
  };
}): Promise<OidcResponseClaims> => {
  // extract the oidc request uuid from the origination cookie
  const { oidcRequestUuid } = extractOidcRequestUuidFromOriginationCookie({
    headers,
  });

  // extract the user session uuid from the authentication token, if possible
  const { userSessionUuid } =
    await extractUserSessionUuidFromAuthorizationCookie({ headers, session });

  // extract code and hash from the response based on method
  const { oidcResponseCode, oidcRequestHash } = await (async () => {
    // handle get request
    if (method === 'GET') {
      // check that query params were defined
      if (!queryParams)
        throw new OidcAuthenticationResponseMalformedError(
          'query params must be defined for a get request',
        );

      // grab the results from the query params
      return parseOidcAuthenticationResponseQueryParams({
        queryParams,
      });
    }

    // handle post method
    if (method === 'POST') {
      // check that body was defined
      if (!body)
        throw new OidcAuthenticationResponseMalformedError(
          'body must be defined for a post request',
        );

      // grab the results from the query params
      return parseOidcAuthenticationResponseBody({
        body,
      });
    }

    // handle unknown request
    throw new OidcAuthenticationResponseMalformedError(
      'this method is not supported',
      { method },
    );
  })();

  // return the results
  return {
    public: {
      oidcResponseCode,
      oidcRequestHash,
      oidcRequestRedirectUri: endpoint,
    },
    secure: {
      oidcRequestUuid,
      userSessionUuid,
    },
  };
};
