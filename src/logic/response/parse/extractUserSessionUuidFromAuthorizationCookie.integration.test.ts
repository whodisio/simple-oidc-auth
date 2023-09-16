import { getError } from '@ehmpathy/error-fns';
import { JwtVerificationError } from 'simple-jwt-auth';

import { extractUserSessionUuidFromAuthorizationCookie } from './extractUserSessionUuidFromAuthorizationCookie';

const exampleSessionConfig = {
  issuer: 'https://oauth.whodis.io/32b8b554-12f5-4f9b-9f16-b13e0b532019',
  audience: 'https://github.com/whodisio/simple-oidc-auth',
};

describe('extractUserSessionUuidFromAuthorizationCookie', () => {
  it('should return null if no authentication token can be found', async () => {
    const headers = {};
    const { userSessionUuid } =
      await extractUserSessionUuidFromAuthorizationCookie({
        headers,
        session: exampleSessionConfig,
      });
    expect(userSessionUuid).toEqual(null);
  });
  it('should return null if the authentication token is expired', async () => {
    const exampleExpiredToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2F1dGgud2hvZGlzLmlvLy4uLiIsImF1ZCI6ImU5MTMwNTMwLTEwNzItNDkxNS1hOGI5LTk3NDkwMGRiZWU1ZCIsInN1YiI6IjEyMzQ1Njc4OTAiLCJuYW1lIjoiSm9obiBEb2UiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTUxNjIzOTAyMn0.ivXS-95cx_WJbRHN89enW9TmAyKuRoXPu51D4XWUXFY`;
    const headers = {
      cookie: `authorization=${exampleExpiredToken}`,
    };
    const { userSessionUuid } =
      await extractUserSessionUuidFromAuthorizationCookie({
        headers,
        session: exampleSessionConfig,
      });
    expect(userSessionUuid).toEqual(null);
  });
  it('should throw an error if the token is not authable, as it may indicate an attack', async () => {
    const exampleWrongAudienceToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2F1dGgud2hvZGlzLmlvLy4uLiIsImF1ZCI6ImU5MTMwNTMwLTEwNzItNDkxNS1hOGI5LTk3NDkwMGRiZWU1ZCIsInN1YiI6IjEyMzQ1Njc4OTAiLCJuYW1lIjoiSm9obiBEb2UiLCJpYXQiOjE1MTYyMzkwMjJ9.M8rF3aCuWyXuvfJmfDzUiSdTFIiBTGbjTkgrnXTmX2k`;
    const headers = {
      cookie: `authorization=${exampleWrongAudienceToken}`,
    };
    const error = await getError(
      extractUserSessionUuidFromAuthorizationCookie({
        headers,
        session: exampleSessionConfig,
      }),
    );
    expect(error).toBeInstanceOf(JwtVerificationError);
    expect(error.message).toContain('this JWT can not be trusted!');
    expect(error.message).toContain('token was issued by an unintended issuer');
  });
  it('should return the jti as the user session uuid if authable token found', async () => {
    const exampleAuthableToken = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjRkLjMyYjhiNTU0LTEyZjUtNGY5Yi05ZjE2LWIxM2UwYjUzMjAxOSJ9.eyJpc3MiOiJodHRwczovL29hdXRoLndob2Rpcy5pby8zMmI4YjU1NC0xMmY1LTRmOWItOWYxNi1iMTNlMGI1MzIwMTkiLCJkaXIiOiIzMmI4YjU1NC0xMmY1LTRmOWItOWYxNi1iMTNlMGI1MzIwMTkiLCJhdWQiOiJodHRwczovL2dpdGh1Yi5jb20vd2hvZGlzaW8vc2ltcGxlLW9pZGMtYXV0aCIsInN1YiI6ImJlZWZiZWVmLWJlZWYtYmVlZi1iZWVmLWJlZWZiZWVmYmVlZiIsImp0aSI6ImU4NGE3YzhkLTljMzgtNDg5ZS1iMzllLTg1ZTc5NjMxNWM0NSIsImlhdCI6MTY5NDQzODU0MywibmJmIjoxNjk0NDM4NTQzLCJleHAiOjQ4NDgwMzg1NDMsInR0bCI6NDg0ODAzODU0M30.lYQN8KdluqO1WYW_e1dXKdPcMSyPdokXRvNSt3WCET8CzywNeQFzx7-5PgMSOzP-rgnTalTspxv-Intd3w82IZ_B97mCoO6NFC-AthkQI3_hzMqNGPcCcSSGlI3kr2sDPJdsMspw59S0SEk9zr-OEgpnJE6aiSeWIyMQPCoLQeL6OBlK6KL9Ia2bJDFML95VIly7KPVBRmzQ6vxVJ7zcRHbpgHsnVBwPCNE2usx2BgHj2AWj384f_fVzxxgo_Ysz2HntAWh52meOnWBdb5wITDSQxODCfu9ZqnVaPnlDkqu08c-BvAo6nqown8JbhEGW7A2jUmlUoOa1u-W0kx0Ic3DRZE6P4HRy2qVLcbqiYEwV_0EdIxtKspPyJ6jvLdhlj2Wy0W67X9IasmNIcYyg75DsYEA1RgkZMl-mYwKnOdPgXZG6B1Whin6FElxjglEoex5WxkvzGnO3wjaWIuTn9CxFL3K6h2K5oqfCJfo36zTbeXk6lH6dQXUOXEH1ZMRaHq743EnOz-b0weWKZ1mvc7U7v-bioJZ_7FzJTfrGBqZj-oF0Vi7GZM4wDltwt9jb8b9jK2sI1rmeHeOe9ycQ0JKC9BkC77q9vB5LFLLBje5NWeVGNYgLMmcfrIXNT3oV1G1yC84YaVYuOe_1iG_WMGex5bHZDV37tL5PKZXsjdk`;
    const headers = {
      cookie: `authorization=${exampleAuthableToken}`,
    };
    const { userSessionUuid } =
      await extractUserSessionUuidFromAuthorizationCookie({
        headers,
        session: exampleSessionConfig,
      });
    expect(userSessionUuid).toEqual('e84a7c8d-9c38-489e-b39e-85e796315c45');
  });
});
