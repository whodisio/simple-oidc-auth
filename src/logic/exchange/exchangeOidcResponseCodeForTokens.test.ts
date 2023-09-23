import axios from 'axios';

import { exchangeOidcResponseCodeForTokens } from './exchangeOidcResponseCodeForTokens';

jest.mock('axios');
const axiosMock = axios as any as jest.Mock;
axiosMock.mockReturnValue({
  status: 200,
  data: { access_token: '__access_token__', id_token: '__identity_token__' },
});

describe('exchangeOidcResponseCodeForToken', () => {
  beforeEach(() => jest.clearAllMocks());
  it('should correctly send the request via rest.post', async () => {
    await exchangeOidcResponseCodeForTokens({
      endpoint: '__endpoint__',
      oidcResponseCode: '__oidc_response_code__',
      oidcClientId: '__oidc_client_id__',
      oidcClientSecret: '__oidc_client_secret__',
      oidcRequestRedirectUri: '__oidc_request_redirect_uri__',
      oidcPkceCodeVerifier: '__oidc_pkce_code_verifier__',
    });
    expect(axiosMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '__endpoint__',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        data: {
          grant_type: 'authorization_code', // https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
          code: '__oidc_response_code__',
          client_id: '__oidc_client_id__',
          client_secret: '__oidc_client_secret__',
          redirect_uri: '__oidc_request_redirect_uri__',
          code_verifier: '__oidc_pkce_code_verifier__',
        },
      }),
    );
    expect(axiosMock.mock.calls).toMatchSnapshot();
  });
  it('should return the access and identity tokens from the response', async () => {
    const tokens = await exchangeOidcResponseCodeForTokens({
      endpoint: '__endpoint__',
      oidcResponseCode: '__oidc_response_code__',
      oidcClientId: '__oidc_client_id__',
      oidcClientSecret: '__oidc_client_secret_-',
      oidcRequestRedirectUri: '__oidc_request_redirect_uri__',
      oidcPkceCodeVerifier: '__oidc_pkce_code_verifier__',
    });
    expect(tokens.access).toEqual('__access_token__');
    expect(tokens.identity).toEqual('__identity_token__');
  });
});
