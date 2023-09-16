import { MinimalTokenClaims } from 'simple-jwt-auth';

import { OidcIdentityProvider } from '../../../domain/OidcIdentityProvider';
import { getIssuerByOidcIdentityProvider } from '../provider/getIssuerByOidcIdentityProvider';

/**
 * the shape of the claims in an oidc identity token from apple
 *
 * ref
 * - https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api/authenticating_users_with_sign_in_with_apple#3383773
 */
export interface OidcIdentityTokenClaimsApple {
  /**
   * The issuer registered claim identifies the principal that issues the identity token.
   * - Because Apple generates the token, the value is https://appleid.apple.com.
   */
  iss: string;

  /**
   * The subject registered claim identifies the principal that’s the subject of the identity token.
   * - Because this token is for your app, the value is the unique identifier for the user.
   */
  sub: string;

  /**
   * The audience registered claim identifies the recipient of the identity token.
   * - Because the token is for your app, the value is the client_id from your developer account.
   */
  aud: string;

  /**
   * The issued at registered claim indicates the time that Apple issues the identity token, in the number of seconds since the Unix epoch in UTC.
   */
  iat: number;

  /**
   * The expiration time registered claim identifies the time that the identity token expires, in the number of seconds since the Unix epoch in UTC.
   * - The value must be greater than the current date and time when verifying the token.
   */
  exp: number;

  /**
   * A string for associating a client session with the identity token.
   * - This value mitigates replay attacks and is present only if you pass it in the authorization request.
   */
  nonce?: string;

  /**
   * A string value that represents the user’s email address.
   * - The email address is either the user’s real email address or the proxy address, depending on their private email relay service.
   * - This value may be empty for Sign in with Apple at Work & School users.
   *   - For example, younger students may not have an email address.
   */
  email?: string;

  /**
   * A string or Boolean value that indicates whether the service verifies the email.
   * - The value can either be a string ("true" or "false") or a Boolean (true or false).
   * - The system may not verify email addresses for Sign in with Apple at Work & School users, and this claim is "false" or false for those users.
   */
  email_verified?: string;

  /**
   * A string or Boolean value that indicates whether the email that the user shares is the proxy address.
   * - The value can either be a string ("true" or "false") or a Boolean (true or false).
   */
  is_private_email?: string | boolean;
}

export const isOfOidcIdentityTokenClaimsApple = (
  claims: MinimalTokenClaims,
): claims is OidcIdentityTokenClaimsApple =>
  claims.iss === getIssuerByOidcIdentityProvider(OidcIdentityProvider.APPLE);
