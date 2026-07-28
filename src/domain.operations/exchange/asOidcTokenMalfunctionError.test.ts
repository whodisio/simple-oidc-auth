import { MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { OidcTokenEndpointMalfunctionError } from '@src/domain.operations/errors/OidcTokenEndpointMalfunctionError';

import { asOidcTokenMalfunctionError } from './asOidcTokenMalfunctionError';

describe('asOidcTokenMalfunctionError', () => {
  given('[case1] a 5xx metadata (no cause, no retry hint)', () => {
    when('[t0] asOidcTokenMalfunctionError is called', () => {
      const error = asOidcTokenMalfunctionError({
        status: 503,
        data: { error: 'temporarily_unavailable' },
        retryAfterMs: null,
      });

      then('it builds an OidcTokenEndpointMalfunctionError', () => {
        expect(error).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
      });

      then('it is a MalfunctionError (server-fault 💥 axis)', () => {
        expect(error).toBeInstanceOf(MalfunctionError);
      });

      then('it carries the metadata verbatim', () => {
        expect(error.metadata).toEqual({
          status: 503,
          data: { error: 'temporarily_unavailable' },
          retryAfterMs: null,
        });
      });
    });
  });

  given('[case2] a 429 metadata with a retry-after backoff hint', () => {
    when('[t0] asOidcTokenMalfunctionError is called', () => {
      const error = asOidcTokenMalfunctionError({
        status: 429,
        data: { error: 'rate_limited' },
        retryAfterMs: 30000,
      });

      then('it carries the retryAfterMs the caller backs off against', () => {
        expect(error.metadata?.retryAfterMs).toEqual(30000);
      });
    });
  });

  given(
    '[case3] a transport-fault metadata (null status/data + a cause)',
    () => {
      when('[t0] asOidcTokenMalfunctionError is called', () => {
        const cause = new Error('ECONNREFUSED');
        const error = asOidcTokenMalfunctionError({
          status: null,
          data: null,
          cause,
          retryAfterMs: null,
        });

        then('it carries the transport cause beneath', () => {
          expect(error.metadata?.cause).toBe(cause);
        });

        then(
          'its status and data are explicit null (no response arrived)',
          () => {
            expect(error.metadata?.status).toBeNull();
            expect(error.metadata?.data).toBeNull();
          },
        );
      });
    },
  );
});
