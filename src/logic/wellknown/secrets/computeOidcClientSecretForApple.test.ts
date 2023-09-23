import {
  getUnauthedClaims,
  getUnauthedHeaderClaims,
  createSigningKeyPair,
} from 'simple-jwt-auth';

import { computeOidcClientSecretForApple } from './computeOidcClientSecretForApple';

describe('computeOidcClientSecretForApple', () => {
  it('should be able to compute a valid client secret', async () => {
    const keypair = await createSigningKeyPair('ES256');

    const token = computeOidcClientSecretForApple({
      developerTeamId: '__team_id__',
      clientId: '__client_id__',
      privateKeyId: '__private_key_id__',
      privateKeyValue: keypair.privateKey, // requires a real private key to sign with
    });

    const claims = getUnauthedClaims({ token });
    expect(claims.aud).toEqual('https://appleid.apple.com');
    expect(claims.sub).toEqual('__client_id__');
    expect(claims.iss).toEqual('__team_id__');

    const headerClaims = getUnauthedHeaderClaims({ token });
    expect(headerClaims.kid).toEqual('__private_key_id__');
  });
});
