import { getUnauthedClaims } from 'simple-jwt-auth';

import { OidcIdentityProvider } from '../../../domain/OidcIdentityProvider';
import { getAuthedClaimsFromOidcIdentityToken } from './getAuthedClaimsFromOidcIdentityToken';

describe('getAuthedClaimsFromOidcIdentityToken', () => {
  it.skip('should work for real token', async () => {
    const token = `__REDACTED__`;
    const oidcClientId = getUnauthedClaims({ token }).aud;
    const claims = await getAuthedClaimsFromOidcIdentityToken({
      token,
      provider: OidcIdentityProvider.GOOGLE,
      oidcClientId,
    });
    console.log(claims);
  });
});
