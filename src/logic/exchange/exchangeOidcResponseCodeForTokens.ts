import { UnexpectedCodePathError } from '@ehmpathy/error-fns';
import axios from 'axios';

/**
 * securely exchanges oidc authcode for tokens with the identity provider
 *
 * ref
 * - https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
 * - https://datatracker.ietf.org/doc/html/rfc6749#appendix-B
 */
export const exchangeOidcResponseCodeForTokens = async ({
  endpoint,
  oidcResponseCode,
  oidcClientId,
  oidcClientSecret,
  oidcRequestRedirectUri,
  oidcPkceCodeVerifier,
}: {
  endpoint: string;
  oidcResponseCode: string;
  oidcClientId: string;
  oidcClientSecret: string;
  oidcRequestRedirectUri: string;
  oidcPkceCodeVerifier: string;
}): Promise<{ identity: string; access: string }> => {
  // make the request to the endpoint
  const response = await axios({
    method: 'POST',
    url: endpoint,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    data: {
      grant_type: 'authorization_code', // https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
      code: oidcResponseCode,
      client_id: oidcClientId,
      client_secret: oidcClientSecret,
      redirect_uri: oidcRequestRedirectUri,
      code_verifier: oidcPkceCodeVerifier, // pkce support: https://datatracker.ietf.org/doc/html/rfc7636#section-4.5
    },
    validateStatus: () => true, // dont throw for us, we will throw it ourselves, since the axios errors dont have good error messages
  });

  // extract the tokens from the response data
  if (response.status >= 300)
    throw new UnexpectedCodePathError(
      'unsuccessful response from oidc identity provider',
      { status: response.status, data: response.data },
    );
  const { access_token: accessToken, id_token: identityToken } = response.data;

  // return the identity and access tokens
  return { access: accessToken, identity: identityToken };
};
