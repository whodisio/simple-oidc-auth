import { stringifyQueryParams } from 'url-fns';

import { OidcAuthenticationResponseMalformedError } from '../../errors/OidcAuthenticationResponseMalformedError';
import { parseOidcAuthenticationResponseQueryParams } from './parseOidcAuthenticationResponseQueryParams';

describe('parseOidcAuthenticationResponseQueryParams', () => {
  it('should be able to extract code and hash from response', () => {
    const { oidcResponseCode, oidcRequestHash } =
      parseOidcAuthenticationResponseQueryParams({
        queryParams: {
          code: '__OIDC_RESPONSE_CODE__',
          state: stringifyQueryParams({ hash: '__OIDC_REQUEST_HASH__' }),
        },
      });
    expect(oidcResponseCode).toEqual('__OIDC_RESPONSE_CODE__');
    expect(oidcRequestHash).toEqual('__OIDC_REQUEST_HASH__');
  });
  it('should throw a helpful error if code could not be found', () => {
    try {
      parseOidcAuthenticationResponseQueryParams({
        queryParams: {
          code: '__OIDC_RESPONSE_CODE__',
          state: stringifyQueryParams({ mash: '__OIDC_REQUEST_HASH__' }),
        },
      });
      throw new Error('should not reach here');
    } catch (error) {
      expect(error).toBeInstanceOf(OidcAuthenticationResponseMalformedError);
      expect(error.message).toContain('`hash` was missing ');
    }
  });
  it('should throw a helpful error if hash could not be found', () => {
    try {
      parseOidcAuthenticationResponseQueryParams({
        queryParams: {
          code: '__OIDC_RESPONSE_CODE__',
          state: stringifyQueryParams({ mash: '__OIDC_REQUEST_HASH__' }),
        },
      });
      throw new Error('should not reach here');
    } catch (error) {
      expect(error).toBeInstanceOf(OidcAuthenticationResponseMalformedError);
      expect(error.message).toContain('`hash` was missing ');
    }
  });
});
