import { getError } from '@ehmpathy/error-fns';

import { uuid } from '../../../deps';
import { PotentialOidcAttackError } from '../../errors/PotentialOidcAttackError';
import { computeOidcRequestHash } from './computeOidcRequestHash';
import { verifyOidcRequestHashForResponse } from './verifyOidcRequestHashForResponse';

describe('verifyOidcRequestHashForResponse', () => {
  it('should be able to verify a hash that was created with the expected input', () => {
    const oidcRequestUuid = uuid();
    const userSessionUuid = uuid();
    verifyOidcRequestHashForResponse({
      public: {
        oidcRequestHash: computeOidcRequestHash({
          oidcRequestUuid,
          userSessionUuid,
        }),
      },
      secure: {
        oidcRequestUuid,
        userSessionUuid,
      },
    });
    // no error
  });
  it('should throw a potential attack error if its unable to verify a hash that was created with nonexpected input', () => {
    const error = getError(() =>
      verifyOidcRequestHashForResponse({
        public: {
          oidcRequestHash: computeOidcRequestHash({
            oidcRequestUuid: uuid(),
            userSessionUuid: null,
          }),
        },
        secure: {
          oidcRequestUuid: uuid(),
          userSessionUuid: null,
        },
      }),
    );
    expect(error).toBeInstanceOf(PotentialOidcAttackError);
    expect(error.message).toContain(
      `Can not verify this responder has ownership of the response's secure claims.`,
    );
  });
});
