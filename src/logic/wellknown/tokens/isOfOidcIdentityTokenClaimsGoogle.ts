import { MinimalTokenClaims } from 'simple-jwt-auth';

import { OidcIdentityProvider } from '../../../domain/OidcIdentityProvider';
import { getIssuerByOidcIdentityProvider } from '../provider/getIssuerByOidcIdentityProvider';

/**
 * the shape of the claims in an oidc identity token from google
 *
 * ref
 * - https://developers.google.com/identity/openid-connect/openid-connect#obtainuserinfo
 */
export interface OidcIdentityTokenClaimsGoogle {
  /**
   * the Issuer Identifier for the Issuer of the response. Always https://accounts.google.com or accounts.google.com for Google ID tokens.
   */
  iss: string;

  /**
   * the audience that this ID token is intended for. It must be one of the OAuth 2.0 client IDs of your application.
   */
  aud: string;

  /**
   * an identifier for the user, unique among all Google accounts and never reused.
   * - a google account can have multiple email addresses at different points in time, but the sub value is never changed.
   * - use sub within your application as the unique-identifier key for the user.
   * - maximum length of 255 case-sensitive ASCII characters.
   */
  sub: string;

  /**
   * the user's email address
   * - this value may not be unique to this user and is not suitable for use as a primary key
   * - provided only if your scope included the email scope value
   */
  email?: string;

  /**
   * true if the user's e-mail address has been verified; otherwise false.
   */
  email_verified?: string;

  /**
   * the user's full name, in a displayable form.
   * - might be provided when:
   *   - request scope included the string "profile"
   *   - the id token is returned from a token refresh
   */
  name?: string;

  /**
   * the URL of the user's profile picture.
   * - might be provided when:
   *   - the request scope included the string "profile"
   *   - the id token is returned from a token refresh
   */
  picture?: string;

  /**
   * the user's surname(s) or last name(s).
   * - might be provided when a name claim is present.
   */
  family_name?: string;

  /**
   * the user's given name(s) or first name(s).
   * - might be provided when a name claim is present.
   */
  given_name?: string;

  /**
   * the user's locale, represented by a BCP 47 language tag.
   * - might be provided when a name claim is present.
   */
  locale?: string;

  /**
   * expiration time on or after which the ID token must not be accepted. Represented in Unix time (integer seconds).
   */
  exp: number;

  /**
   * the time the ID token was issued. Represented in Unix time (integer seconds).
   */
  iat: number;
}

export const isOfOidcIdentityTokenClaimsGoogle = (
  claims: MinimalTokenClaims,
): claims is OidcIdentityTokenClaimsGoogle =>
  claims.iss === getIssuerByOidcIdentityProvider(OidcIdentityProvider.GOOGLE);
