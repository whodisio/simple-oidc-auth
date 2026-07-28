import type { OidcRefreshClaims } from '@src/domain.objects/OidcRefreshClaims';

/**
 * .what = unpack the OidcRefreshClaims bundle into flat wire scalars
 * .why = the orchestrator stays a narrative of named calls; the join + null/[]→undefined
 *        coalesce is decode-friction that belongs in a named transformer
 *        (rule.forbid.inline-decode-friction), not inline at the call site
 *
 * note
 * - scope joins space-delimited (rfc-6749 §3.3); null or [] both map to null
 *   (inherit the full original grant) — rfc-6749 §6 has no "zero scopes" request, so
 *   an empty array is the absence of a scope opinion, the same intent as null
 * - resource passes verbatim (rfc-8707 absolute uri); null stays null (no audience
 *   restriction). a null scalar tells the communicator to omit the wire param
 * - null (never undefined) is the explicit "no assertion" value (rule.forbid.undefined-inputs)
 */
export const asOidcRefreshWireParams = (input: {
  claims: OidcRefreshClaims;
}): {
  refreshToken: string;
  scope: string | null;
  resource: string | null;
} => {
  const { claims } = input;

  return {
    refreshToken: claims.token.refresh,
    scope:
      claims.scope === null || claims.scope.length === 0
        ? null
        : claims.scope.join(' '),
    resource: claims.resource,
  };
};
