import { UnexpectedCodePathError } from 'helpful-errors';
import { getAuthedClaims } from 'simple-jwt-auth';

import { OidcIdentityProvider } from '@src/domain.objects/OidcIdentityProvider';
import { getIssuerByOidcIdentityProvider } from '@src/domain.operations/wellknown/provider/getIssuerByOidcIdentityProvider';
import { getJwksEndpointByOidcIdentityProvider } from '@src/domain.operations/wellknown/provider/getJwksEndpointByOidcIdentityProvider';

import {
  isOfOidcIdentityTokenClaimsApple,
  type OidcIdentityTokenClaimsApple,
} from './isOfOidcIdentityTokenClaimsApple';
import {
  isOfOidcIdentityTokenClaimsGoogle,
  type OidcIdentityTokenClaimsGoogle,
} from './isOfOidcIdentityTokenClaimsGoogle';

export type OidcIdentityTokenClaims =
  | OidcIdentityTokenClaimsGoogle
  | OidcIdentityTokenClaimsApple;
// | OidcIdentityTokenClaimsFacebook;

/**
 * gets authed claims from an oidc identity or access token
 */
export const getAuthedClaimsFromOidcIdentityToken = async ({
  token,
  provider,
  oidcClientId,
}: {
  /**
   * the token that we will extract authed claims from
   */
  token: string;

  /**
   * the provider which issued this token
   *
   * note
   * - this will be used to lookup the expected issuer of the token
   */
  provider: OidcIdentityProvider;

  /**
   * the client id that the token was issued for
   *
   * note
   * - this will be used to lookup the expected audience of the token
   */
  oidcClientId: string;
}): Promise<OidcIdentityTokenClaims> => {
  // lookup the expected issuer for the token
  const issuer = getIssuerByOidcIdentityProvider(provider);

  // lookup whether we need to explicitly define the jwks uri for this provider (e.g., Google is apparently incapable of supporting the [OAuth2 Discovery Flow](https://tools.ietf.org/id/draft-ietf-oauth-discovery-08.html))
  const jwksUri = getJwksEndpointByOidcIdentityProvider(provider);

  // get authed claims from the token
  const claims = await getAuthedClaims({
    token,
    issuer,
    audience: oidcClientId,
    jwksUri: jwksUri ?? undefined,
  });

  // check that the claims look like they come from the expected provider to add type narrowing
  if (
    provider === OidcIdentityProvider.GOOGLE &&
    isOfOidcIdentityTokenClaimsGoogle(claims)
  )
    return claims;
  if (
    provider === OidcIdentityProvider.APPLE &&
    isOfOidcIdentityTokenClaimsApple(claims)
  )
    return claims;

  // if we reached here, then something was wrong with the claims
  throw new UnexpectedCodePathError(
    'unexpected claims for oidc identity token for this provider',
    { provider, issuer, claims },
  );
};
