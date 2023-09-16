import { getError } from '@ehmpathy/error-fns';
import { given, when, then } from 'test-fns';
import { stringifyQueryParams } from 'url-fns';

import { uuid } from '../../../deps';
import { PotentialOidcAttackError } from '../../errors/PotentialOidcAttackError';
import { parseOidcAuthenticationResponse } from './parseOidcAuthenticationResponse';

const exampleSessionConfig = {
  issuer: 'https://oauth.whodis.io/32b8b554-12f5-4f9b-9f16-b13e0b532019',
  audience: 'https://github.com/whodisio/simple-oidc-auth',
};

const authentic = {
  oidcResponseCode: '__oidc_response_code__',
  oidcRequestHash: '__oidc_request_hash__',
  oidcRequestUuid: uuid(),
};

describe('parseOidcAuthenticationResponse', () => {
  given(
    'an authentic oidc response was sent on behalf of an authentic user',
    () => {
      when('sent via get', () => {
        const method = 'GET' as const;
        const queryParams = {
          code: authentic.oidcResponseCode,
          state: stringifyQueryParams({ hash: authentic.oidcRequestHash }),
        };

        when('they dont have an existing session', () => {
          const headers = {
            cookie: `origination=${authentic.oidcRequestUuid}`,
          };

          then('we can parse their request correctly', async () => {
            const parsed = await parseOidcAuthenticationResponse({
              method,
              endpoint: '__endpoint__',
              headers,
              queryParams,
              session: exampleSessionConfig,
            });
            expect(parsed.public.oidcResponseCode).toEqual(
              authentic.oidcResponseCode,
            );
            expect(parsed.public.oidcRequestHash).toEqual(
              authentic.oidcRequestHash,
            );
            expect(parsed.public.oidcRequestRedirectUri).toEqual(
              '__endpoint__',
            );
            expect(parsed.secure.oidcRequestUuid).toEqual(
              authentic.oidcRequestUuid,
            );
            expect(parsed.secure.userSessionUuid).toEqual(null);
          });
        });

        when('they do have an existing session', () => {
          const exampleAuthableToken = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjRkLjMyYjhiNTU0LTEyZjUtNGY5Yi05ZjE2LWIxM2UwYjUzMjAxOSJ9.eyJpc3MiOiJodHRwczovL29hdXRoLndob2Rpcy5pby8zMmI4YjU1NC0xMmY1LTRmOWItOWYxNi1iMTNlMGI1MzIwMTkiLCJkaXIiOiIzMmI4YjU1NC0xMmY1LTRmOWItOWYxNi1iMTNlMGI1MzIwMTkiLCJhdWQiOiJodHRwczovL2dpdGh1Yi5jb20vd2hvZGlzaW8vc2ltcGxlLW9pZGMtYXV0aCIsInN1YiI6ImJlZWZiZWVmLWJlZWYtYmVlZi1iZWVmLWJlZWZiZWVmYmVlZiIsImp0aSI6ImU4NGE3YzhkLTljMzgtNDg5ZS1iMzllLTg1ZTc5NjMxNWM0NSIsImlhdCI6MTY5NDQzODU0MywibmJmIjoxNjk0NDM4NTQzLCJleHAiOjQ4NDgwMzg1NDMsInR0bCI6NDg0ODAzODU0M30.lYQN8KdluqO1WYW_e1dXKdPcMSyPdokXRvNSt3WCET8CzywNeQFzx7-5PgMSOzP-rgnTalTspxv-Intd3w82IZ_B97mCoO6NFC-AthkQI3_hzMqNGPcCcSSGlI3kr2sDPJdsMspw59S0SEk9zr-OEgpnJE6aiSeWIyMQPCoLQeL6OBlK6KL9Ia2bJDFML95VIly7KPVBRmzQ6vxVJ7zcRHbpgHsnVBwPCNE2usx2BgHj2AWj384f_fVzxxgo_Ysz2HntAWh52meOnWBdb5wITDSQxODCfu9ZqnVaPnlDkqu08c-BvAo6nqown8JbhEGW7A2jUmlUoOa1u-W0kx0Ic3DRZE6P4HRy2qVLcbqiYEwV_0EdIxtKspPyJ6jvLdhlj2Wy0W67X9IasmNIcYyg75DsYEA1RgkZMl-mYwKnOdPgXZG6B1Whin6FElxjglEoex5WxkvzGnO3wjaWIuTn9CxFL3K6h2K5oqfCJfo36zTbeXk6lH6dQXUOXEH1ZMRaHq743EnOz-b0weWKZ1mvc7U7v-bioJZ_7FzJTfrGBqZj-oF0Vi7GZM4wDltwt9jb8b9jK2sI1rmeHeOe9ycQ0JKC9BkC77q9vB5LFLLBje5NWeVGNYgLMmcfrIXNT3oV1G1yC84YaVYuOe_1iG_WMGex5bHZDV37tL5PKZXsjdk`;
          const headers = {
            cookie: `origination=${authentic.oidcRequestUuid}; authorization=${exampleAuthableToken}`,
          };

          then('we can parse their request correctly', async () => {
            const parsed = await parseOidcAuthenticationResponse({
              method,
              endpoint: '__endpoint__',
              headers,
              queryParams,
              session: exampleSessionConfig,
            });
            expect(parsed.public.oidcResponseCode).toEqual(
              authentic.oidcResponseCode,
            );
            expect(parsed.public.oidcRequestHash).toEqual(
              authentic.oidcRequestHash,
            );
            expect(parsed.public.oidcRequestRedirectUri).toEqual(
              '__endpoint__',
            );
            expect(parsed.secure.oidcRequestUuid).toEqual(
              authentic.oidcRequestUuid,
            );
            expect(parsed.secure.userSessionUuid).toEqual(
              'e84a7c8d-9c38-489e-b39e-85e796315c45',
            );
          });
        });
      });
    },
  );

  given('an attacker is attempting to abuse the oidc response endpoint', () => {
    when('sent via get', () => {
      const method = 'GET' as const;
      const queryParams = {
        code: authentic.oidcResponseCode,
        state: stringifyQueryParams({ hash: authentic.oidcRequestHash }),
      };

      when('no oidc request uuid was provided via cookie', () => {
        then('a warning error should be thrown', async () => {
          const error = await getError(
            parseOidcAuthenticationResponse({
              method,
              endpoint: '__endpoint__',
              headers: { cookie: 'asdf=fdsa' },
              queryParams,
              session: exampleSessionConfig,
            }),
          );
          expect(error).toBeInstanceOf(PotentialOidcAttackError);
          expect(error.message).toContain('no `origination` cookie was found');
        });
      });
    });
  });
});
