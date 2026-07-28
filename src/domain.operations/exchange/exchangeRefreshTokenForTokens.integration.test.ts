import { isIsoTimeStamp } from 'iso-time';
import { getError, given, then, useBeforeAll, useThen, when } from 'test-fns';

import {
  genLocalRfc6749TokenEndpoint,
  type LocalRfc6749TokenEndpoint,
} from '@src/domain.operations/.test/genLocalRfc6749TokenEndpoint';
import { OidcTokenEndpointMalfunctionError } from '@src/domain.operations/errors/OidcTokenEndpointMalfunctionError';
import { OidcTokenRefreshExpiredError } from '@src/domain.operations/errors/OidcTokenRefreshExpiredError';
import { OidcTokenRequestRejectedError } from '@src/domain.operations/errors/OidcTokenRequestRejectedError';

import { exchangeRefreshTokenForTokens } from './exchangeRefreshTokenForTokens';

describe('exchangeRefreshTokenForTokens (integration)', () => {
  const endpoint: { current: LocalRfc6749TokenEndpoint } = useBeforeAll(
    async () => ({ current: await genLocalRfc6749TokenEndpoint() }),
  );
  afterAll(async () => endpoint.current.close());

  const exampleInput = () => ({
    endpoint: endpoint.current.tokenEndpoint,
    oidcClientId: '__client_id__',
    oidcClientSecret: '__client_secret__',
    refreshToken: '__refresh_token__',
    scope: null,
    resource: null,
  });

  given('[case1] the endpoint honors the refresh grant (no rotation)', () => {
    when('[t0] the exchange is called', () => {
      // one real http round-trip via useThen — every then reads the same result
      const result = useThen('it resolves the fresh tokens', async () => {
        endpoint.current.setNextResponse({
          kind: 'success',
          accessToken: '__fresh_access__',
          expiresIn: 3599,
        });
        return exchangeRefreshTokenForTokens(exampleInput());
      });

      then(
        'access is the fresh token — proves the wire serialized correctly',
        () => {
          expect(result.access).toEqual('__fresh_access__');
        },
      );

      then('refresh is null (no rotation)', () => {
        expect(result.refresh).toBeNull();
      });

      then('expiresAt is an absolute IsoTimeStamp', () => {
        expect(isIsoTimeStamp(result.expiresAt as string)).toEqual(true);
      });
    });
  });

  given('[case2] the endpoint rotates the refresh token', () => {
    when('[t0] the exchange is called', () => {
      then('refresh is the new token', async () => {
        endpoint.current.setNextResponse({
          kind: 'success',
          accessToken: '__fresh_access__',
          refreshToken: '__rotated_refresh__',
        });
        const { refresh } = await exchangeRefreshTokenForTokens(exampleInput());
        expect(refresh).toEqual('__rotated_refresh__');
      });
    });
  });

  given('[case3] the endpoint answers invalid_grant (400)', () => {
    when('[t0] the exchange is called', () => {
      then('it throws OidcTokenRefreshExpiredError (re-auth)', async () => {
        endpoint.current.setNextResponse({
          kind: 'error',
          status: 400,
          error: 'invalid_grant',
        });
        const thrown = await getError(
          exchangeRefreshTokenForTokens(exampleInput()),
        );
        expect(thrown).toBeInstanceOf(OidcTokenRefreshExpiredError);
      });
    });
  });

  given('[case4] the endpoint answers invalid_scope (400)', () => {
    when('[t0] the exchange is called', () => {
      then(
        'it throws OidcTokenRequestRejectedError (fix request)',
        async () => {
          endpoint.current.setNextResponse({
            kind: 'error',
            status: 400,
            error: 'invalid_scope',
          });
          const thrown = await getError(
            exchangeRefreshTokenForTokens(exampleInput()),
          );
          expect(thrown).toBeInstanceOf(OidcTokenRequestRejectedError);
        },
      );
    });
  });

  given('[case5] the endpoint returns 503', () => {
    when('[t0] the exchange is called', () => {
      then('it throws OidcTokenEndpointMalfunctionError (retry)', async () => {
        endpoint.current.setNextResponse({
          kind: 'error',
          status: 503,
          error: 'temporarily_unavailable',
        });
        const thrown = await getError(
          exchangeRefreshTokenForTokens(exampleInput()),
        );
        expect(thrown).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
      });
    });
  });

  given('[case6] the endpoint rate-limits with 429 + Retry-After', () => {
    when('[t0] the exchange is called', () => {
      // wrap the thrown error in a named field so the proxy holds the real Error reference
      const outcome = useThen('it throws for a 429 rate-limit', async () => {
        endpoint.current.setNextResponse({
          kind: 'error',
          status: 429,
          error: 'rate_limited',
          retryAfterSeconds: 30,
        });
        return {
          thrown: await getError(exchangeRefreshTokenForTokens(exampleInput())),
        };
      });

      then('it throws OidcTokenEndpointMalfunctionError', () => {
        expect(outcome.thrown).toBeInstanceOf(
          OidcTokenEndpointMalfunctionError,
        );
      });

      then('it carries the retry-after interval in milliseconds', () => {
        const error = outcome.thrown as OidcTokenEndpointMalfunctionError;
        expect(error.metadata?.retryAfterMs).toEqual(30000);
      });
    });
  });

  given('[case7] the endpoint drops the socket', () => {
    when('[t0] the exchange is called', () => {
      then(
        'it throws OidcTokenEndpointMalfunctionError (transport)',
        async () => {
          endpoint.current.setNextResponse({ kind: 'socket-drop' });
          const thrown = await getError(
            exchangeRefreshTokenForTokens(exampleInput()),
          );
          expect(thrown).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
        },
      );
    });
  });

  given(
    '[case8] the endpoint returns a malformed 2xx (non-object body)',
    () => {
      when('[t0] the exchange is called', () => {
        then(
          'it throws OidcTokenEndpointMalfunctionError (provider fault)',
          async () => {
            endpoint.current.setNextResponse({
              kind: 'malformed',
              status: 200,
              body: '<html>not json</html>',
            });
            const thrown = await getError(
              exchangeRefreshTokenForTokens(exampleInput()),
            );
            expect(thrown).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
          },
        );
      });
    },
  );

  given('[case9] scope + resource are set', () => {
    when('[t0] the exchange is called', () => {
      // one real round-trip; read the received wire back off the endpoint
      const wire = useThen('the endpoint records the request', async () => {
        endpoint.current.setNextResponse({
          kind: 'success',
          accessToken: '__fresh_access__',
        });
        await exchangeRefreshTokenForTokens({
          ...exampleInput(),
          scope: 'email profile',
          resource: 'https://api.example.com',
        });
        const received = endpoint.current.getLastRequest();
        return {
          body: received?.body ?? '',
          params: new URLSearchParams(received?.body ?? ''),
        };
      });

      then('the refresh grant wire params serialized correctly', () => {
        expect(wire.params.get('grant_type')).toEqual('refresh_token');
        expect(wire.params.get('refresh_token')).toEqual('__refresh_token__');
        expect(wire.params.get('client_id')).toEqual('__client_id__');
        expect(wire.params.get('client_secret')).toEqual('__client_secret__');
        expect(wire.params.get('scope')).toEqual('email profile');
        expect(wire.params.get('resource')).toEqual('https://api.example.com');
      });

      then('the raw form-urlencoded body matches the snapshot', () => {
        expect(wire.body).toMatchSnapshot();
      });
    });
  });

  given('[case10] scope + resource are null', () => {
    when('[t0] the exchange is called', () => {
      then('the scope + resource wire params are omitted', async () => {
        endpoint.current.setNextResponse({
          kind: 'success',
          accessToken: '__fresh_access__',
        });
        await exchangeRefreshTokenForTokens(exampleInput());
        const params = new URLSearchParams(
          endpoint.current.getLastRequest()?.body ?? '',
        );
        expect(params.has('scope')).toEqual(false);
        expect(params.has('resource')).toEqual(false);
      });
    });
  });

  given('[case11] a 200 success that omits expires_in', () => {
    when('[t0] the exchange is called', () => {
      then('expiresAt is null — an explicit unknown expiry', async () => {
        endpoint.current.setNextResponse({
          kind: 'success',
          accessToken: '__fresh_access__',
        });
        const { expiresAt } = await exchangeRefreshTokenForTokens(
          exampleInput(),
        );
        expect(expiresAt).toBeNull();
      });
    });
  });

  given('[case12] a 200 json object body without an access_token', () => {
    when('[t0] the exchange is called', () => {
      then(
        'it throws OidcTokenEndpointMalfunctionError (provider fault)',
        async () => {
          endpoint.current.setNextResponse({
            kind: 'raw',
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ unexpected: true }),
          });
          const thrown = await getError(
            exchangeRefreshTokenForTokens(exampleInput()),
          );
          expect(thrown).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
        },
      );
    });
  });

  given('[case13] a 200 json body that is a bare null', () => {
    when('[t0] the exchange is called', () => {
      then(
        'it throws OidcTokenEndpointMalfunctionError (not a raw TypeError)',
        async () => {
          // typeof null === 'object', so the `=== null` guard is the only clause that
          // catches a bare-null 2xx body before the destructure would throw a raw TypeError
          endpoint.current.setNextResponse({
            kind: 'raw',
            status: 200,
            contentType: 'application/json',
            body: 'null',
          });
          const thrown = await getError(
            exchangeRefreshTokenForTokens(exampleInput()),
          );
          expect(thrown).toBeInstanceOf(OidcTokenEndpointMalfunctionError);
        },
      );
    });
  });
});
