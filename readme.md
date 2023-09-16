# simple-oidc-auth

easily add oidc auth to your app from a secure, [pit-of-success](https://blog.codinghorror.com/falling-into-the-pit-of-success/)

# install

```ts
npm install simple-oidc-auth
```

# use

OpenID Connect protocols enable your application (i.e., `frontend`, `backend`) to auth users based on credentials they already have with other applications (i.e., `identity-provider`, `idp`).

This can be leveraged to benefit your application by:
- reducing friction at signin -> increase conversions
- increasing trust at signin -> increase conversions
- enabling cross application interactions -> increase functionality

Here's how

### 1. register with the identity-providers

OpenID Connect auth flows are dependent an identity-providers (e.g., Google, Apple, Facebook, etc) being willing to facilitate the auth process for your application.

Naturally these identity-providers require you to register your application with them before they will begin accepting auth requests on behalf of your application.

Here are links for how to do so for some of the well known oidc identity providers
- [apple oidc registration docs](./docs/oidc/registration/apple.md)
- [google oidc registration docs](./docs/oidc/registration/google.md)
- [facebook oidc registration docs](./docs/oidc/registration/facebook.md)

The output you need to acquire is for the next steps is
- a `clientId` - which identifies your application
- a `clientSecret` or a `clientPrivateKey` - which can be used to authenticate your application.backend

### 2. acquire a challenge hash and challenge code from your backend

OpenID Connect auth flows require your application to persist some state for each auth request in order to securely complete the process.

Why? Fundamentally, this is because OpenID Connect is driven by redirects to and from your application. This state is required for your application to verify that the response is authentic and has not tampered with.

```ts
import { computeOidcRequestHash, computeOidcPkceCodeChallenge, computeOidcPkceCodeVerifier } from 'simple-oidc-auth';

/**
 * define a unique identifier for the request which your backend can identify the request with
 */
const oidcRequestUuid: string = ...;

/**
 * define the uuid of the session for the request, typically the `jwt.jti` of the authed user, if one exists
 */
const userSessionUuid: string | null = ...;

/**
 * compute a one way hash of the request variables, which will be forwarded on the response and compared against state
 */
const oidcRequestHash = computeOidcRequestHash({
  oidcRequestUuid,
  userSessionUuid,
});

/**
 * compute a one way hash of the request variables and convert it into a pkce code challenge, which the identity-provider will verify
 */
const oidcPkceCodeChallenge = computeOidcPkceCodeChallenge({
  verifier: computeOidcPkceCodeVerifier({
    oidcRequestUuid,
    userSessionUuid,
  }),
});
```

### 3. begin the auth request on the frontend

Given that you now have all of the inputs required to make a secure oidc auth request, you may now begin the process.

On your frontend you'll use these inputs to create an authentication request uri that you'll use to redirect your user to the identity-provider. The identity provider will then ask your user to signin and approve access to your app.

Once your user successfully auths with the identity provider, the identity provider will then redirect the user back to your `redirectUri`. This redirectUri should point directly to your backend.

```ts
import {
  getOidcAuthenticationRequestUri,
  getAuthenticationEndpointByOidcIdentityProvider,
  OidcIdentityProvider
} from 'simple-oidc-auth';

// define where you would like the identity provider to redirect the user with the oidc auth response
const redirectUri = '__uri_to_your_backend__';

// create a auth request uri for an identity-provider
const authRequestUri = getOidcAuthenticationRequestUri({
  provider: {
    authenticationEndpoint: getAuthenticationEndpointByOidcIdentityProvider(
      OidcIdentityProvider.GOOGLE,
    ),
  },
  operator: {
    clientId: '__client_id__', // this is the clientId that the identity provider gave you, when you registered with them
  },
  request: {
    scope: 'openid profile email', // whatever scopes you are requesting
    hash: oidcRequestHash,
    pkce: oidcPkceCodeChallenge,
    redirectUri,
  },
});

// navigate to that request uri
window.location.href = authRequestUri;
```

### 4. parse the auth response on your backend

The identity provider's oidc auth response will be sent to your backend via the redirectUri defined in the step above.

In order to use the response you'll need to parse it from the rest request it was sent in. This library makes it easy to do so

```ts
// extract the oidcRequestUuid from the secure,samesite,httpsonly origination cookie set by your backend
const { oidcRequestUuid } =
  await extractOidcRequestUuidFromOriginationCookie({ headers });

// use the request uuid to lookup any metadata needed about your request
const { redirectUri, issuerUri, audienceUri } =
  await getOidcRequestDetails({ oidcRequestUuid });

// parse the oidc auth response to extract the claims the response made
const claims = await parseOidcAuthenticationResponse({
  method,
  headers,
  endpoint: redirectUri,
  queryParams,
  session: {
    issuer: issuerUri,
    audience: audienceUri,
  },
});
```

### 5. exchange auth response claims for tokens on your backend

The oidc auth response claims produced by the step above can now be exchanged for tokens from the identity-provider.

This library and the identity provider will verify that the claims made are authentic to eliminate security vulnerabilities systematically. More details on this are provided in this readme below.

Here's how to make the exchange

```ts
import {
  getTokensFromOidcResponseClaims,
  getTokenEndpointByOidcIdentityProvider,
  OidcIdentityProvider,
} from 'simple-oidc-auth';

// exchange authcode for tokens
const tokens = await getTokensFromOidcResponseClaims({
  provider: {
    tokenEndpoint: getTokenEndpointByOidcIdentityProvider(
      OidcIdentityProvider.GOOGLE
    ),
  },
  operator: {
    oidcClientId: '__client_id__', // the client id the identity-provider granted to you after registration
    oidcClientSecret: credentials.clientSecret, // the client secret the identity-provider granted to you after registration
  },
  claims, // the claims from the step above
});
```

### bonus. extract claims from identity token

Now that you have the identity token, you'll want to extract the claims from it in order to use it.

Here's how you can do so easily and securely

```ts
import { getAuthedClaimsFromOidcIdentityToken, OidcIdentityProvider } from 'simple-oidc-auth';

const claims = await getAuthedClaimsFromOidcIdentityToken({
  token: tokens.identity,
  provider: OidcIdentityProvider.GOOGLE,
  oidcClientId: '__client_id__',
});
```

# background

openid-connect, oidc, is an opensource standard which allows users to leverage the identities they've established with apps they already use to sign into other apps. (e.g., social auth)

at a high level, a secure, successful flow consists of three steps

![oidc flow illustration](https://i.imgur.com/sbXWilQ.png)

1. get a `challenge.key` from your backend (to eliminate [csrf vuln.](https://owasp.org/www-community/attacks/csrf))
   1. your frontend asks your backend to issue a `challenge` with `details` about the request
   2. your backend responds with a `challenge.key` under which it persisted the `challenge.details`
2. get a `challenge.answer` from the identity-provider
   1. your frontend redirects the user to the identity-provider's authentication ui
   2. the identity-provider redirects the user back to your frontend with a `challenge.answer` attached
3. exchange the `challenge.answer` for `tokens` on your backend
   1. your frontend sends the `challenge.key` and `challenge.answer` to your backend
   2. your backend sends the `challenge.answer`, `oidc.client.secret`, and `challenge.details` to the identity-provider
   3. the identity-provider authenticates that the inputs are correct and exchanges them for a `tokens`


the identity provider commonly returns three types of `tokens` to your backend
- `identity-token`, which can be used to identify the user
- `access-token`, which can be used to access protected resources
- `refresh-token`, which can be used to replace expired access-tokens


refs
- [https://datatracker.ietf.org/doc/html/rfc6749#section-1.2](https://datatracker.ietf.org/doc/html/rfc6749#section-1.2)



# security

this library follows a `pit-of-success` design

it is secure by default, enforces best practices, and makes it hard or impossible to use it in ways that produce vulnerabilities

further, it exceeds oidc standards and already meets many of the [financial grade standards](https://openid.net/specs/fapi-2_0-security-02.html#name-main-differences-to-fapi-10)
- requires pkce [proof-key-for-code-exchange](https://datatracker.ietf.org/doc/html/rfc7636) ✅
- requires [authorization-code-flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth) ✅
- requires [`state`-origination-cookie](https://datatracker.ietf.org/doc/html/rfc6819#section-5.3.5) ✅


### 🛡️ no tokens in browsers

This library eliminates the known [`cross-site-scripting` (XSS) vulnerability](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth) possible in `openid-connect` (OIDC) strategies by instead requiring that all [authentication requests](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest) are of `response_type=code` per the [FAPI 2.0](https://openid.net/specs/fapi-2_0-security-02.html#name-main-differences-to-fapi-10) mandate.

OIDC authentication strategies are susceptible to XSS whenever they provide sensitive data to the frontend.

- 🛑 XSS vuln.: attacker can steal the identity or access tokens of a user
  - root cause:
    - browsers do not have a secure storage mechanism; all data in the browser should be assumed vulnerable
  - for example:
    - `funnymemes.com` browser extension could read the `oidcTokens` from the browser and could steal it

The `response_type=code` authentication request parameter required by this library eliminates this vulnerability.

Specifically, this library forces the frontend to only get a short lived `oidcResponseCode` in response to the authentication request. This `oidcResponseCode` must then be sent to your backend which can exchange it for `oidcTokens` with the identity provider by submitting the `oidcResponseCode` along with a `oidcClientSecret` known only to your backend.

If an attacker has access to your frontend via XSS, they will never have direct access to the `oidcTokens`. They will only have access to an `oidcResponseCode` but they will not be able to exchange this `oidcResponseCode` for `oidcTokens` either. The identity provider will reject the token exchange because the attacker will not know the `oidcClientSecret` for which the `oidcResponseCode` was issued 🛡️️

In other words, this guarantees that the user's `oidcTokens` are never exposed to the frontend or accessible from data in the frontend 💪

ref
- https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth
- https://openid.net/specs/fapi-2_0-security-02.html#name-main-differences-to-fapi-10


### 🛡️ no unintended user sessions

This library eliminates the known [`cross-site-request-forgery` (CSRF) vulnerability](https://datatracker.ietf.org/doc/html/rfc6819#section-4.4.1.8) possible in `openid-connect` (OIDC) strategies with two independent methods, redundantly:
1. embedding a signature of the `userSessionUuid` in the `pkceCodeChallenge` of the [authentication request](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest), for identity-providers which support [pkce](https://datatracker.ietf.org/doc/html/rfc7636)
2. embedding a signature of the `userSessionUuid` in the `oidcRequestHash` set as the `state` of the [authentication request](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest)

OIDC authentication strategies are susceptible to CSRF whenever a user has an existing auth session.

- 🛑 CSRF vuln.: attacker can add their credentials to a victim's account
  - root cause:
    - your backend did not verify which user the `oidcResponseCode` was intended for
  - for example:
    - attacker successfully starts the oidc signin process and signs in with the oidc identity provider
    - attacker halts the redirect on their device from the oidc identity provider to your server
    - attacker extracts the `oidcResponseCode` on their device from the redirect the oidc identity provider was going to make to your server
    - attacker creates a `redirectUrl` with their `oidcResponseCode` which anyone can open to resume the oidc-auth process
    - victim clicks on this `redirectUrl`, after being tricked by attacker (e.g., "10 cool cats your dog doesn't want you to know about")
    - victim is redirected to your backend, with the victim's session info, but with the attackers `oidcResponseCode`
    - your backend exchanges the attackers `oidcResponseCode` for the attackers tokens
    - your backend sees the victim's session and associates the attackers tokens to the victim's session's account

The `userSessionUuid` input required by this library eliminates this vulnerability.

Specifically, this library forces your backend to know the exact `userSessionUuid` for which the `oidcResponseCode` was granted before it can exchange the `oidcResponseCode` for the `tokens`. It does so with two independent methods redundantly:

1. by including the `userSessionUuid` the request was intended for as part of the `nonce` salted hash signature set as the `pkceCodeVerifier` in the [authentication request](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest). When your backend attempts to exchange the `oidcResponseCode` for the user's tokens, the identity provider [will require](https://datatracker.ietf.org/doc/html/rfc7636#section-4.6) the exact `pkceCodeVerifier` for which the `oidcResponseCode` was granted, which requires your backend to know the correct `userSessionUuid`.

2. by including the `userSessionUuid` the request was intended for as part of the `nonce` salted hash signature set as the `oidcRequestHash` in the `state` of the [authentication request](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest). When your backend attempts to exchange the `oidcResponseCode` for the user's tokens, this library [will require](TODO:link-to-exchange-function) your backend to know the exact `userSessionUuid` used to create the `oidcRequestHash`.

If an attacker attempts to trick your backend to add the attacker's `oidcResponseCode` with the victim's `userSessionUuid`, your backend will not be able to exchange the `oidcResponseCode` for tokens.

1. the identity provider will reject the token exchange because the `userSessionUuid` of the victim will not match the `userSessionUuid` with which the `pkceCodeVerifier` of the `oidcResponseCode` was issued 🛡️
2. this library will reject the token exchange because the `userSessionUuid` of the victim will not match the `userSessionUuid` with which the `oidcRequestHash` was created 🛡️

In other words, this guarantees that the `response.userSessionUuid === intended.userSessionUuid`, eliminating this vulnerability 💪

Why do we use two independent mechanisms in parallel? Not all identity provider support [pkce](https://datatracker.ietf.org/doc/html/rfc7636) yet, which is what the first method depends on. This redundancy takes matters into our own hands and guarantees that users are secure even if the identity-provider does not support pkce.

refs
- https://datatracker.ietf.org/doc/html/rfc7636
- https://datatracker.ietf.org/doc/html/rfc7636#section-4.6
- https://datatracker.ietf.org/doc/html/rfc6819#section-4.4.1.8
- https://datatracker.ietf.org/doc/html/rfc6819#section-5.3.5
- https://technospace.medium.com/csrf-in-idp-initiated-openid-connct-7a2873420e86#:~:text=In%20OIDC%20flow%2C%20CSRF%20attacks,resources%20rather%20than%20the%20victim's.


### 🛡️ no unverified redirect claims

This library eliminates the known [parameter-injection (PINJ) vulnerability](https://openid.net/specs/openid-financial-api-part-2-1_0.html#authorization-response-parameter-injection-attack) possible in `openid-connect` (OIDC) strategies by preventing storing custom `state` in the [authentication request](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest) and second with two independent methods, redundantly:

1. embedding a signature of the `oidcRequestUuid` in the `pkceCodeChallenge` of the authentication request, for identity-providers which support [pkce](https://datatracker.ietf.org/doc/html/rfc7636)
2. embedding a signature of the `oidcRequestUuid` in the `oidcRequestHash` set as the `state` of the authentication request

OIDC authentication strategies are susceptible to PINJ whenever the backend receiving the response trusts the data present in the state parameter without verifying it.

- 🛑 PINJ vuln.: attacker tampers with the `state` sent sent to your `redirectUri` in order to manipulate your backend
  - root cause:
    - your backend did not verify that the `state` it was given equals the `state` the `oidcResponseCode` was granted for
  - for example:
    - attacker successfully starts the oidc signin process and signs in with the oidc identity provider
    - attacker halts the redirect on their device from the oidc identity provider to your server
    - attacker extracts the `oidcResponseCode` on their device from the redirect the oidc identity provider was going to make to your frontend
    - attacker creates a `redirectUrl` with their `oidcResponseCode` and a custom state
    - victim or attacker then clicks on this `redirectUrl` causing your frontend to send the tampered state output to your backend
    - your backend trusts that the outputs of the tampered state are authentic
    - your backend executes logic which mutates protected resources based on the state data it assumes is trustworthy

The `oidcRequestUuid` input required by this library eliminates this vulnerability.

Specifically, this library only allows one value to be set into `state`, an `oidcRequestHash`. Your backend can persist any information it needs to know about the request and reference it with an `oidcRequestUuid`. Since it will not be able to set the `oidcRequestUuid` in any parameter that is returned on the oidc [authentication response](https://openid.net/specs/openid-connect-core-1_0.html#AuthResponse), your backend will be forced to set this value as a cookie accessible [only to the owner of the browser](TODO:link-to-code-that-set), labeled a `origination` cookie. This cookie will then be sent to your backend along with the oidc authentication response from the user's browser.

It can then use the `oidcRequestUuid` to subsequently lookup this information when handling the `oidcResponseCode`. This eliminates the possibility that data extracted from the `state` of the [authentication request](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest) may be tampered with.

Further, this library forces your backend to know the exact `oidcRequestUuid` for which the `oidcResponseCode` was granted before it can exchange the `oidcResponseCode` for the `tokens`. It does so with two independent methods redundantly:

1. by including the `oidcRequestUuid` the request was intended for as part of the `nonce` salted hash signature set as the `pkceCodeVerifier` in the [authentication request](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest). When your backend attempts to exchange the `oidcResponseCode` for the user's tokens, the identity provider [will require](https://datatracker.ietf.org/doc/html/rfc7636#section-4.6) the exact `pkceCodeVerifier` for which the `oidcResponseCode` was granted, for which your backend will need the exact `oidcRequestUuid` to recreate the salted hash signature.

2. by including the `oidcRequestUuid` the request was intended for as part of the `nonce` salted hash signature set as the `oidcRequestHash` in the `state` of the [authentication request](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest). When your backend attempts to exchange the `oidcResponseCode` for the user's tokens, this library [will require](TODO:link-to-exchange-function) your backend to know the exact `oidcRequestUuid` used to create the `oidcRequestHash`.


Since with this strategy an attacker is not able to tamper with the contents referenced by an `oidcRequestUuid`, an attacker can only attempt to trick your backend by submitting an `oidcRequestUuid` with an `oidcResponseCode` for which it was not intended. However, if they attempt this, your backend will not be able to exchange the `oidcResponseCode` for tokens.


1. the identity provider will reject the token exchange because the `oidcRequestUuid` submitted will not match the `oidcRequestUuid` with which the `pkceCodeVerifier` of the `oidcResponseCode` was issued 🛡️

2. this library will reject the token exchange because the `oidcRequestUuid` submitted will not match the `oidcRequestUuid` with which the `oidcRequestHash` was created 🛡️

In other words, this guarantees that the backend has nothing to trust except the `oidcRequestUuid` and guarantees that the `response.oidcRequestUuid === intended.oidcRequestUuid`, eliminating this vulnerability 💪

Why do we use two independent mechanisms in parallel? Not all identity provider support [pkce](https://datatracker.ietf.org/doc/html/rfc7636) yet, which is what the first method depends on. This redundancy takes matters into our own hands and guarantees that users are secure even if the identity-provider does not support pkce.

ref
- https://datatracker.ietf.org/doc/html/rfc7636
- https://datatracker.ietf.org/doc/html/rfc7636#section-4.6
