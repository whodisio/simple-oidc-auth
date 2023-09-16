import { isPresent } from 'type-fns';

export class OidcAuthenticationResponseMalformedError extends Error {
  constructor(reason: string, metadata?: Record<string, unknown>) {
    super(
      [
        `oidc authentication response was malformed. ${reason}`,
        metadata ? JSON.stringify(metadata, null, 2) : null,
      ]
        .filter(isPresent)
        .join('\n\n'),
    );
  }
}
