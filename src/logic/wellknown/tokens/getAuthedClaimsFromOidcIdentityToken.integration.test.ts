import { getUnauthedClaims } from 'simple-jwt-auth';

import { OidcIdentityProvider } from '../../../domain/OidcIdentityProvider';
import { getAuthedClaimsFromOidcIdentityToken } from './getAuthedClaimsFromOidcIdentityToken';

// !: tests here are skipped since they're intended for manual debugging only

describe('getAuthedClaimsFromOidcIdentityToken', () => {
  it.skip('should work for a real token from google', async () => {
    const token = `__REDACTED__`;
    const oidcClientId = getUnauthedClaims({ token }).aud;
    const claims = await getAuthedClaimsFromOidcIdentityToken({
      token,
      provider: OidcIdentityProvider.GOOGLE,
      oidcClientId,
    });
    console.log(claims);
  });
  it.skip('should work for real token from apple', async () => {
    const token = `__REDACTED__`;
    const oidcClientId = getUnauthedClaims({ token }).aud;
    const claims = await getAuthedClaimsFromOidcIdentityToken({
      token,
      provider: OidcIdentityProvider.APPLE,
      oidcClientId,
    });
    console.log(claims);
  });
});
