import { getError } from '@ehmpathy/error-fns';

import { OidcAuthenticationResponseMalformedError } from '../../errors/OidcAuthenticationResponseMalformedError';
import { PotentialOidcAttackError } from '../../errors/PotentialOidcAttackError';
import { extractOidcRequestUuidFromOriginationCookie } from './extractOidcRequestUuidFromOriginationCookie';

const exampleUuid = `f8a15286-9751-4a77-9e54-4717a2ad7b91`;

describe('extractOidcRequestUuidFromOriginationCookie', () => {
  it('should return null if cookie header is not defined', async () => {
    const headers = {};
    const error = await getError(() =>
      extractOidcRequestUuidFromOriginationCookie({ headers }),
    );
    expect(error).toBeInstanceOf(OidcAuthenticationResponseMalformedError);
    expect(error.message).toContain(
      'no `cookies` were provided in the headers',
    );
  });
  it('should not find the uuid in origination cookie, if the origination cookie was not defined', () => {
    const headers = {
      Cookie: `gaid=821`,
    };
    const error = getError(() =>
      extractOidcRequestUuidFromOriginationCookie({ headers }),
    );
    expect(error).toBeInstanceOf(PotentialOidcAttackError);
    expect(error.message).toContain('no `origination` cookie was found');
  });
  it('should be able to find uuid in origination cookie', () => {
    const headers = {
      cookie: `origination=${exampleUuid}`,
    };
    const { oidcRequestUuid: uuid } =
      extractOidcRequestUuidFromOriginationCookie({ headers });
    expect(uuid).toEqual(exampleUuid);
  });
  it('should be able to find uuid in origination cookie, even surrounded by other cookies', () => {
    const headers = {
      cookie: `name=value; origination=${exampleUuid}; name3=value3`,
    };
    const { oidcRequestUuid: uuid } =
      extractOidcRequestUuidFromOriginationCookie({ headers });
    expect(uuid).toEqual(exampleUuid);
  });
  it('should be able to find uuid in origination cookie, even if its the last cookie', () => {
    const headers = {
      cookie: `name=value; origination=${exampleUuid}`,
    };
    const { oidcRequestUuid: uuid } =
      extractOidcRequestUuidFromOriginationCookie({ headers });
    expect(uuid).toEqual(exampleUuid);
  });
  it('should be able to find uuid in origination cookie, even if its the first cookie', () => {
    const headers = {
      cookie: `origination=${exampleUuid}; name3=value3`,
    };
    const { oidcRequestUuid: uuid } =
      extractOidcRequestUuidFromOriginationCookie({ headers });
    expect(uuid).toEqual(exampleUuid);
  });
  it('should not be able to find uuid in origination cookie, if the cookie name is capitalized the first cookie, since cookie names are case sensitive', () => {
    const headers = {
      cookie: `Origination=${exampleUuid}`,
    };
    const error = getError(() =>
      extractOidcRequestUuidFromOriginationCookie({ headers }),
    );
    expect(error).toBeInstanceOf(PotentialOidcAttackError);
    expect(error.message).toContain(
      'the `origination` cookie does not contain a valid uuid',
    );
  });
  it('should be able to find uuid in origination cookie, even if the cookie header key is capitalized', () => {
    const headers = {
      Cookie: `origination=${exampleUuid}`,
    };
    const { oidcRequestUuid: uuid } =
      extractOidcRequestUuidFromOriginationCookie({ headers });
    expect(uuid).toEqual(exampleUuid);
  });
  it('should not find the uuid in origination cookie, if the cookie name just has origination as a suffix ', () => {
    const headers = {
      Cookie: `attackerorigination=${exampleUuid}`,
    };
    const error = getError(() =>
      extractOidcRequestUuidFromOriginationCookie({ headers }),
    );
    expect(error).toBeInstanceOf(PotentialOidcAttackError);
    expect(error.message).toContain('no `origination` cookie was found');
  });
  it('should not find the uuid in the origination cookie, if what is in the origination cookie is not a uuid', () => {
    const headers = {
      Cookie: `origination=__NOT_A_UUID__`,
    };
    const error = getError(() =>
      extractOidcRequestUuidFromOriginationCookie({ headers }),
    );
    expect(error).toBeInstanceOf(PotentialOidcAttackError);
    expect(error.message).toContain(
      'the `origination` cookie does not contain a valid uuid',
    );
  });
});
