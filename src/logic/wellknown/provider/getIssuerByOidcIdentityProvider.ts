import { OidcIdentityProvider } from '../../../domain/OidcIdentityProvider';

/**
 * a lookup map which defines the token issuer for each identity provider
 *
 * note
 * - the type definition ensures that if we're missing the value for any providers, there will be a type error
 */
export const PROVIDER_TO_TOKEN_ISSUER_REGISTRY: Record<
  OidcIdentityProvider,
  string
> = {
  [OidcIdentityProvider.GOOGLE]: 'https://accounts.google.com', // per https://developers.google.com/identity/openid-connect/openid-connect#exchangecode
  [OidcIdentityProvider.APPLE]: 'https://appleid.apple.com', // per https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/verifying_a_user
  [OidcIdentityProvider.FACEBOOK]: 'https://www.facebook.com', // per https://www.facebook.com/.well-known/openid-configuration/
};

export const getIssuerByOidcIdentityProvider = (
  provider: OidcIdentityProvider,
): string => PROVIDER_TO_TOKEN_ISSUER_REGISTRY[provider];
