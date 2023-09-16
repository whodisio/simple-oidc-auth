import { sha256 } from 'cross-sha256';

/**
 *
 * requirements
 * - sufficient entropy - ✅, challenge uuid = a uuid, completely random -> increased to 64 char through sha256
 *
 * ref
 * - https://datatracker.ietf.org/doc/html/rfc7636#section-4.1
 */
export const computeOidcPkceCodeVerifier = ({
  oidcRequestUuid,
  userSessionUuid,
}: {
  /**
   * the primary key identifier of the request, persisted by your backend
   */
  oidcRequestUuid: string;

  /**
   * the primary key identifier of the current user's session, if any
   */
  userSessionUuid: string | null;
}): string =>
  [
    'opcv',
    new sha256()
      .update(
        JSON.stringify({
          purpose: 'oidcPkceCodeVerifier',
          oidcRequestUuid,
          userSessionUuid,
        }),
      )
      .digest('hex'),
  ].join('_');
