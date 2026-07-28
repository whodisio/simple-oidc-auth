import { given, then, when } from 'test-fns';

import { asOidcRefreshWireParams } from './asOidcRefreshWireParams';

describe('asOidcRefreshWireParams', () => {
  given('[case1] claims with a scope array and a resource', () => {
    when('[t0] asOidcRefreshWireParams is called', () => {
      const wire = asOidcRefreshWireParams({
        claims: {
          token: { refresh: 'rt_123' },
          scope: ['email', 'profile'],
          resource: 'https://api.example.com',
        },
      });

      then('refreshToken is the token claim', () => {
        expect(wire.refreshToken).toEqual('rt_123');
      });

      then('scope is space-delimited', () => {
        expect(wire.scope).toEqual('email profile');
      });

      then('resource passes verbatim', () => {
        expect(wire.resource).toEqual('https://api.example.com');
      });
    });
  });

  given('[case2] claims with scope null and resource null', () => {
    when('[t0] asOidcRefreshWireParams is called', () => {
      const wire = asOidcRefreshWireParams({
        claims: { token: { refresh: 'rt_123' }, scope: null, resource: null },
      });

      then('scope is null — the param is omitted', () => {
        expect(wire.scope).toBeNull();
      });

      then('resource is null — the param is omitted', () => {
        expect(wire.resource).toBeNull();
      });
    });
  });

  given('[case3] claims with an empty scope array', () => {
    when('[t0] asOidcRefreshWireParams is called', () => {
      then('scope is null — [] is treated the same as null', () => {
        const wire = asOidcRefreshWireParams({
          claims: { token: { refresh: 'rt_123' }, scope: [], resource: null },
        });
        expect(wire.scope).toBeNull();
      });
    });
  });
});
