import { stringifyQueryParams } from 'url-fns';

import { base64UrlEncode } from '../../base64Url/base64UrlEncode';
import { OidcAuthenticationResponseMalformedError } from '../../errors/OidcAuthenticationResponseMalformedError';
import { parseOidcAuthenticationResponseBody } from './parseOidcAuthenticationResponseBody';

describe('parseOidcAuthenticationResponseBody', () => {
  it('should be able to extract code and hash from response', () => {
    const { oidcResponseCode, oidcRequestHash } =
      parseOidcAuthenticationResponseBody({
        body: 'c3RhdGU9aGFzaCUzRG9yaF9lYTRjNDQyZDJmYjY5YjE5N2I3OTE5ZmMzMDgwNmUzYTZiMjg3OWE5MDQ3NmJhZDRjYjUyNTJjZGU0MWM4MjdlJmNvZGU9NCUyRjBBZkpvaFhsdWFzM0lGMmtLNGJReW1YbzRCbl9DeTN0QkM3VVo0QUlpbXJtMUltLWZRUnhpdWdBWVJoTi04S2Q4YlotcjFnJnNjb3BlPWVtYWlsK3Byb2ZpbGUraHR0cHMlM0ElMkYlMkZ3d3cuZ29vZ2xlYXBpcy5jb20lMkZhdXRoJTJGdXNlcmluZm8ucHJvZmlsZStodHRwcyUzQSUyRiUyRnd3dy5nb29nbGVhcGlzLmNvbSUyRmF1dGglMkZ1c2VyaW5mby5lbWFpbCtvcGVuaWQmYXV0aHVzZXI9MCZoZD1haGJvZGUuY29tJnByb21wdD1ub25l',
      });
    expect(oidcResponseCode).toEqual(
      '4/0AfJohXluas3IF2kK4bQymXo4Bn_Cy3tBC7UZ4AIimrm1Im-fQRxiugAYRhN-8Kd8bZ-r1g',
    );
    expect(oidcRequestHash).toEqual(
      'orh_ea4c442d2fb69b197b7919fc30806e3a6b2879a90476bad4cb5252cde41c827e',
    );
  });
  it('should throw a helpful error if code could not be found', () => {
    try {
      parseOidcAuthenticationResponseBody({
        body: base64UrlEncode(
          stringifyQueryParams({
            state: stringifyQueryParams({ hash: '__OIDC_REQUEST_HASH__' }),
          }),
        ),
      });
      throw new Error('should not reach here');
    } catch (error) {
      expect(error).toBeInstanceOf(OidcAuthenticationResponseMalformedError);
      expect(error.message).toContain('`code` parameter was missing ');
    }
  });
  it('should throw a helpful error if hash could not be found', () => {
    try {
      parseOidcAuthenticationResponseBody({
        body: base64UrlEncode(
          stringifyQueryParams({
            code: '__OIDC_RESPONSE_CODE__',
            state: stringifyQueryParams({ mash: '__OIDC_REQUEST_HASH__' }),
          }),
        ),
      });
      throw new Error('should not reach here');
    } catch (error) {
      expect(error).toBeInstanceOf(OidcAuthenticationResponseMalformedError);
      expect(error.message).toContain('`hash` was missing ');
    }
  });
});
