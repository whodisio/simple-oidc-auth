import { PotentialOidcAttackError } from '../../errors/PotentialOidcAttackError';
import { computeOidcRequestHash } from './computeOidcRequestHash';

/**
 * tactic: verify that the responder was given a fingerprint to the exact oidc request claims stored securely in their browser
 *
 * outcome:
 * - prevent cross-site-request-forgery, csrf, by verifying that the caller knows the exact userSessionUuid that the browser has active
 *   - this prevents the vulnerability from a authed user accidentally following a link an attacker made to produce an unintended request on their behalf
 *   - the attacker would have to know the user's exact userSessionUuid in order to craft a valid link -> they would need access to the user's secure storage
 * - prevent parameter-injection, ping, by verifying that the caller knows the exact oidcRequestUuid that the browser was issued
 *   - this prevents the vulnerability from an unauthed user accidentally following a link an attacker made to produce an unintended request on their behalf
 *   - the attacker would have to know that the user has an existing oidcRequestUuid and know the exact one in order to craft a valid link -> they would need access to the user's secure storage
 *
 * strategy:
 * - compute the expected oidcRequestHash from the secure claims and compare it against the publicly claimed oidcRequestHash
 */
export const verifyOidcRequestHashForResponse = ({
  public: { oidcRequestHash },
  secure: { oidcRequestUuid, userSessionUuid },
}: {
  public: {
    oidcRequestHash: string;
  };
  secure: {
    oidcRequestUuid: string;
    userSessionUuid: string | null;
  };
}): void => {
  // compute hash we expect to find for this request
  const hashExpected = computeOidcRequestHash({
    oidcRequestUuid,
    userSessionUuid,
  });

  // compare against the hash the response claimed is for this request
  const hashClaimed = oidcRequestHash;
  const hashVerified = hashExpected === hashClaimed;

  // throw a potential attack error if they do not match
  if (!hashVerified)
    throw new PotentialOidcAttackError(
      "The public.claims do not match the response's secure.claims. Can not verify this responder has ownership of the response's secure claims. Halting to eliminate potential CSRF and PINJ vulnerabilities.",
      {
        hashExpected,
        hashClaimed,
      },
    );

  // otherwise, all good
  return;
};
