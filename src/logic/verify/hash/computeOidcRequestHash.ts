import { sha256 } from 'cross-sha256';

/**
 * computes a one-way hash of the inputs of the request
 *
 * usecase
 * - this hash can be later compared against to verify that
 *   - the responder had access to the original request inputs
 *   - the backend knows exactly which inputs the request was made with
 */
export const computeOidcRequestHash = ({
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
    'orh',
    new sha256()
      .update(
        JSON.stringify({
          purpose: 'oidcRequestHash',
          oidcRequestUuid,
          userSessionUuid,
        }),
      )
      .digest('hex'),
  ].join('_');
