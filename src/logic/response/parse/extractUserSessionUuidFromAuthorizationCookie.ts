import {
  getAuthedClaims,
  getTokenFromAuthorizationCookie,
  isExpiredToken,
} from 'simple-jwt-auth';

import { OidcAuthenticationResponseMalformedError } from '../../errors/OidcAuthenticationResponseMalformedError';

export const extractUserSessionUuidFromAuthorizationCookie = async ({
  headers,
  session,
}: {
  headers: Record<string, string>;
  session: {
    issuer: string;
    audience: string;
  };
}): Promise<{ userSessionUuid: string | null }> => {
  // grab the token from the header
  const token = getTokenFromAuthorizationCookie({ headers });
  if (!token) return { userSessionUuid: null };

  // if the token is expired, then no session (e.g., logged out, never logged back in, cookie wasn't removed)
  if (isExpiredToken(token)) return { userSessionUuid: null };

  // grab authed claims from it
  const claims = await getAuthedClaims({
    token,
    issuer: session.issuer,
    audience: session.audience,
  });

  // grab the session uuid from it
  const userSessionUuid = claims.jti;
  if (!userSessionUuid)
    throw new OidcAuthenticationResponseMalformedError(
      'no `jti` found on the authorization token',
      {
        claims, // note: its safe to log the claims, since these are public anyway
      },
    );

  // return the session uuid
  return { userSessionUuid };
};
