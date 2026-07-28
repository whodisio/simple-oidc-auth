import type { IsoTimeStamp } from 'iso-time';

import type { OidcExchangeOperator } from '@src/domain.objects/OidcExchangeOperator';
import type { OidcExchangeProvider } from '@src/domain.objects/OidcExchangeProvider';
import type { OidcRefreshClaims } from '@src/domain.objects/OidcRefreshClaims';
import { exchangeRefreshTokenForTokens } from '@src/domain.operations/exchange/exchangeRefreshTokenForTokens';

import { asOidcRefreshWireParams } from './asOidcRefreshWireParams';

/**
 * .what = exchange a refresh token for a fresh access token (rfc-6749 §6 refresh_token grant)
 * .why = the silent re-mint leg beside getTokensFromOidcResponseClaims — a caller spends a
 *        stored refresh token for a fresh access token with no browser round-trip
 *
 * a failure surfaces as one of three typed errors the caller discriminates by type:
 * - OidcTokenRefreshExpiredError    (✋) — the refresh is dead → re-authenticate
 * - OidcTokenRequestRejectedError   (✋) — the request is bad → fix scope/credentials
 * - OidcTokenEndpointMalfunctionError (💥) — the endpoint broke → back off and retry
 *
 * note
 * - rotation: when the provider issues a NEW refresh token, it surfaces on result.refresh
 *   (null when the provider did not rotate); the caller persists it atomically
 * - the return shape differs from the code grant ({ identity, access }): the refresh grant
 *   returns no identity (an id_token is not guaranteed on this leg)
 *
 * caveat — intrinsic non-idempotency on a provider that rotates (rfc-6749 §6):
 * - a successful call spends the input refresh token single-use; a provider that rotates
 *   commits a NEW refresh token, so the old one is now dead. this is inherent to the grant,
 *   not a defect — rfc-6749 defines no client idempotency key for the refresh grant
 * - the collision hazard: if the transport drops AFTER the provider commits a rotation but
 *   BEFORE the response reaches us, this throws OidcTokenEndpointMalfunctionError (retry) — yet
 *   the input token is already spent, so the retry then correctly throws
 *   OidcTokenRefreshExpiredError (re-auth). the extra hop is the CORRECT terminal outcome,
 *   not a bug: the caller re-auths, which is right for a rotation it cannot confirm landed
 * - caller contract: on OidcTokenEndpointMalfunctionError, a rotation-aware caller must treat
 *   the input refresh token as POSSIBLY spent and be ready for the retry to land on
 *   Expired → re-auth; do not assume a silent success that would strand a spent token
 */
export const getTokensFromOidcRefreshClaims = async (input: {
  /**
   * the unverified assertions presented to the provider, which adjudicates each
   */
  claims: OidcRefreshClaims;

  /**
   * configuration for the identity provider that powers the oidc flow
   *
   * note
   * - the endpoint MUST speak the rfc-6749 §6 `refresh_token` grant; a non-conformant
   *   provider (e.g. facebook's long-lived-token exchange) is unsupported and surfaces
   *   as OidcTokenRequestRejectedError / OidcTokenEndpointMalfunctionError, not a silent
   *   wrong result
   */
  provider: OidcExchangeProvider;

  /**
   * configuration for the operator of the oidc flow
   */
  operator: OidcExchangeOperator;
}): Promise<{
  access: string;
  refresh: string | null;
  expiresAt: IsoTimeStamp | null;
}> => {
  // unpack the claims bundle into flat wire scalars
  const { refreshToken, scope, resource } = asOidcRefreshWireParams({
    claims: input.claims,
  });

  // exchange the refresh token with the identity provider for fresh tokens
  return exchangeRefreshTokenForTokens({
    endpoint: input.provider.tokenEndpoint,
    oidcClientId: input.operator.oidcClientId,
    oidcClientSecret: input.operator.oidcClientSecret,
    refreshToken,
    scope,
    resource,
  });
};
