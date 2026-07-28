import { given, then, when } from 'test-fns';

import { OidcTokenEndpointMalfunctionError } from '@src/domain.operations/errors/OidcTokenEndpointMalfunctionError';
import { OidcTokenRefreshExpiredError } from '@src/domain.operations/errors/OidcTokenRefreshExpiredError';
import { OidcTokenRequestRejectedError } from '@src/domain.operations/errors/OidcTokenRequestRejectedError';

import { asOidcTokenError } from './asOidcTokenError';

describe('asOidcTokenError', () => {
  given('[case1] a 503 server response', () => {
    when('[t0] asOidcTokenError is called', () => {
      then('it returns OidcTokenEndpointMalfunctionError (retry)', () => {
        const error = asOidcTokenError({
          status: 503,
          data: { error: 'temporarily_unavailable' },
          headers: undefined,
        });
        expect(error).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
      });
    });
  });

  given('[case2] a 429 rate-limit with a Retry-After header', () => {
    when('[t0] asOidcTokenError is called', () => {
      const error = asOidcTokenError({
        status: 429,
        data: { error: 'rate_limited' },
        headers: { 'retry-after': '30' },
      });

      then('it returns OidcTokenEndpointMalfunctionError (retryable)', () => {
        expect(error).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
      });

      then('it carries the retry-after interval in milliseconds', () => {
        expect(
          (error as OidcTokenEndpointMalfunctionError).metadata?.retryAfterMs,
        ).toEqual(30000);
      });
    });
  });

  given('[case3] a 429 rate-limit without a Retry-After header', () => {
    when('[t0] asOidcTokenError is called', () => {
      const error = asOidcTokenError({
        status: 429,
        data: { error: 'rate_limited' },
        headers: {},
      });

      then('it returns OidcTokenEndpointMalfunctionError', () => {
        expect(error).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
      });

      then('the retry-after interval is absent (null)', () => {
        expect(
          (error as OidcTokenEndpointMalfunctionError).metadata?.retryAfterMs,
        ).toBeNull();
      });
    });
  });

  given('[case4] a 429 with a non-integer Retry-After (http-date form)', () => {
    when('[t0] asOidcTokenError is called', () => {
      then(
        'the retry-after interval is absent (null) — never a NaN leak',
        () => {
          const error = asOidcTokenError({
            status: 429,
            data: {},
            headers: { 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' },
          });
          expect(
            (error as OidcTokenEndpointMalfunctionError).metadata?.retryAfterMs,
          ).toBeNull();
        },
      );
    });
  });

  given('[case5] a 400 with error=invalid_grant', () => {
    when('[t0] asOidcTokenError is called', () => {
      then('it returns OidcTokenRefreshExpiredError (re-auth)', () => {
        const error = asOidcTokenError({
          status: 400,
          data: { error: 'invalid_grant' },
          headers: undefined,
        });
        expect(error).toBeInstanceOf(OidcTokenRefreshExpiredError);
      });
    });
  });

  given('[case6] a 400 with error=invalid_scope', () => {
    when('[t0] asOidcTokenError is called', () => {
      then('it returns OidcTokenRequestRejectedError (fix request)', () => {
        const error = asOidcTokenError({
          status: 400,
          data: { error: 'invalid_scope' },
          headers: undefined,
        });
        expect(error).toBeInstanceOf(OidcTokenRequestRejectedError);
      });
    });
  });

  given('[case7] a 401 with error=invalid_client', () => {
    when('[t0] asOidcTokenError is called', () => {
      then('it returns OidcTokenRequestRejectedError (fix request)', () => {
        const error = asOidcTokenError({
          status: 401,
          data: { error: 'invalid_client' },
          headers: undefined,
        });
        expect(error).toBeInstanceOf(OidcTokenRequestRejectedError);
      });
    });
  });

  given('[case8] a 400 with no error field', () => {
    when('[t0] asOidcTokenError is called', () => {
      const error = asOidcTokenError({
        status: 400,
        data: {},
        headers: undefined,
      });

      then('it defaults to OidcTokenRequestRejectedError (fix request)', () => {
        expect(error).toBeInstanceOf(OidcTokenRequestRejectedError);
      });

      then('metadata.providerError is null (absent error code)', () => {
        expect(
          (error as OidcTokenRequestRejectedError).metadata?.providerError,
        ).toBeNull();
      });

      then(
        'the message reads "unrecognized", never the literal "undefined"',
        () => {
          // the ?? 'unrecognized' failloud guard: an absent error code must NOT leak "undefined"
          expect(error.message).toContain('unrecognized');
          expect(error.message).not.toContain('undefined');
        },
      );
    });
  });

  given('[case9] a 400 with a non-json (malformed) body', () => {
    when('[t0] asOidcTokenError is called', () => {
      then('it classifies by status band → Rejected, never a TypeError', () => {
        const error = asOidcTokenError({
          status: 400,
          data: '<html>bad gateway</html>',
          headers: undefined,
        });
        expect(error).toBeInstanceOf(OidcTokenRequestRejectedError);
      });
    });
  });

  given('[case10] a 502 with a non-json (malformed) body', () => {
    when('[t0] asOidcTokenError is called', () => {
      then(
        'it classifies by status band → Malfunction, never a TypeError',
        () => {
          const error = asOidcTokenError({
            status: 502,
            data: '<html>bad gateway</html>',
            headers: undefined,
          });
          expect(error).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
        },
      );
    });
  });

  given('[case11] an unexpected 3xx (below the 4xx client-error band)', () => {
    when('[t0] asOidcTokenError is called', () => {
      then(
        'it returns Malfunction (retry), NOT the caller-fault Rejected default',
        () => {
          const error = asOidcTokenError({
            status: 302,
            data: {},
            headers: undefined,
          });
          expect(error).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
        },
      );
    });
  });
});
