import { OidcIdentityProvider } from '../../../domain/OidcIdentityProvider';

/**
 * a lookup map which defines the jwks-endpoint for each identity provider
 *
 * note
 * - the type definition ensures that if we're missing the value for any providers, there will be a type error
 */
const PROVIDER_TO_TOKEN_ENDPOINT_REGISTRY: Record<
  OidcIdentityProvider,
  string | null
> = {
  [OidcIdentityProvider.GOOGLE]: 'https://www.googleapis.com/oauth2/v3/certs', // per https://cloud.google.com/api-gateway/docs/authenticating-users-googleid
  [OidcIdentityProvider.APPLE]: 'https://appleid.apple.com/auth/keys', // per https://developer.apple.com/documentation/sign_in_with_apple/fetch_apple_s_public_key_for_verifying_token_signature
  [OidcIdentityProvider.FACEBOOK]: null,
};

/**
 * get the jwks endpoint at which the public key used to sign jwt's from this identity provider is published
 *
 * note
 * - this is useful particularly for the providers who are apparently incapable of supporting the [oauth2 discovery flow](https://tools.ietf.org/id/draft-ietf-oauth-discovery-08.html)
 */
export const getJwksEndpointByOidcIdentityProvider = (
  provider: OidcIdentityProvider,
): string | null => PROVIDER_TO_TOKEN_ENDPOINT_REGISTRY[provider];
