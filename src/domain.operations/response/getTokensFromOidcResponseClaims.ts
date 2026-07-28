import type { OidcExchangeOperator } from '@src/domain.objects/OidcExchangeOperator';
import type { OidcExchangeProvider } from '@src/domain.objects/OidcExchangeProvider';
import type { OidcResponseClaims } from '@src/domain.objects/OidcResponseClaims';
import { exchangeOidcResponseCodeForTokens } from '@src/domain.operations/exchange/exchangeOidcResponseCodeForTokens';
import { verifyOidcRequestHashForResponse } from '@src/domain.operations/verify/hash/verifyOidcRequestHashForResponse';
import { computeOidcPkceCodeVerifier } from '@src/domain.operations/verify/pkce/computeOidcPkceCodeVerifier';

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
   * configuration for the identity provider that powers the oidc flow
   */
  provider: OidcExchangeProvider;

  /**
   * configuration for the operator of the oidc flow
   */
  operator: OidcExchangeOperator;
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
