import { isIsoTimeStamp } from 'iso-time';
// blackbox: import the CONTRACT from the built package entrypoint (dist via link:.),
// exactly as a consumer does — never from @src/ (that would defeat the blackbox purpose)
import {
  getTokensFromOidcRefreshClaims,
  OidcTokenEndpointMalfunctionError,
  OidcTokenRefreshExpiredError,
  OidcTokenRequestRejectedError,
} from 'simple-oidc-auth';
import { getError, given, then, useBeforeAll, useThen, when } from 'test-fns';

import {
  genLocalRfc6749TokenEndpoint,
  type LocalRfc6749TokenEndpoint,
} from '@src/domain.operations/.test/genLocalRfc6749TokenEndpoint';

/**
 * a journey acceptance test — one exhaustive end-to-end flow through keyrack's realistic
 * EPHEMERAL_VIA_OAUTH daily silent-refresh lifecycle, snapshotted at each checkpoint.
 */
describe('getTokensFromOidcRefreshClaims (acceptance journey)', () => {
  const endpoint: { current: LocalRfc6749TokenEndpoint } = useBeforeAll(
    async () => ({ current: await genLocalRfc6749TokenEndpoint() }),
  );
  afterAll(async () => endpoint.current.close());

  const input = (refresh: string) => ({
    claims: { token: { refresh }, scope: null, resource: null },
    provider: { tokenEndpoint: endpoint.current.tokenEndpoint },
    operator: {
      oidcClientId: '__client_id__',
      oidcClientSecret: '__client_secret__',
    },
  });

  const asSnapshotShape = (error: Error & { metadata?: unknown }) => ({
    name: error.constructor.name,
    message: error.message,
    metadata: error.metadata,
  });

  // a transport-fault Malfunction carries a non-deterministic `cause` (a socket Error) on its
  // metadata; snapshot it in the SAME { name, message, metadata } shape as every error family
  // AND the SAME 3-key metadata shape { status, data, retryAfterMs } as the http-fault
  // Malfunction peers ([t5]/[t8]/[t10]) — the volatile cause is excluded from the snapshot and
  // asserted separately, so every Malfunction snapshot reads with one uniform metadata shape
  const asTransportSnapshotShape = (
    error: OidcTokenEndpointMalfunctionError,
  ) => ({
    name: error.constructor.name,
    message: error.message,
    metadata: {
      status: error.metadata?.status ?? null,
      data: error.metadata?.data ?? null,
      retryAfterMs: error.metadata?.retryAfterMs ?? null,
    },
  });

  given(
    '[case1] a stored refresh token from an earlier code-grant login',
    () => {
      when('[t0] the initial state — a live refresh token is held', () => {
        then('the caller holds a refresh token, no call made yet', () => {
          expect(input('__login_refresh__').claims.token.refresh).toEqual(
            '__login_refresh__',
          );
        });
      });

      when('[t1] the daily cron wakes, silent refresh, NO rotation', () => {
        // one real http round-trip via useThen — both then blocks read the same result
        const result = useThen('it resolves the fresh tokens', async () => {
          endpoint.current.setNextResponse({
            kind: 'success',
            accessToken: '__access_day1__',
            expiresIn: 3599,
          });
          return getTokensFromOidcRefreshClaims(input('__login_refresh__'));
        });

        then('access + refresh (null) are the fresh tokens', () => {
          expect({
            access: result.access,
            refresh: result.refresh,
          }).toMatchSnapshot();
        });

        then('expiresAt is an absolute IsoTimeStamp in the future', () => {
          expect(isIsoTimeStamp(result.expiresAt as string)).toEqual(true);

          // bound both sides: expires_in was 3599s, so expiresAt sits within (now, now + 3599s]
          // plus a small tolerance for the round-trip — a bug that stamped it days out is caught
          const expiresAtMs = Date.parse(result.expiresAt as string);
          const toleranceMs = 60 * 1000; // 60s covers the http round-trip + clock read
          expect(expiresAtMs).toBeGreaterThan(Date.now());
          expect(expiresAtMs).toBeLessThanOrEqual(
            Date.now() + 3599 * 1000 + toleranceMs,
          );
        });
      });

      when('[t2] the next day, refresh again, provider DOES rotate', () => {
        then('the new refresh token is surfaced', async () => {
          endpoint.current.setNextResponse({
            kind: 'success',
            accessToken: '__access_day2__',
            refreshToken: '__refresh_day2__',
            expiresIn: 3599,
          });
          const { access, refresh } = await getTokensFromOidcRefreshClaims(
            input('__login_refresh__'),
          );
          expect({ access, refresh }).toMatchSnapshot();
        });
      });

      when('[t3] a stale retry with the OLD (pre-rotation) token', () => {
        then(
          'it throws OidcTokenRefreshExpiredError (single-use rotation)',
          async () => {
            endpoint.current.setNextResponse({
              kind: 'error',
              status: 400,
              error: 'invalid_grant',
            });
            const error = await getError(
              getTokensFromOidcRefreshClaims(input('__login_refresh__')),
            );
            expect(error).toBeInstanceOf(OidcTokenRefreshExpiredError);
            expect(asSnapshotShape(error)).toMatchSnapshot();
          },
        );
      });

      when('[t4] recover with the NEW token; provider OMITS expires_in', () => {
        then('the rotated token works and expiresAt is null', async () => {
          endpoint.current.setNextResponse({
            kind: 'success',
            accessToken: '__access_day2b__',
          });
          const result = await getTokensFromOidcRefreshClaims(
            input('__refresh_day2__'),
          );
          // snapshot the same { access, refresh } shape as every other success
          // checkpoint; assert the null expiry separately so all success snaps stay uniform
          expect({
            access: result.access,
            refresh: result.refresh,
          }).toMatchSnapshot();
          expect(result.expiresAt).toBeNull();
        });
      });

      when('[t5] the endpoint hiccups mid-cycle (503)', () => {
        then(
          'it throws OidcTokenEndpointMalfunctionError (do NOT discard token)',
          async () => {
            endpoint.current.setNextResponse({
              kind: 'error',
              status: 503,
              error: 'temporarily_unavailable',
            });
            const error = await getError(
              getTokensFromOidcRefreshClaims(input('__refresh_day2__')),
            );
            expect(error).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
            expect(asSnapshotShape(error)).toMatchSnapshot();
          },
        );
      });

      when('[t6] backoff, then retry the SAME good token', () => {
        then('the good token survived the hiccup', async () => {
          endpoint.current.setNextResponse({
            kind: 'success',
            accessToken: '__access_day2c__',
            expiresIn: 3599,
          });
          const { access, refresh } = await getTokensFromOidcRefreshClaims(
            input('__refresh_day2__'),
          );
          expect({ access, refresh }).toMatchSnapshot();
        });
      });

      when(
        '[t7] a down-scoped refresh whose scope exceeds the grant (invalid_scope)',
        () => {
          then(
            'it throws OidcTokenRequestRejectedError (narrow, do NOT re-auth)',
            async () => {
              endpoint.current.setNextResponse({
                kind: 'error',
                status: 400,
                error: 'invalid_scope',
              });
              const error = await getError(
                getTokensFromOidcRefreshClaims({
                  ...input('__refresh_day2__'),
                  claims: {
                    token: { refresh: '__refresh_day2__' },
                    scope: ['too', 'broad'],
                    resource: null,
                  },
                }),
              );
              expect(error).toBeInstanceOf(OidcTokenRequestRejectedError);
              expect(asSnapshotShape(error)).toMatchSnapshot();
            },
          );
        },
      );

      when('[t8] the provider rate-limits (429 with Retry-After: 30)', () => {
        then(
          'it throws OidcTokenEndpointMalfunctionError with retryAfterMs: 30000',
          async () => {
            endpoint.current.setNextResponse({
              kind: 'error',
              status: 429,
              error: 'rate_limited',
              retryAfterSeconds: 30,
            });
            const error = (await getError(
              getTokensFromOidcRefreshClaims(input('__refresh_day2__')),
            )) as OidcTokenEndpointMalfunctionError;
            expect(error).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
            expect(error.metadata?.retryAfterMs).toEqual(30000);
            expect(asSnapshotShape(error)).toMatchSnapshot();
          },
        );
      });

      when(
        '[t9] end of life — the provider revokes the refresh (invalid_grant)',
        () => {
          then(
            'it throws OidcTokenRefreshExpiredError (route human to re-auth)',
            async () => {
              endpoint.current.setNextResponse({
                kind: 'error',
                status: 400,
                error: 'invalid_grant',
              });
              const error = await getError(
                getTokensFromOidcRefreshClaims(input('__refresh_day2__')),
              );
              expect(error).toBeInstanceOf(OidcTokenRefreshExpiredError);
              expect(asSnapshotShape(error)).toMatchSnapshot();
            },
          );
        },
      );

      when(
        '[t10] the endpoint answers a malformed 2xx (no access_token)',
        () => {
          then(
            'it throws OidcTokenEndpointMalfunctionError (provider fault, retry)',
            async () => {
              endpoint.current.setNextResponse({
                kind: 'malformed',
                status: 200,
                body: '<html>not a token body</html>',
              });
              const error = await getError(
                getTokensFromOidcRefreshClaims(input('__refresh_day2__')),
              );
              expect(error).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
              expect(asSnapshotShape(error)).toMatchSnapshot();
            },
          );
        },
      );

      when(
        '[t11] a down-scoped refresh with an explicit resource claim succeeds',
        () => {
          then('the fresh token is surfaced', async () => {
            endpoint.current.setNextResponse({
              kind: 'success',
              accessToken: '__access_scoped__',
              expiresIn: 3599,
            });
            const { access, refresh } = await getTokensFromOidcRefreshClaims({
              ...input('__refresh_day2__'),
              claims: {
                token: { refresh: '__refresh_day2__' },
                scope: ['email', 'profile'],
                resource: 'https://api.example.com',
              },
            });
            expect({ access, refresh }).toMatchSnapshot();
          });
        },
      );

      when('[t12] the endpoint drops the socket (transport error)', () => {
        then(
          'it throws OidcTokenEndpointMalfunctionError with a cause',
          async () => {
            endpoint.current.setNextResponse({ kind: 'socket-drop' });
            const error = (await getError(
              getTokensFromOidcRefreshClaims(input('__refresh_day2__')),
            )) as OidcTokenEndpointMalfunctionError;
            expect(error).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
            // the transport snapshot shares the uniform 3-key metadata shape; the volatile
            // cause is excluded from the snapshot and asserted here as present
            expect(error.metadata?.cause instanceof Error).toEqual(true);
            expect(asTransportSnapshotShape(error)).toMatchSnapshot();
          },
        );
      });

      when(
        '[t13] the operator credentials are bad (invalid_client, 401)',
        () => {
          then(
            'it throws OidcTokenRequestRejectedError (fix creds, do NOT re-auth)',
            async () => {
              endpoint.current.setNextResponse({
                kind: 'error',
                status: 401,
                error: 'invalid_client',
              });
              const error = await getError(
                getTokensFromOidcRefreshClaims(input('__refresh_day2__')),
              );
              expect(error).toBeInstanceOf(OidcTokenRequestRejectedError);
              expect(asSnapshotShape(error)).toMatchSnapshot();
            },
          );
        },
      );

      // the intrinsic non-idempotency arc (blueprint caveat + integration usecase9), now proven
      // at the blackbox tier: a transport drop AFTER the provider commits a rotation, then a retry
      // with the now-spent token. the consumer (keyrack) sees Malfunction (retry) → Expired (re-auth)
      when(
        '[t14] a rotation-collision — socket drop, then retry the now-spent token',
        () => {
          then(
            'first, the transport drop throws OidcTokenEndpointMalfunctionError (retry, do NOT discard)',
            async () => {
              endpoint.current.setNextResponse({ kind: 'socket-drop' });
              const error = (await getError(
                getTokensFromOidcRefreshClaims(input('__refresh_collision__')),
              )) as OidcTokenEndpointMalfunctionError;
              expect(error).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
              // the transport snapshot shares the uniform 3-key metadata shape; the volatile
              // cause is excluded from the snapshot and asserted here as present
              expect(error.metadata?.cause instanceof Error).toEqual(true);
              expect(asTransportSnapshotShape(error)).toMatchSnapshot();
            },
          );

          then(
            'then, the retry with the spent token throws OidcTokenRefreshExpiredError (re-auth)',
            async () => {
              // the rotation committed server-side, so the same token is now invalid_grant
              endpoint.current.setNextResponse({
                kind: 'error',
                status: 400,
                error: 'invalid_grant',
              });
              const error = await getError(
                getTokensFromOidcRefreshClaims(input('__refresh_collision__')),
              );
              expect(error).toBeInstanceOf(OidcTokenRefreshExpiredError);
              expect(asSnapshotShape(error)).toMatchSnapshot();
            },
          );
        },
      );
    },
  );
});
