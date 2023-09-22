import { stringifyQueryParams, updateUrl } from 'url-fns';

/**
 * a method to safely get an oidc authentication uri
 *
 * ref
 * - https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest
 */
export const getOidcAuthenticationRequestUri = ({
  provider,
  operator,
  request,
}: {
  /**
   * information about the identity-provider which will be powering this oidc request
   */
  provider: {
    /**
     * the authentication endpoint of the identity provider
     */
    authenticationEndpoint: string;
  };

  /**
   * information about the operator which is leveraging this oidc request
   */
  operator: {
    /**
     * the client_id granted by the identity-provider used to identify the operator
     */
    clientId: string;
  };

  /**
   * information about the request itself
   */
  request: {
    /**
     * the scopes to request authorization for
     *
     * for example
     * - `openid name email`
     *
     * note
     * - the scope _must_ at least include `openid`
     */
    scope: string;

    /**
     * the `hash` which will be forwarded by the identity-provider on the response to enable the backend to verify that the responder has ownership of the secure claims
     */
    hash: string;

    /**
     * the `pkce` code challenge which will be used by the identity-provider at token exchange to verify that the actual responder was the intended responder
     *
     * ref
     * - https://datatracker.ietf.org/doc/html/rfc7636#section-4.3
     */
    pkce: string;

    /**
     * the redirect uri to which the response will be sent by the identity-provider
     *
     * note
     * - if authorization was successful, this route will be given the `code` which can be exchanged for an access-token by their backend
     * - if authorization was unsuccessful, this route will be given the reason for why it was unsuccessful
     * - this must be pre-registered with the openid provider and can not contain wildcards
     */
    redirectUri: string;
  };
}): string => {
  // validate that the scope includes "openid"
  if (!request.scope.split(' ').includes('openid'))
    throw new Error('scope must include openid for reliability'); // "the behavior is entirely unspecified."

  // return the full authentication request url
  return updateUrl({
    from: provider.authenticationEndpoint,
    with: {
      queryParams: {
        client_id: operator.clientId,
        response_type: 'code', // hardcoded to ensure that we only allow the `authcode` verification strategy
        code_challenge: request.pkce,
        code_challenge_method: 'S256',
        scope: request.scope,
        redirect_uri: request.redirectUri,
        state: stringifyQueryParams({ hash: request.hash }),
        response_mode: 'form_post', // required by apple; supported by others
      },
    },
  });
};
