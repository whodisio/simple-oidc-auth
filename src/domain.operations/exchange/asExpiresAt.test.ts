import type { IsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { asExpiresAt } from './asExpiresAt';

describe('asExpiresAt', () => {
  const since = '2026-07-24T14:30:00Z' as IsoTimeStamp;

  given('[case1] a provider expires_in of 3599 seconds', () => {
    when('[t0] asExpiresAt is called', () => {
      then('it returns the reference instant plus 3599 seconds', () => {
        const expiresAt = asExpiresAt({ expiresIn: 3599, since });
        expect(expiresAt).toEqual('2026-07-24T15:29:59Z');
      });
    });
  });

  given('[case2] a provider that omits expires_in (null)', () => {
    when('[t0] asExpiresAt is called', () => {
      then('it returns null — an explicit unknown expiry', () => {
        const expiresAt = asExpiresAt({ expiresIn: null, since });
        expect(expiresAt).toBeNull();
      });
    });
  });

  given('[case3] a zero-second expires_in', () => {
    when('[t0] asExpiresAt is called', () => {
      then('it returns the reference instant unchanged', () => {
        const expiresAt = asExpiresAt({ expiresIn: 0, since });
        expect(expiresAt).toEqual(since);
      });
    });
  });
});
