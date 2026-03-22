import { describe, it, expect } from 'vitest';
import { mergePermit2GasSponsoringDeclarations } from './permit2Extensions';

describe('mergePermit2GasSponsoringDeclarations', () => {
  it('returns undefined for none mode', () => {
    expect(mergePermit2GasSponsoringDeclarations('none', ['eip2612GasSponsoring'])).toBeUndefined();
  });

  it('includes EIP-2612 only when facilitator advertises the key', () => {
    const merged = mergePermit2GasSponsoringDeclarations('eip2612', ['eip2612GasSponsoring']);
    expect(merged).toBeDefined();
    expect(merged).toHaveProperty('eip2612GasSponsoring');
    expect(merged).not.toHaveProperty('erc20ApprovalGasSponsoring');
  });

  it('omits EIP-2612 when facilitator does not advertise the key', () => {
    const merged = mergePermit2GasSponsoringDeclarations('eip2612', []);
    expect(merged).toBeUndefined();
  });

  it('merges both when mode is both and facilitator supports both keys', () => {
    const merged = mergePermit2GasSponsoringDeclarations('both', [
      'eip2612GasSponsoring',
      'erc20ApprovalGasSponsoring',
    ]);
    expect(merged).toBeDefined();
    expect(merged).toHaveProperty('eip2612GasSponsoring');
    expect(merged).toHaveProperty('erc20ApprovalGasSponsoring');
  });

  it('partial both: only includes advertised keys', () => {
    const onlyEip2612 = mergePermit2GasSponsoringDeclarations('both', ['eip2612GasSponsoring']);
    expect(onlyEip2612).toBeDefined();
    expect(onlyEip2612).toHaveProperty('eip2612GasSponsoring');
    expect(onlyEip2612).not.toHaveProperty('erc20ApprovalGasSponsoring');
  });
});
