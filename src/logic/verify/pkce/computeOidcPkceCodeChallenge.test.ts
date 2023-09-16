import { computeOidcPkceCodeChallenge } from './computeOidcPkceCodeChallenge';
import { computeOidcPkceCodeVerifier } from './computeOidcPkceCodeVerifier';

describe('computeOidcPkceCodeChallenge', () => {
  it('should be deterministic', () => {
    const inputs = {
      oidcRequestUuid: '49cdec28-7a27-42f0-be33-dd3673255bde',
      userSessionUuid: null,
    };
    const verifier = computeOidcPkceCodeVerifier(inputs);
    const challenge = computeOidcPkceCodeChallenge({ verifier });
    expect(computeOidcPkceCodeChallenge({ verifier })).toEqual(challenge);
    expect(challenge).toMatchSnapshot(); // log an example
    expect(challenge.length).toEqual(43); // should always be 43
    expect(challenge).toEqual('ZSo1zPq28s1l5x11Z7aG9jG2ezcdBDeyHTAJBkSsf1Q'); // based on https://tonyxu-io.github.io/pkce-generator/
    expect(challenge).toEqual('ZSo1zPq28s1l5x11Z7aG9jG2ezcdBDeyHTAJBkSsf1Q'); // based on https://example-app.com/pkce
  });
});
