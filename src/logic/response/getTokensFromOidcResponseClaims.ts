import { OidcResponseClaims } from '../../domain/OidcResponseClaims';
import { exchangeOidcResponseCodeForTokens } from '../exchange/exchangeOidcResponseCodeForTokens';
import { verifyOidcRequestHashForResponse } from '../verify/hash/verifyOidcRequestHashForResponse';
import { computeOidcPkceCodeVerifier } from '../verify/pkce/computeOidcPkceCodeVerifier';

/**
 * allows securely exchanging the oidc response code for tokens
 *
 * tactic
 * - verify that the oidcResponseCode was intended for this responder
 *   - via verifying the oidcRequestHash
 *   - via computing the oidcPkceVerifier
 * - exchange the oidcResponseCode with the identity-provider for tokens
 *   -
 *
 * note
 * - this should be called with the values returned by `parseOidcAuthenticationResponse`
 */
export const getTokensFromOidcResponseClaims = async ({
  claims,
  provider,
  operator,
}: {
  /**
   * the claims sent on the response
   */
  claims: OidcResponseClaims;

  /**
   * configuration for the identity provider that is powering the oidc flow
   */
  provider: {
    /**
     * the token endpoint used to exchange the oidcResponseCode for tokens
     *
     * ref
     * - https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
     */
    tokenEndpoint: string;
  };

  /**
   * configuration for the operator of the oidc flow
   */
  operator: {
    /**
     * the client id issued to the operator by the identity-provider
     */
    oidcClientId: string;

    /**
     * the client secret issued to the operator by the identity-provider
     */
    oidcClientSecret: string;
  };
}): Promise<{ identity: string; access: string }> => {
  // verify that the securely claimed request inputs matches the publicly claimed request inputs
  await verifyOidcRequestHashForResponse({
    public: {
      oidcRequestHash: claims.public.oidcRequestHash,
    },
    secure: {
      oidcRequestUuid: claims.secure.oidcRequestUuid,
      userSessionUuid: claims.secure.userSessionUuid,
    },
  });

  // compute the pkce code verifier for the request
  const verifier = computeOidcPkceCodeVerifier({
    oidcRequestUuid: claims.secure.oidcRequestUuid,
    userSessionUuid: claims.secure.userSessionUuid,
  });

  // exchange the token with the identity provider
  const { identity, access } = await exchangeOidcResponseCodeForTokens({
    endpoint: provider.tokenEndpoint,
    oidcResponseCode: claims.public.oidcResponseCode,
    oidcClientId: operator.oidcClientId,
    oidcClientSecret: operator.oidcClientSecret,
    oidcRequestRedirectUri: claims.public.oidcRequestRedirectUri,
    oidcPkceCodeVerifier: verifier,
  });

  // return the identity and access tokens
  return { identity, access };
};
