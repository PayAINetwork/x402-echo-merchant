import { describe, expect, it, vi } from 'vitest';
import type { Redis } from '@upstash/redis';
import { UpstashRefundStore, type RefundIdentity } from './refund-store';

function identity(overrides: Partial<RefundIdentity> = {}): RefundIdentity {
  return {
    settlementTransaction: 'settlement-1',
    network: 'solana',
    recipient: 'payer',
    asset: 'usdc-mint',
    amount: '10000',
    payTo: 'merchant',
    ...overrides,
  };
}

function fakeRedis() {
  const records = new Map<string, string>();
  return {
    set: vi.fn(async (key: string, value: string, options?: { nx?: boolean }) => {
      if (options?.nx && records.has(key)) return null;
      records.set(key, value);
      return 'OK';
    }),
    get: vi.fn(async (key: string) => records.get(key) ?? null),
    eval: vi.fn(
      async (_script: string, keys: string[], args: [number, string]) => {
        const current = records.get(keys[0]);
        if (!current) return -1;
        const parsed = JSON.parse(current) as { revision: number };
        if (parsed.revision !== args[0]) return 0;
        records.set(keys[0], args[1]);
        return 1;
      }
    ),
  };
}

describe('Upstash refund store', () => {
  it('atomically claims a settlement once without expiring its record', async () => {
    const redis = fakeRedis();
    const store = new UpstashRefundStore(redis as unknown as Redis);

    const first = await store.claim(identity());
    const replay = await store.claim(identity());

    expect(first.acquired).toBe(true);
    expect(replay.acquired).toBe(false);
    expect(redis.set).toHaveBeenNthCalledWith(1, expect.any(String), expect.any(String), {
      nx: true,
    });
  });

  it('uses revision-checked state transitions', async () => {
    const redis = fakeRedis();
    const store = new UpstashRefundStore(redis as unknown as Redis);
    const { record } = await store.claim(identity());
    const confirmed = {
      ...record,
      revision: 1,
      status: 'confirmed' as const,
      refundTransaction: 'refund-signature',
    };

    expect(await store.compareAndSet(0, confirmed)).toBe(true);
    expect(await store.compareAndSet(0, { ...confirmed, revision: 2 })).toBe(false);
    expect(await store.get(identity())).toMatchObject({
      revision: 1,
      status: 'confirmed',
      refundTransaction: 'refund-signature',
    });
  });

  it('rejects different refund details for the same settlement', async () => {
    const store = new UpstashRefundStore(fakeRedis() as unknown as Redis);
    await store.claim(identity());

    await expect(store.claim(identity({ amount: '20000' }))).rejects.toMatchObject({
      category: 'settlement_conflict',
    });
  });
});
