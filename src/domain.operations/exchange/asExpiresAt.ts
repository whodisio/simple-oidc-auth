import { addDuration, type IsoTimeStamp } from 'iso-time';

/**
 * .what = convert an oauth `expires_in` (seconds) into an absolute expiry instant
 * .why = the caller schedules the next refresh against an absolute instant, so we
 *        convert once at the boundary — never push `now() + x` math onto the caller
 *        (rule.forbid.any-time). null in → null out (the provider omitted expires_in)
 *
 * note
 * - pure: `since` is passed in (the reference instant), so this does no clock read;
 *   the communicator reads `now()` once and hands it in, so impurity stays at the i/o edge
 */
export const asExpiresAt = (input: {
  /**
   * the provider's `expires_in` lifetime in seconds, or null when the body omitted it
   */
  expiresIn: number | null;

  /**
   * the reference instant the lifetime counts from (the moment the response landed)
   */
  since: IsoTimeStamp;
}): IsoTimeStamp | null => {
  // no lifetime named → the caller sees an explicit "unknown expiry"
  if (input.expiresIn === null) return null;

  // absolute expiry = the reference instant plus the named lifetime
  return addDuration(input.since, { seconds: input.expiresIn });
};
