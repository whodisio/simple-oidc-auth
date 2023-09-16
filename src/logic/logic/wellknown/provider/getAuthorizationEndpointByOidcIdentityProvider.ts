import { OidcIdentityProvider } from '../../../../domain/OidcIdentityProvider';
import { UnexpectedCodePathError } from '../../../../utils/errors/UnexpectedCodePathError';

/**
 * a lookup map which defines the authorization endpoint for each identity provider
 *
 * note
 * - the type definition ensures that if we're missing the value for any providers, there will be a type error
 */
export const PROVIDER_TO_AUTHORIZATION_ENDPOINT_REGISTRY: Record<
  OidcIdentityProvider,
  string
> = {
  [OidcIdentityProvider.GOOGLE]: 'https://accounts.google.com/o/oauth2/v2/auth', // per https://developers.google.com/identity/openid-connect/openid-connect#exchangecode
  [OidcIdentityProvider.APPLE]: 'https://appleid.apple.com/auth/authorize', // per https://developer.apple.com/documentation/sign_in_with_apple/request_an_authorization_to_the_sign_in_with_apple_server
  [OidcIdentityProvider.FACEBOOK]: 'https://facebook.com/dialog/oauth/', // per https://www.facebook.com/.well-known/openid-configuration/
};

/**
 * a method which returns the authorization endpoint for a well known identity provider
 */
export const getAuthorizationEndpointByOidcIdentityProvider = (
  provider: OidcIdentityProvider,
): string => {
  const endpoint = PROVIDER_TO_AUTHORIZATION_ENDPOINT_REGISTRY[provider]; // TODO: prefer the oidc discovery flow
  if (!endpoint)
    throw new UnexpectedCodePathError('unsupported oidc identity provider', {
      provider,
    });
  return endpoint;
};
