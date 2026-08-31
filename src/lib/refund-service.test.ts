/// <reference types="vite/client" />

import { describe, expect, it, vi } from 'vitest';
import { RefundExecutionError, type RefundOptions } from '../refund';
import type { PaymentRequirements } from './x402-helpers';
import { MemoryRefundStore, type RefundIdentity } from './refund-store';
import {
  processSettlementRefund,
  SettlementRefundError,
  type SuccessfulSettlementRefund,
} from './refund-service';

const merchantPayTo = '0xb01D6018CaA5Ce71D9CF1F45E030b4cB70e86C19';
const payer = '0xb38824330c40B846eF8AE4443205123cF57BB239';
const facilitatorRoutes = import.meta.glob('../app/api/facilitator/*/route.ts');

function evmRequirements(overrides: Partial<PaymentRequirements> = {}): PaymentRequirements {
  return {
    scheme: 'exact',
    network: 'eip155:8453',
    amount: '10000',
    payTo: merchantPayTo,
    maxTimeoutSeconds: 300,
    asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    extra: {},
    ...overrides,
  };
}

function settlementContext(
  overrides: Partial<SuccessfulSettlementRefund> = {}
): SuccessfulSettlementRefund {
  return {
    settlementTransaction: '0xsettlement-1',
    settlementNetwork: 'eip155:8453',
    payer,
    merchantPayTo,
    paymentRequirements: evmRequirements(),
    ...overrides,
  };
}

describe('settlement-bound refund service', () => {
  it('has no public refund route', () => {
    expect(Object.keys(facilitatorRoutes)).not.toContain(
      '../app/api/facilitator/refund/route.ts'
    );
  });

  it('executes exactly one refund for a successful settlement', async () => {
    const store = new MemoryRefundStore();
    const executeRefund = vi.fn().mockResolvedValue('0xrefund-1');

    const result = await processSettlementRefund(settlementContext(), {
      store,
      executeRefund,
    });

    expect(result).toMatchObject({
      status: 'confirmed',
      duplicate: false,
      refundTxHash: '0xrefund-1',
    });
    expect(executeRefund).toHaveBeenCalledTimes(1);
    expect(executeRefund).toHaveBeenCalledWith(
      payer.toLowerCase(),
      expect.objectContaining({
        amount: '10000',
        network: 'base',
        asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        payTo: merchantPayTo.toLowerCase(),
      }),
      expect.objectContaining({
        onEvmSubmitting: expect.any(Function),
        onSolanaSigned: expect.any(Function),
      })
    );
  });

  it('returns the recorded refund and never executes again on replay', async () => {
    const store = new MemoryRefundStore();
    const executeRefund = vi.fn().mockImplementation(
      async (_recipient: string, _requirements: PaymentRequirements, options: RefundOptions) => {
        await options.onEvmSubmitting?.();
        return '0xrefund-1';
      }
    );

    const first = await processSettlementRefund(settlementContext(), { store, executeRefund });
    const replay = await processSettlementRefund(settlementContext(), { store, executeRefund });

    expect(first.duplicate).toBe(false);
    expect(replay).toMatchObject({
      duplicate: true,
      status: 'confirmed',
      refundTxHash: '0xrefund-1',
    });
    expect(executeRefund).toHaveBeenCalledTimes(1);
  });

  it('rejects tampered details for an already-claimed settlement', async () => {
    const store = new MemoryRefundStore();
    const executeRefund = vi.fn().mockResolvedValue('0xrefund-1');
    await processSettlementRefund(settlementContext(), { store, executeRefund });

    const tampered = settlementContext({
      paymentRequirements: evmRequirements({ amount: '999999999' }),
    });

    await expect(
      processSettlementRefund(tampered, { store, executeRefund })
    ).rejects.toMatchObject({ category: 'settlement_conflict' });
    expect(executeRefund).toHaveBeenCalledTimes(1);
  });

  it('fails closed when settlement network or merchant payTo is inconsistent', async () => {
    const store = new MemoryRefundStore();
    const executeRefund = vi.fn().mockResolvedValue('0xrefund-1');

    for (const context of [
      settlementContext({ settlementNetwork: 'eip155:137' }),
      settlementContext({ merchantPayTo: '0x0000000000000000000000000000000000000001' }),
    ]) {
      await expect(
        processSettlementRefund(context, { store, executeRefund })
      ).rejects.toBeInstanceOf(SettlementRefundError);
    }

    expect(executeRefund).not.toHaveBeenCalled();
  });

  it('persists each signed Solana attempt before the executor can submit it', async () => {
    const store = new MemoryRefundStore();
    const solanaContext: SuccessfulSettlementRefund = {
      settlementTransaction: 'solana-settlement-signature',
      settlementNetwork: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      payer: 'PayerSolanaAddress',
      merchantPayTo: 'MerchantSolanaAddress',
      paymentRequirements: {
        scheme: 'exact',
        network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        amount: '10000',
        payTo: 'MerchantSolanaAddress',
        maxTimeoutSeconds: 60,
        asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        extra: {},
      },
    };
    const identity: RefundIdentity = {
      settlementTransaction: 'solana-settlement-signature',
      network: 'solana',
      recipient: 'PayerSolanaAddress',
      asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount: '10000',
      payTo: 'MerchantSolanaAddress',
    };
    const executeRefund = vi.fn().mockImplementation(
      async (_recipient: string, _requirements: PaymentRequirements, options: RefundOptions) => {
        await options.onSolanaSigned?.({
          signature: 'signed-before-send',
          encodedTransaction: 'wire-transaction',
          blockhash: 'blockhash',
          lastValidBlockHeight: '123',
        });
        const persisted = await store.get(identity);
        expect(persisted).toMatchObject({
          status: 'signed',
          attemptedSignatures: ['signed-before-send'],
        });
        return 'signed-before-send';
      }
    );

    await processSettlementRefund(solanaContext, { store, executeRefund });
    expect(executeRefund).toHaveBeenCalledTimes(1);
  });

  it('does not retry an uncertain signed refund on settlement replay', async () => {
    const store = new MemoryRefundStore();
    const executeRefund = vi.fn().mockImplementation(
      async (_recipient: string, _requirements: PaymentRequirements, options: RefundOptions) => {
        await options.onSolanaSigned?.({
          signature: 'uncertain-signature',
          encodedTransaction: 'wire-transaction',
          blockhash: 'blockhash',
          lastValidBlockHeight: '123',
        });
        throw new RefundExecutionError(
          'solana_confirmation_timeout',
          'timeout',
          ['uncertain-signature']
        );
      }
    );
    const context: SuccessfulSettlementRefund = {
      settlementTransaction: 'solana-settlement-signature',
      settlementNetwork: 'solana',
      payer: 'PayerSolanaAddress',
      merchantPayTo: 'MerchantSolanaAddress',
      paymentRequirements: {
        scheme: 'exact',
        network: 'solana',
        amount: '10000',
        payTo: 'MerchantSolanaAddress',
        maxTimeoutSeconds: 60,
        asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        extra: {},
      },
    };

    await expect(
      processSettlementRefund(context, { store, executeRefund })
    ).rejects.toMatchObject({ category: 'solana_confirmation_timeout' });
    const replay = await processSettlementRefund(context, { store, executeRefund });

    expect(replay).toMatchObject({
      duplicate: true,
      status: 'unknown',
      attemptedSignatures: ['uncertain-signature'],
    });
    expect(executeRefund).toHaveBeenCalledTimes(1);
  });
});
