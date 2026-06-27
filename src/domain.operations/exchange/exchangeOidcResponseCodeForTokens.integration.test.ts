import { OidcIdentityProvider } from '@src/domain.objects/OidcIdentityProvider';
import type { OidcResponseClaims } from '@src/domain.objects/OidcResponseClaims';
import { computeOidcPkceCodeVerifier } from '@src/domain.operations/verify/pkce/computeOidcPkceCodeVerifier';
import { getTokenEndpointByOidcIdentityProvider } from '@src/domain.operations/wellknown/provider/getTokenEndpointByOidcIdentityProvider';
import { computeOidcClientSecretForApple } from '@src/domain.operations/wellknown/secrets/computeOidcClientSecretForApple';

import { exchangeOidcResponseCodeForTokens } from './exchangeOidcResponseCodeForTokens';

const claimsJSON = `
{"public":{"oidcResponseCode":"__REDACTED__","oidcRequestHash":"__REDACTED__","oidcRequestRedirectUri":"https://auth.yourapp.dev/oidc/apple/redirect"},"secure":{"oidcRequestUuid":"__REDACTED__","userSessionUuid":null}}

`.trim();
const claims: OidcResponseClaims = JSON.parse(claimsJSON);

describe('exchangeOidcResponseCodeForTokens', () => {
  // !: skipped because we only run this test for manual debugging
  it.skip('should work for a real request for apple', async () => {
    const tokens = await exchangeOidcResponseCodeForTokens({
      endpoint: getTokenEndpointByOidcIdentityProvider(
        OidcIdentityProvider.APPLE,
      ),
      oidcResponseCode: claims.public.oidcResponseCode,
      oidcClientId: '__redacted__',
      oidcClientSecret: computeOidcClientSecretForApple({
        clientId: '__redacted__',
        developerTeamId: '__redacted__',
        privateKeyId: '__redacted__',
        privateKeyValue: '__redacted__',
      }),
      oidcRequestRedirectUri: claims.public.oidcRequestRedirectUri,
      oidcPkceCodeVerifier: computeOidcPkceCodeVerifier({
        oidcRequestUuid: claims.secure.oidcRequestUuid,
        userSessionUuid: null,
      }),
    });
    expect(tokens.identity).toBeDefined();
  });
});
