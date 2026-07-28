/**
 * .what = read a property off an untrusted value; null when it is not a readable object or lacks the key
 * .why = both exchange transformers (`asOidcTokenError`, `asOidcTokenSuccess`) parse an untrusted
 *        response body and hand-rolled the same object-guard + key-read narrow. this is the one
 *        shared, cast-free read of that idiom (rule-of-three) — `Reflect.get` returns the value
 *        without the `as`-cast a dynamic index access would need (rule.forbid.as-cast)
 *
 * note
 * - returns `unknown` — the caller narrows with a `typeof` guard, exactly as before
 * - a non-object / null `from`, or an absent `key`, yields null (never a raw TypeError)
 */
export const getUnknownObjectProp = (input: {
  from: unknown;
  key: string;
}): unknown => {
  const { from, key } = input;
  if (typeof from !== 'object' || from === null) return null;
  if (!(key in from)) return null;
  return Reflect.get(from, key);
};
