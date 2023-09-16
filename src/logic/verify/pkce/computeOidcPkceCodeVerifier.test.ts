import { uuid } from '../../../deps';
import { computeOidcPkceCodeVerifier } from './computeOidcPkceCodeVerifier';

describe('computeOidcPkceCodeVerifier', () => {
  it('should be deterministic', () => {
    const inputs = {
      oidcRequestUuid: uuid(),
      userSessionUuid: null,
    };
    expect(computeOidcPkceCodeVerifier(inputs)).toEqual(
      computeOidcPkceCodeVerifier(inputs),
    );
  });
  it('should look nice', () => {
    const inputs = {
      oidcRequestUuid: '0fb30413-49ab-483d-8b8e-19e3d3e96eec',
      userSessionUuid: null,
    };
    expect(computeOidcPkceCodeVerifier(inputs)).toMatch(/^opcv_/); // starts with opcv
    expect(computeOidcPkceCodeVerifier(inputs)).toMatchSnapshot();
  });
});
