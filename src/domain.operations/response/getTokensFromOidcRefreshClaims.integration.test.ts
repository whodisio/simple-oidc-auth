import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { isIsoTimeStamp } from 'iso-time';
import { getError, given, then, useBeforeAll, useThen, when } from 'test-fns';

import {
  genLocalRfc6749TokenEndpoint,
  type LocalRfc6749TokenEndpoint,
} from '@src/domain.operations/.test/genLocalRfc6749TokenEndpoint';
import { OidcTokenEndpointMalfunctionError } from '@src/domain.operations/errors/OidcTokenEndpointMalfunctionError';
import { OidcTokenRefreshExpiredError } from '@src/domain.operations/errors/OidcTokenRefreshExpiredError';
import { OidcTokenRequestRejectedError } from '@src/domain.operations/errors/OidcTokenRequestRejectedError';

import { getTokensFromOidcRefreshClaims } from './getTokensFromOidcRefreshClaims';

describe('getTokensFromOidcRefreshClaims (integration)', () => {
  const endpoint: { current: LocalRfc6749TokenEndpoint } = useBeforeAll(
    async () => ({ current: await genLocalRfc6749TokenEndpoint() }),
  );
  afterAll(async () => endpoint.current.close());

  const input = (claimsOverride?: {
    scope?: string[] | null;
    resource?: string | null;
  }) => ({
    claims: {
      token: { refresh: '__refresh_token__' },
      scope: claimsOverride?.scope ?? null,
      resource: claimsOverride?.resource ?? null,
    },
    provider: { tokenEndpoint: endpoint.current.tokenEndpoint },
    operator: {
      oidcClientId: '__client_id__',
      oidcClientSecret: '__client_secret__',
    },
  });

  given('[usecase1] silent refresh, no rotation', () => {
    when('[t0] getTokensFromOidcRefreshClaims is called', () => {
      // one real http round-trip via useThen; capture the call instant so the
      // time-tolerance assertion stays precise against a single shared result
      const result = useThen('it resolves the fresh tokens', async () => {
        endpoint.current.setNextResponse({
          kind: 'success',
          accessToken: '__fresh_access__',
          expiresIn: 3599,
        });
        const calledAt = Date.now();
        return { ...(await getTokensFromOidcRefreshClaims(input())), calledAt };
      });

      then('access is a fresh token', () => {
        expect(result.access).toEqual('__fresh_access__');
      });

      then('refresh is null (no rotation)', () => {
        expect(result.refresh).toBeNull();
      });

      then('expiresAt is an absolute IsoTimeStamp', () => {
        expect(isIsoTimeStamp(result.expiresAt as string)).toEqual(true);
      });

      then('expiresAt is approximately now + expires_in (3599s)', () => {
        const expected = result.calledAt + 3599 * 1000;
        // proves the leaf wired the real clock + expires_in, not a wrong/fixed value
        expect(
          Math.abs(Date.parse(result.expiresAt as string) - expected),
        ).toBeLessThan(60 * 1000);
      });
    });
  });

  given('[usecase2] silent refresh with rotation', () => {
    when('[t0] getTokensFromOidcRefreshClaims is called', () => {
      then('refresh is a new token distinct from the input', async () => {
        endpoint.current.setNextResponse({
          kind: 'success',
          accessToken: '__fresh_access__',
          refreshToken: '__rotated_refresh__',
        });
        const { refresh } = await getTokensFromOidcRefreshClaims(input());
        expect(refresh).toEqual('__rotated_refresh__');
        expect(refresh).not.toEqual('__refresh_token__');
      });
    });

    when('[t1] the provider echoes the SAME refresh_token as the input', () => {
      then(
        'result.refresh reflects it as returned (non-null) — the 2.1 boundary row',
        async () => {
          // the boundary table row: "success body has refresh_token == input token →
          // result.refresh reflects it as returned (non-null)". the code is value-agnostic,
          // so this proves the echo case surfaces the token rather than coalesce it to null
          endpoint.current.setNextResponse({
            kind: 'success',
            accessToken: '__fresh_access__',
            refreshToken: '__refresh_token__', // identical to input()'s refresh
          });
          const { refresh } = await getTokensFromOidcRefreshClaims(input());
          expect(refresh).toEqual('__refresh_token__');
          expect(refresh).not.toBeNull();
        },
      );
    });
  });

  given('[usecase3] expired / revoked refresh (invalid_grant)', () => {
    when('[t0] getTokensFromOidcRefreshClaims is called', () => {
      // wrap the thrown error in a named field so the proxy holds the real Error reference
      const outcome = useThen('it throws for invalid_grant', async () => {
        endpoint.current.setNextResponse({
          kind: 'error',
          status: 400,
          error: 'invalid_grant',
        });
        return {
          thrown: await getError(getTokensFromOidcRefreshClaims(input())),
        };
      });

      then('it throws OidcTokenRefreshExpiredError', () => {
        expect(outcome.thrown).toBeInstanceOf(OidcTokenRefreshExpiredError);
      });

      then('it is an instanceof ConstraintError (caller fault)', () => {
        expect(outcome.thrown).toBeInstanceOf(ConstraintError);
      });
    });
  });

  given(
    '[usecase4] rejected request — scope exceeds grant (invalid_scope)',
    () => {
      when('[t0] getTokensFromOidcRefreshClaims is called', () => {
        then(
          'it throws OidcTokenRequestRejectedError, distinct from Expired',
          async () => {
            endpoint.current.setNextResponse({
              kind: 'error',
              status: 400,
              error: 'invalid_scope',
            });
            const error = await getError(
              getTokensFromOidcRefreshClaims(
                input({ scope: ['too', 'broad'] }),
              ),
            );
            expect(error).toBeInstanceOf(OidcTokenRequestRejectedError);
            expect(error).not.toBeInstanceOf(OidcTokenRefreshExpiredError);
          },
        );
      });
    },
  );

  given(
    '[usecase5] rejected request — bad operator credentials (invalid_client)',
    () => {
      when('[t0] getTokensFromOidcRefreshClaims is called', () => {
        then(
          'it throws OidcTokenRequestRejectedError, distinct from Expired',
          async () => {
            endpoint.current.setNextResponse({
              kind: 'error',
              status: 401,
              error: 'invalid_client',
            });
            const error = await getError(
              getTokensFromOidcRefreshClaims(input()),
            );
            expect(error).toBeInstanceOf(OidcTokenRequestRejectedError);
            expect(error).not.toBeInstanceOf(OidcTokenRefreshExpiredError);
          },
        );
      });
    },
  );

  given('[usecase6] endpoint malfunction (503, socket drop, 429)', () => {
    when('[t0] the endpoint returns 503', () => {
      then(
        'it throws OidcTokenEndpointMalfunctionError (server fault)',
        async () => {
          endpoint.current.setNextResponse({
            kind: 'error',
            status: 503,
            error: 'temporarily_unavailable',
          });
          const error = await getError(getTokensFromOidcRefreshClaims(input()));
          expect(error).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
          expect(error).toBeInstanceOf(MalfunctionError);
        },
      );
    });

    when('[t1] the endpoint drops the socket', () => {
      then('it throws OidcTokenEndpointMalfunctionError', async () => {
        endpoint.current.setNextResponse({ kind: 'socket-drop' });
        const error = await getError(getTokensFromOidcRefreshClaims(input()));
        expect(error).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
      });
    });

    when('[t2] the endpoint rate-limits with 429 + Retry-After', () => {
      then(
        'it throws Malfunction that carries the retry-after interval',
        async () => {
          endpoint.current.setNextResponse({
            kind: 'error',
            status: 429,
            error: 'rate_limited',
            retryAfterSeconds: 30,
          });
          const error = (await getError(
            getTokensFromOidcRefreshClaims(input()),
          )) as OidcTokenEndpointMalfunctionError;
          expect(error).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
          // a 429 is server-fault + retryable, NOT the caller-fault fix-request class
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error).not.toBeInstanceOf(OidcTokenRequestRejectedError);
          expect(error.metadata?.retryAfterMs).toEqual(30000);
        },
      );
    });
  });

  given('[usecase7] expiry representation is an absolute instant', () => {
    when('[t0] the response omits expires_in', () => {
      then('expiresAt is null — an explicit unknown expiry', async () => {
        endpoint.current.setNextResponse({
          kind: 'success',
          accessToken: '__fresh_access__',
        });
        const { expiresAt } = await getTokensFromOidcRefreshClaims(input());
        expect(expiresAt).toBeNull();
      });
    });
  });

  given('[usecase8] reduced scope + resource claims are honored', () => {
    when('[t0] a subset scope array + a resource are sent', () => {
      // one real round-trip; read the received wire back to prove the orchestrator
      // unpacks the claims (scope ARRAY → space-joined wire scalar) end to end
      const outcome = useThen('it resolves a fresh access token', async () => {
        endpoint.current.setNextResponse({
          kind: 'success',
          accessToken: '__scoped_access__',
        });
        const result = await getTokensFromOidcRefreshClaims(
          input({
            scope: ['email', 'profile'],
            resource: 'https://api.example.com',
          }),
        );
        return {
          result,
          params: new URLSearchParams(
            endpoint.current.getLastRequest()?.body ?? '',
          ),
        };
      });

      then('it resolves a fresh access token', () => {
        expect(outcome.result.access).toEqual('__scoped_access__');
      });

      then(
        'the scope array is serialized space-delimited (rfc-6749 §3.3)',
        () => {
          expect(outcome.params.get('scope')).toEqual('email profile');
        },
      );

      then('the resource is sent verbatim (rfc-8707)', () => {
        expect(outcome.params.get('resource')).toEqual(
          'https://api.example.com',
        );
      });
    });
  });

  given(
    '[usecase9] rotation-collision — a transport drop straddles a spent token',
    () => {
      // covers the blueprint's intrinsic-non-idempotency hazard: the provider commits a
      // rotation, the socket drops before the response arrives, and a retry with the SAME
      // (now-spent) token surfaces Expired → re-auth — the correct terminal per the caller
      // contract documented on getTokensFromOidcRefreshClaims
      when('[t0] the socket drops mid-exchange', () => {
        const outcome = useThen(
          'it throws a retryable Malfunction',
          async () => {
            endpoint.current.setNextResponse({ kind: 'socket-drop' });
            return {
              thrown: await getError(getTokensFromOidcRefreshClaims(input())),
            };
          },
        );

        then('it is OidcTokenEndpointMalfunctionError (retry)', () => {
          expect(outcome.thrown).toBeInstanceOf(
            OidcTokenEndpointMalfunctionError,
          );
        });
      });

      when('[t1] the caller retries the SAME (now-spent) token', () => {
        const outcome = useThen('it throws Expired', async () => {
          endpoint.current.setNextResponse({
            kind: 'error',
            status: 400,
            error: 'invalid_grant',
          });
          return {
            thrown: await getError(getTokensFromOidcRefreshClaims(input())),
          };
        });

        then(
          'it is OidcTokenRefreshExpiredError (re-auth) — the correct terminal',
          () => {
            expect(outcome.thrown).toBeInstanceOf(OidcTokenRefreshExpiredError);
          },
        );
      });
    },
  );
});
