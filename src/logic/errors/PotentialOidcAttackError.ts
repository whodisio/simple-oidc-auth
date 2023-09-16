import { isPresent } from 'type-fns';

export class PotentialOidcAttackError extends Error {
  constructor(reason: string, metadata?: Record<string, unknown>) {
    super(
      [
        `a potential oidc attack was detected! ${reason}`,
        metadata ? JSON.stringify(metadata, null, 2) : null,
      ]
        .filter(isPresent)
        .join('\n\n'),
    );
  }
}
