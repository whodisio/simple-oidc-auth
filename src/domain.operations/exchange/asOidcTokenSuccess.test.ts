import type { IsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { asOidcTokenSuccess } from './asOidcTokenSuccess';

describe('asOidcTokenSuccess', () => {
  const since = '2026-07-24T14:30:00Z' as IsoTimeStamp;

  given(
    '[case1] a full success body (access + rotated refresh + expires_in)',
    () => {
      when('[t0] asOidcTokenSuccess is called', () => {
        then(
          'it returns access, the rotated refresh, and an absolute expiresAt',
          () => {
            const result = asOidcTokenSuccess({
              data: {
                access_token: 'access-fresh',
                refresh_token: 'refresh-new',
                expires_in: 3599,
              },
              since,
            });
            expect(result).toEqual({
              access: 'access-fresh',
              refresh: 'refresh-new',
              expiresAt: '2026-07-24T15:29:59Z',
            });
          },
        );
      });
    },
  );

  given('[case2] a success body without a refresh_token (no rotation)', () => {
    when('[t0] asOidcTokenSuccess is called', () => {
      then(
        'it returns refresh null — the caller keeps its current token',
        () => {
          const result = asOidcTokenSuccess({
            data: { access_token: 'access-fresh', expires_in: 3599 },
            since,
          });
          expect(result).toEqual({
            access: 'access-fresh',
            refresh: null,
            expiresAt: '2026-07-24T15:29:59Z',
          });
        },
      );
    });
  });

  given('[case3] a success body without an expires_in', () => {
    when('[t0] asOidcTokenSuccess is called', () => {
      then('it returns expiresAt null — an explicit unknown expiry', () => {
        const result = asOidcTokenSuccess({
          data: { access_token: 'access-fresh' },
          since,
        });
        expect(result).toEqual({
          access: 'access-fresh',
          refresh: null,
          expiresAt: null,
        });
      });
    });
  });

  given('[case4] a body that is not a json object', () => {
    when('[t0] a null body', () => {
      then('it returns null — a malformed success', () => {
        expect(asOidcTokenSuccess({ data: null, since })).toBeNull();
      });
    });
    when('[t1] a string body', () => {
      then('it returns null — a malformed success (no raw TypeError)', () => {
        expect(asOidcTokenSuccess({ data: 'not json', since })).toBeNull();
      });
    });
  });

  given('[case5] a 2xx body without an access_token', () => {
    when('[t0] the access_token is absent', () => {
      then('it returns null — the one fatal field', () => {
        expect(
          asOidcTokenSuccess({ data: { refresh_token: 'r' }, since }),
        ).toBeNull();
      });
    });
    when('[t1] the access_token is a non-string', () => {
      then('it returns null — a wrong-typed access_token is unusable', () => {
        expect(
          asOidcTokenSuccess({ data: { access_token: 12345 }, since }),
        ).toBeNull();
      });
    });
  });

  given('[case6] a success body with a non-string refresh_token', () => {
    when('[t0] asOidcTokenSuccess is called', () => {
      then(
        'it coalesces refresh to null — read as no rotation, not a fault',
        () => {
          const result = asOidcTokenSuccess({
            data: { access_token: 'access-fresh', refresh_token: 42 },
            since,
          });
          expect(result).toEqual({
            access: 'access-fresh',
            refresh: null,
            expiresAt: null,
          });
        },
      );
    });
  });

  given('[case7] a success body with a non-number expires_in', () => {
    when('[t0] asOidcTokenSuccess is called', () => {
      then(
        'it coalesces expiresAt to null — an explicit unknown expiry',
        () => {
          const result = asOidcTokenSuccess({
            data: { access_token: 'access-fresh', expires_in: 'soon' },
            since,
          });
          expect(result).toEqual({
            access: 'access-fresh',
            refresh: null,
            expiresAt: null,
          });
        },
      );
    });
  });

  given('[case8] a 2xx body with an EMPTY access_token', () => {
    when('[t0] access_token is the empty string', () => {
      then(
        'it returns null — an empty string is "no token", a malformed success',
        () => {
          expect(
            asOidcTokenSuccess({ data: { access_token: '' }, since }),
          ).toBeNull();
        },
      );
    });
  });

  given('[case9] a 2xx body with an EMPTY refresh_token', () => {
    when('[t0] refresh_token is the empty string', () => {
      then(
        'it coalesces refresh to null — never persist an empty credential',
        () => {
          const result = asOidcTokenSuccess({
            data: { access_token: 'access-fresh', refresh_token: '' },
            since,
          });
          expect(result).toEqual({
            access: 'access-fresh',
            refresh: null,
            expiresAt: null,
          });
        },
      );
    });
  });
});
