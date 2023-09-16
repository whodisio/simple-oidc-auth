/**
 * wellknown oidc identity providers
 */
export enum OidcIdentityProvider {
  /**
   * ref
   * - https://developers.google.com/identity/openid-connect/openid-connect
   */
  GOOGLE = 'GOOGLE',

  /**
   * ref
   * - https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js/incorporating_sign_in_with_apple_into_other_platforms
   */
  APPLE = 'APPLE',

  /**
   * ref
   * - https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow
   */
  FACEBOOK = 'FACEBOOK',
}
