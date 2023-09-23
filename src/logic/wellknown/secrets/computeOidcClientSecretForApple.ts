import { createSecureDistributedAuthToken } from 'simple-jwt-auth';

/**
 * claims required on the client secret token generated for apple token exchanges
 *
 * ref
 * - https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens#3262048
 */
export interface AppleClientSecretClaims {
  /**
   * The issuer registered claim identifies the principal that issued the client secret.
   * Since the client secret belongs to your developer team, use your 10-character Team ID associated with your developer account.
   */
  iss: string;

  /**
   * The issued at registered claim indicates the time at which you generated the client secret, in terms of the number of seconds since Epoch, in UTC.
   */
  iat: number;

  /**
   * The expiration time registered claim identifies the time on or after which the client secret expires.
   * The value must not be greater than 15777000 (6 months in seconds) from the Current UNIX Time on the server.
   */
  exp: number;

  /**
   * The audience registered claim identifies the intended recipient of the client secret.
   * Since the client secret is sent to the validation server, use https://appleid.apple.com.
   */
  aud: string;

  /**
   * The subject registered claim identifies the principal that is the subject of the client secret.
   * Since this client secret is meant for your application, use the same value as client_id. The value is case-sensitive.
   */
  sub: string;
}

/**
 * tactic: compute the oidc client secret required for token exchange with apple
 * context:
 * - apple requires you to generate a client secret from the private key you create for your app
 * ref
 * - https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens#3262048
 * - https://developer.apple.com/help/account/configure-app-capabilities/create-a-sign-in-with-apple-private-key
 * - https://developer.apple.com/documentation/sign_in_with_apple/configuring_your_environment_for_sign_in_with_apple
 */
export const computeOidcClientSecretForApple = ({
  developerTeamId,
  clientId,
  privateKeyId,
  privateKeyValue,
}: {
  /**
   * the 10-character team id associated with your apple developer account.
   */
  developerTeamId: string;

  /**
   * the client id for this request
   *
   * note
   * - this is equal to the `Service ID` bundle identifier created in the apple developer portal for this oidc auth flow
   */
  clientId: string;

  /**
   * the id of the private key
   */
  privateKeyId: string;

  /**
   * the value of the private key
   *
   * note
   * - typically starts with `-----BEGIN PRIVATE KEY-----`
   */
  privateKeyValue: string;
}): string => {
  // get seconds since epoch now
  const secondsSinceEpochNow = Math.floor(new Date().getTime() / 1000);

  // create the jwt
  const jwt = createSecureDistributedAuthToken<AppleClientSecretClaims>({
    headerClaims: {
      typ: 'JWT',
      alg: 'ES256',
      kid: privateKeyId,
    },
    claims: {
      iss: developerTeamId,
      iat: secondsSinceEpochNow,
      exp: secondsSinceEpochNow + 600, // key should only live for 60 seconds, we should generate them on demand
      aud: 'https://appleid.apple.com',
      sub: clientId,
    },
    privateKey: privateKeyValue,
  });

  // return it
  return jwt;
};
