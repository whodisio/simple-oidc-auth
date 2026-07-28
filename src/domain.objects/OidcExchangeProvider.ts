/**
 * the identity-provider configuration a token-exchange flow needs (rfc-6749 token endpoint)
 *
 * note
 * - shared by both token-exchange legs (`getTokensFromOidcResponseClaims` code grant +
 *   `getTokensFromOidcRefreshClaims` refresh grant), which each POST to the same token endpoint
 */
export interface OidcExchangeProvider {
  /**
   * the token endpoint that mints tokens for the grant
   *
   * ref
   * - https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3 (code grant)
   * - https://datatracker.ietf.org/doc/html/rfc6749#section-6 (refresh grant)
   */
  tokenEndpoint: string;
}
