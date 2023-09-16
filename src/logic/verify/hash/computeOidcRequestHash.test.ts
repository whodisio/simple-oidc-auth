import { uuid } from '../../../deps';
import { computeOidcRequestHash } from './computeOidcRequestHash';

describe('computeOidcRequestHash', () => {
  it('should be deterministic', () => {
    const inputs = {
      oidcRequestUuid: uuid(),
      userSessionUuid: null,
    };
    expect(computeOidcRequestHash(inputs)).toEqual(
      computeOidcRequestHash(inputs),
    );
  });
  it('should look nice', () => {
    const inputs = {
      oidcRequestUuid: '0fb30413-49ab-483d-8b8e-19e3d3e96eec',
      userSessionUuid: null,
    };
    expect(computeOidcRequestHash(inputs)).toMatch(/^orh_/); // starts with orh
    expect(computeOidcRequestHash(inputs)).toMatchSnapshot();
  });
});
