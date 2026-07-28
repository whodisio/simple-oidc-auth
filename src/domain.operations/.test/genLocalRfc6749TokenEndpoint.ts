import { createServer } from 'http';

/**
 * the closed set of answers a timestep can select — one variant per journey scenario
 *
 * note
 * - `success` omits refreshToken = no rotation; omits expiresIn = a null expiry
 * - `error` sets an rfc-6749 §5.2 json error body; retryAfterSeconds sets a Retry-After header (429)
 * - `malformed` answers a fixed-content-type (text/html) non-json body (drives the defensive-read
 *   parse-failure path)
 * - `raw` answers an arbitrary status/content-type/body verbatim — for a body that IS valid json
 *   but the wrong shape (e.g. an object without access_token, or a bare `null`), which `malformed`
 *   cannot express since it hardcodes a non-json content-type
 * - `socket-drop` abruptly destroys the socket (drives the transport-error path)
 */
export type LocalTokenResponse =
  | {
      kind: 'success';
      accessToken: string;
      refreshToken?: string;
      expiresIn?: number;
    }
  | { kind: 'error'; status: number; error: string; retryAfterSeconds?: number }
  | { kind: 'malformed'; status: number; body: string }
  | { kind: 'raw'; status: number; contentType: string; body: string }
  | { kind: 'socket-drop' };

/**
 * a handle to a running local rfc-6749 token endpoint, driven scenario-by-scenario
 */
export interface LocalRfc6749TokenEndpoint {
  /**
   * the url to pass as `provider.tokenEndpoint` (http://127.0.0.1:<port>/token)
   */
  tokenEndpoint: string;

  /**
   * set the answer the NEXT request(s) receive; safe between awaited calls
   */
  setNextResponse: (response: LocalTokenResponse) => void;

  /**
   * read the raw body of the most recent request (null before any request)
   *
   * note
   * - lets a test assert + snapshot the exact wire the caller serialized, at the real
   *   http tier — the mechanism proof, without a mock of the transport
   */
  getLastRequest: () => { body: string } | null;

  /**
   * tear the server down (afterAll)
   */
  close: () => Promise<void>;
}

/**
 * .what = stand up an in-process rfc-6749 §6 token endpoint for real-http tests
 * .why = the acceptance + integration tiers need a real token endpoint with no mocks
 *        and no external creds (rule.forbid.integration.mocks); one shared instance is
 *        walked through the journey's sequential timesteps via setNextResponse
 *
 * note
 * - a request whose wire is not a well-formed refresh grant (grant_type / refresh_token
 *   absent) always answers 400 invalid_request — so a happy-path success PROVES the
 *   caller serialized the wire correctly (the axios form-urlencoded assumption)
 * - real i/o, no mocks; torn down in afterAll
 */
export const genLocalRfc6749TokenEndpoint =
  async (): Promise<LocalRfc6749TokenEndpoint> => {
    // the answer the next request receives; changes between sequential timesteps
    // .note = deliberate mutation — the harness answer is reconfigured per timestep
    let nextResponse: LocalTokenResponse = {
      kind: 'success',
      accessToken: '__default_access__',
    };

    // the raw body of the most recent request — read back for wire assertions
    // .note = deliberate mutation — records each request as it arrives
    let lastRequestBody: string | null = null;

    const server = createServer((req, res) => {
      // collect the request body
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      req.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        lastRequestBody = rawBody;

        // reject a wire that is not a well-formed refresh grant (verifies serialization)
        const params = new URLSearchParams(rawBody);
        const wellFormed =
          params.get('grant_type') === 'refresh_token' &&
          !!params.get('refresh_token');
        if (!wellFormed) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid_request' }));
          return;
        }

        // a socket-drop scenario destroys the connection with no response
        if (nextResponse.kind === 'socket-drop') {
          res.socket?.destroy();
          return;
        }

        // a malformed scenario answers a raw non-json body
        if (nextResponse.kind === 'malformed') {
          res.writeHead(nextResponse.status, { 'content-type': 'text/html' });
          res.end(nextResponse.body);
          return;
        }

        // a raw scenario answers the exact status + content-type + body given — lets a
        // test drive the communicator's success-map guards (a json object without an
        // access_token, or a json null body) at the real http tier
        if (nextResponse.kind === 'raw') {
          res.writeHead(nextResponse.status, {
            'content-type': nextResponse.contentType,
          });
          res.end(nextResponse.body);
          return;
        }

        // an error scenario answers an rfc-6749 §5.2 json error body
        if (nextResponse.kind === 'error') {
          const headers = {
            'content-type': 'application/json',
            ...(nextResponse.retryAfterSeconds !== undefined
              ? { 'retry-after': String(nextResponse.retryAfterSeconds) }
              : {}),
          };
          res.writeHead(nextResponse.status, headers);
          res.end(JSON.stringify({ error: nextResponse.error }));
          return;
        }

        // a success scenario answers an rfc-6749 §5.1 token body
        const body = {
          access_token: nextResponse.accessToken,
          ...(nextResponse.refreshToken !== undefined
            ? { refresh_token: nextResponse.refreshToken }
            : {}),
          ...(nextResponse.expiresIn !== undefined
            ? { expires_in: nextResponse.expiresIn }
            : {}),
        };
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
      });
    });

    // bind to an ephemeral loopback port
    await new Promise<void>((done) =>
      server.listen(0, '127.0.0.1', () => done()),
    );
    const address = server.address();
    const port =
      typeof address === 'object' && address !== null ? address.port : 0;

    return {
      tokenEndpoint: `http://127.0.0.1:${port}/token`,
      setNextResponse: (response: LocalTokenResponse): void => {
        // .note = deliberate mutation — reconfigure the answer for the next timestep
        nextResponse = response;
      },
      getLastRequest: (): { body: string } | null =>
        lastRequestBody === null ? null : { body: lastRequestBody },
      close: (): Promise<void> =>
        new Promise((done, fail) =>
          server.close((error) => (error ? fail(error) : done())),
        ),
    };
  };
