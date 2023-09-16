/**
 * claims sent as part of an oidc response
 */
export interface OidcResponseClaims {
  /**
   * claims that are expected to be handled via public channels by the responder
   */
  public: {
    /**
     * the `code` answer from the identity-provider which can be exchanged for tokens when combined with secrets
     */
    oidcResponseCode: string;

    /**
     * the `hash` forwarded by the identity-provider which can be used to verify that the responder has ownership of the secure claims
     */
    oidcRequestHash: string;

    /**
     * the redirect uri to which the response was sent
     */
    oidcRequestRedirectUri: string;
  };

  /**
   * claims that are expected to be handled via secure channels by the responder
   *
   * note
   * - these claims should be handled only via secure,samesite,serveronly cookies
   */
  secure: {
    /**
     * the identifier of the request that was persisted as a secure, httpsonly, samesite cookie when the challenge was issued
     *
     * usecase
     * - this is often a primary key that the backend can use to lookup more details about the request
     * - this is required to exchange an oidc response code for tokens, to eliminate the `unverified redirect claims` pinj vulnerability
     *
     * note
     * - this is the value extracted from the `origination` cookie, required
     */
    oidcRequestUuid: string;

    /**
     * the identifier of the current caller's user session
     *
     * usecase
     * - this is required to exchange an oidc response code for tokens, to eliminate the `unintended user session` csrf vulnerability
     *
     * note
     * - this is the `jti` extracted from the authed jwt found in the `authentication` cookie, when present
     */
    userSessionUuid: string | null;
  };
}
