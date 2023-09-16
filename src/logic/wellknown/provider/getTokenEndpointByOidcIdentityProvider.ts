import { OidcIdentityProvider } from '../../../domain/OidcIdentityProvider';

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
};

export const getTokenEndpointByOidcIdentityProvider = (
  provider: OidcIdentityProvider,
): string => PROVIDER_TO_TOKEN_ENDPOINT_REGISTRY[provider];
