/* eslint-disable @typescript-eslint/naming-convention */
import { validate } from 'uuid';

import { OidcAuthenticationResponseMalformedError } from '../../errors/OidcAuthenticationResponseMalformedError';
import { PotentialOidcAttackError } from '../../errors/PotentialOidcAttackError';

const isUuid = validate;

export const extractOidcRequestUuidFromOriginationCookie = ({
  headers,
}: {
  headers: Record<string, any>;
}): { oidcRequestUuid: string } => {
  // assert that cookies were provided
  const cookies = headers.cookie ?? headers.Cookie ?? null; // headers are case-insensitive, by spec: https://stackoverflow.com/a/5259004/3068233
  if (!cookies)
    throw new OidcAuthenticationResponseMalformedError(
      'no `cookies` were provided in the headers',
    );

  // check that the origination cookie exists
  const [_, origination] =
    new RegExp(/ (origination=[a-zA-Z0-9\-_.]+);/i).exec(` ${cookies};`) ?? [];
  if (!origination)
    throw new PotentialOidcAttackError('no `origination` cookie was found');

  // check that the cookie has the correct security settings; // TODO: is there a way to enforce this? settings on not sent on responses :/ - but it would be great to add

  // check that the origination cookie contains a uuid
  const potentiallyAUuid = origination.replace(/^origination=/, ''); // case sensitive: https://stackoverflow.com/a/11312272/3068233
  if (!isUuid(potentiallyAUuid))
    throw new PotentialOidcAttackError(
      'the `origination` cookie does not contain a valid uuid',
      { origination },
    );

  // return the uuid found if valid
  return { oidcRequestUuid: potentiallyAUuid };
};
