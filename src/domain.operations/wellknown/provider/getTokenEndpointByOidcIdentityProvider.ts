import { OidcIdentityProvider } from '@src/domain.objects/OidcIdentityProvider';

/**
 * a lookup map which defines the token-endpoint for each identity provider
 *
 * note
 * - the type definition ensures that if we're missing the value for any providers, there will be a type error
 */
const PROVIDER_TO_TOKEN_ENDPOINT_REGISTRY: Record<
  OidcIdentityProvider,
  string
> = {
  [OidcIdentityProvider.GOOGLE]: 'https://oauth2.googleapis.com/token', // per https://developers.google.com/identity/openid-connect/openid-connect#exchangecode
  [OidcIdentityProvider.APPLE]: 'https://appleid.apple.com/auth/token', // per https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens
  [OidcIdentityProvider.FACEBOOK]:
    'https://graph.facebook.com/v17.0/oauth/token', // per https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow#exchangecode
  // caveat: facebook's endpoint does NOT speak the rfc-6749 §6 refresh_token grant — it uses a
  // non-standard long-lived-token exchange. so this endpoint is valid for the code grant
  // (getTokensFromOidcResponseClaims) but NOT for getTokensFromOidcRefreshClaims, which is scoped
  // to standards-compliant providers; a facebook refresh surfaces as a typed OidcToken* error
};

export const getTokenEndpointByOidcIdentityProvider = (
  provider: OidcIdentityProvider,
): string => PROVIDER_TO_TOKEN_ENDPOINT_REGISTRY[provider];
