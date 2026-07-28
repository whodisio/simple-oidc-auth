/**
 * the operator credentials a token-exchange flow presents to the identity-provider (rfc-6749 §2.3.1)
 *
 * note
 * - shared by both token-exchange legs (`getTokensFromOidcResponseClaims` code grant +
 *   `getTokensFromOidcRefreshClaims` refresh grant), which each authenticate with the same creds
 */
export interface OidcExchangeOperator {
  /**
   * the client id issued to the operator by the identity-provider
   */
  oidcClientId: string;

  /**
   * the client secret issued to the operator by the identity-provider
   */
  oidcClientSecret: string;
}
