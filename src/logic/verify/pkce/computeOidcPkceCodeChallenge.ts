import { sha256 } from 'cross-sha256';

import { castBase64ToBase64Url } from '../../base64Url/castBase64ToBase64Url';

/**
 * computes the pkce code challenge from the pkce code verifier
 *
 * spec
 * ```
 *       code_challenge = BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))
 * ```
 *
 * ref
 * - https://datatracker.ietf.org/doc/html/rfc7636#section-4.2
 * - https://stackoverflow.com/questions/63309409/creating-a-code-verifier-and-challenge-for-pkce-auth-on-spotify-api-in-reactjs
 */
export const computeOidcPkceCodeChallenge = ({
  verifier,
}: {
  verifier: string;
}): string =>
  castBase64ToBase64Url(new sha256().update(verifier).digest('base64'));
