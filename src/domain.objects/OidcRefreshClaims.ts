/**
 * claims presented to exchange a refresh token for fresh tokens (rfc-6749 §6)
 *
 * note
 * - these are unverified assertions the caller presents; the provider adjudicates each
 * - differs from OidcResponseClaims only in where verification happens: response claims
 *   are verified locally (hash + pkce); refresh claims are verified remotely by the provider
 */
export interface OidcRefreshClaims {
  /**
   * the token claim — "this refresh token is valid and belongs to this operator"
   *
   * note
   * - rejected by the provider as `invalid_grant` (rfc-6749 §5.2/§6) when invalid, expired,
   *   revoked, or issued to another client
   */
  token: {
    /**
     * the refresh token to spend for a fresh access token
     */
    refresh: string;
  };

  /**
   * the scope claim — which grains of access to mint into the new token (rfc-6749 §6)
   *
   * note
   * - MUST be a subset of the originally-granted scope; rejected as `invalid_scope` when it exceeds
   * - null = inherit the full original grant (the common case)
   * - [] is treated the same as null (no scope opinion); rfc-6749 §6 has no "zero scopes" request
   */
  scope: string[] | null;

  /**
   * the resource claim — which target service/audience the token is for (rfc-8707)
   *
   * note
   * - an absolute uri; audience-restricts the issued access token
   * - null = no audience restriction (the common case)
   */
  resource: string | null;
}
