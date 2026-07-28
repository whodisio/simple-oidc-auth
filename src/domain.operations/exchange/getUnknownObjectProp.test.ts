import { given, then, when } from 'test-fns';

import { getUnknownObjectProp } from './getUnknownObjectProp';

describe('getUnknownObjectProp', () => {
  given('[case1] a plain object with the key present', () => {
    when('[t0] getUnknownObjectProp is called', () => {
      then('it returns the value (as unknown)', () => {
        expect(
          getUnknownObjectProp({
            from: { error: 'invalid_grant' },
            key: 'error',
          }),
        ).toEqual('invalid_grant');
      });
      then('it returns a non-string value verbatim', () => {
        expect(
          getUnknownObjectProp({
            from: { expires_in: 3599 },
            key: 'expires_in',
          }),
        ).toEqual(3599);
      });
    });
  });

  given('[case2] a plain object that omits the key', () => {
    when('[t0] getUnknownObjectProp is called', () => {
      then('it returns null', () => {
        expect(
          getUnknownObjectProp({ from: { a: 1 }, key: 'error' }),
        ).toBeNull();
      });
    });
  });

  given('[case3] a value that is not a readable object', () => {
    when('[t0] the value is null', () => {
      then('it returns null (no raw TypeError)', () => {
        expect(getUnknownObjectProp({ from: null, key: 'error' })).toBeNull();
      });
    });
    when('[t1] the value is a string', () => {
      then('it returns null', () => {
        expect(getUnknownObjectProp({ from: 'nope', key: 'error' })).toBeNull();
      });
    });
    when('[t2] the value is a number', () => {
      then('it returns null', () => {
        expect(getUnknownObjectProp({ from: 42, key: 'error' })).toBeNull();
      });
    });
  });
});
