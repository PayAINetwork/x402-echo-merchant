import { Redis } from '@upstash/redis';

export type RefundFailureCategory =
  | 'configuration'
  | 'settlement_invalid'
  | 'settlement_conflict'
  | 'store_conflict'
  | 'evm_submission'
  | 'solana_prepare'
  | 'solana_rpc_unavailable'
  | 'solana_transaction_failed'
  | 'solana_confirmation_timeout'
  | 'solana_blockhash_expired'
  | 'unsupported_network'
  | 'unknown';

export type RefundStatus =
  | 'claimed'
  | 'submitting'
  | 'signed'
  | 'confirmed'
  | 'failed'
  | 'unknown';

export interface RefundIdentity {
  settlementTransaction: string;
  network: string;
  recipient: string;
  asset: string;
  amount: string;
  payTo: string;
}

export interface SolanaRefundAttemptRecord {
  signature: string;
  encodedTransaction: string;
  blockhash: string;
  lastValidBlockHeight: string;
}

export interface RefundRecord {
  version: 1;
  revision: number;
  fingerprint: string;
  identity: RefundIdentity;
  status: RefundStatus;
  attemptedSignatures: string[];
  solanaAttempts: SolanaRefundAttemptRecord[];
  refundTransaction?: string;
  failure?: {
    category: RefundFailureCategory;
    message: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RefundClaimResult {
  acquired: boolean;
  record: RefundRecord;
}

export interface RefundStore {
  claim(identity: RefundIdentity): Promise<RefundClaimResult>;
  compareAndSet(expectedRevision: number, record: RefundRecord): Promise<boolean>;
  get(identity: RefundIdentity): Promise<RefundRecord | null>;
}

export class RefundStoreError extends Error {
  readonly category: RefundFailureCategory;

  constructor(category: RefundFailureCategory, message: string) {
    super(message);
    this.name = 'RefundStoreError';
    this.category = category;
  }
}

function canonicalIdentity(identity: RefundIdentity): string {
  return JSON.stringify([
    identity.settlementTransaction,
    identity.network,
    identity.recipient,
    identity.asset,
    identity.amount,
    identity.payTo,
  ]);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function fingerprintRefund(identity: RefundIdentity): Promise<string> {
  return sha256Hex(canonicalIdentity(identity));
}

async function refundKey(identity: RefundIdentity): Promise<string> {
  const settlementKey = await sha256Hex(
    `${identity.network}:${identity.settlementTransaction}`
  );
  return `echo-merchant:refund:v1:${settlementKey}`;
}

async function createRecord(identity: RefundIdentity): Promise<RefundRecord> {
  const now = new Date().toISOString();
  return {
    version: 1,
    revision: 0,
    fingerprint: await fingerprintRefund(identity),
    identity,
    status: 'claimed',
    attemptedSignatures: [],
    solanaAttempts: [],
    createdAt: now,
    updatedAt: now,
  };
}

function parseRecord(value: string | null): RefundRecord | null {
  if (value === null) return null;

  try {
    return JSON.parse(value) as RefundRecord;
  } catch {
    throw new RefundStoreError('store_conflict', 'Stored refund record is invalid');
  }
}

const COMPARE_AND_SET_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if not current then
  return -1
end
local decoded = cjson.decode(current)
if tonumber(decoded.revision) ~= tonumber(ARGV[1]) then
  return 0
end
redis.call('SET', KEYS[1], ARGV[2])
return 1
`;

export class UpstashRefundStore implements RefundStore {
  constructor(private readonly redis: Redis) {}

  async claim(identity: RefundIdentity): Promise<RefundClaimResult> {
    const key = await refundKey(identity);
    const candidate = await createRecord(identity);
    const created = await this.redis.set(key, JSON.stringify(candidate), { nx: true });

    if (created === 'OK') {
      return { acquired: true, record: candidate };
    }

    const existing = parseRecord(await this.redis.get<string>(key));
    if (!existing) {
      throw new RefundStoreError('store_conflict', 'Refund claim disappeared during creation');
    }

    if (existing.fingerprint !== candidate.fingerprint) {
      throw new RefundStoreError(
        'settlement_conflict',
        'Settlement transaction is already bound to different refund details'
      );
    }

    return { acquired: false, record: existing };
  }

  async compareAndSet(expectedRevision: number, record: RefundRecord): Promise<boolean> {
    const result = await this.redis.eval<[number, string], number>(
      COMPARE_AND_SET_SCRIPT,
      [await refundKey(record.identity)],
      [expectedRevision, JSON.stringify(record)]
    );
    return result === 1;
  }

  async get(identity: RefundIdentity): Promise<RefundRecord | null> {
    return parseRecord(await this.redis.get<string>(await refundKey(identity)));
  }
}

export class MemoryRefundStore implements RefundStore {
  private readonly records = new Map<string, RefundRecord>();

  async claim(identity: RefundIdentity): Promise<RefundClaimResult> {
    const key = await refundKey(identity);
    const candidate = await createRecord(identity);
    const existing = this.records.get(key);

    if (!existing) {
      this.records.set(key, structuredClone(candidate));
      return { acquired: true, record: candidate };
    }

    if (existing.fingerprint !== candidate.fingerprint) {
      throw new RefundStoreError(
        'settlement_conflict',
        'Settlement transaction is already bound to different refund details'
      );
    }

    return { acquired: false, record: structuredClone(existing) };
  }

  async compareAndSet(expectedRevision: number, record: RefundRecord): Promise<boolean> {
    const key = await refundKey(record.identity);
    const existing = this.records.get(key);
    if (!existing || existing.revision !== expectedRevision) return false;
    this.records.set(key, structuredClone(record));
    return true;
  }

  async get(identity: RefundIdentity): Promise<RefundRecord | null> {
    const record = this.records.get(await refundKey(identity));
    return record ? structuredClone(record) : null;
  }
}

let productionStore: RefundStore | undefined;

export function getRefundStore(): RefundStore {
  if (productionStore) return productionStore;

  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new RefundStoreError(
      'configuration',
      'Durable refund storage is not configured'
    );
  }

  productionStore = new UpstashRefundStore(
    new Redis({
      url,
      token,
      automaticDeserialization: false,
      enableTelemetry: false,
    })
  );
  return productionStore;
}
