import type { PaymentRequirements } from './x402-helpers';
import {
  getFriendlyNetworkName,
  refund,
  RefundExecutionError,
  type RefundOptions,
} from '../refund';
import {
  getRefundStore,
  RefundStoreError,
  type RefundFailureCategory,
  type RefundIdentity,
  type RefundRecord,
  type RefundStatus,
  type RefundStore,
} from './refund-store';
import { SupportedEVMNetworks, SupportedSVMNetworks } from './x402-helpers';

export interface SuccessfulSettlementRefund {
  settlementTransaction: string;
  settlementNetwork: string;
  payer: string;
  merchantPayTo: string;
  paymentRequirements: PaymentRequirements;
}

export interface SettlementRefundResult {
  status: RefundStatus;
  duplicate: boolean;
  refundTxHash?: string;
  attemptedSignatures: string[];
}

export class SettlementRefundError extends Error {
  readonly category: RefundFailureCategory;
  readonly settlementTransaction: string;
  readonly network: string;
  readonly attemptedSignatures: string[];

  constructor(
    category: RefundFailureCategory,
    message: string,
    context: Pick<SuccessfulSettlementRefund, 'settlementTransaction' | 'settlementNetwork'>,
    attemptedSignatures: string[] = [],
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'SettlementRefundError';
    this.category = category;
    this.settlementTransaction = context.settlementTransaction;
    this.network = getFriendlyNetworkName(context.settlementNetwork);
    this.attemptedSignatures = attemptedSignatures;
  }
}

interface SettlementRefundDependencies {
  store?: RefundStore;
  executeRefund?: typeof refund;
  refundOptions?: RefundOptions['solana'];
}

function staticFailureMessage(category: RefundFailureCategory): string {
  switch (category) {
    case 'configuration':
      return 'Durable refund storage is unavailable';
    case 'settlement_invalid':
      return 'Successful settlement data is incomplete or inconsistent';
    case 'settlement_conflict':
      return 'Settlement is already bound to different refund details';
    case 'store_conflict':
      return 'Refund idempotency state changed unexpectedly';
    case 'evm_submission':
      return 'EVM refund submission failed with an unknown broadcast state';
    case 'solana_prepare':
      return 'Solana refund transaction preparation failed';
    case 'solana_rpc_unavailable':
      return 'Solana RPC was unavailable while confirming the refund';
    case 'solana_transaction_failed':
      return 'Solana refund transaction failed on-chain';
    case 'solana_confirmation_timeout':
      return 'Solana refund confirmation timed out';
    case 'solana_blockhash_expired':
      return 'Solana refund blockhash attempts expired';
    case 'unsupported_network':
      return 'Refund network is not supported';
    default:
      return 'Refund failed';
  }
}

function normalizeAddress(value: string, isEvm: boolean): string {
  return isEvm ? value.toLowerCase() : value;
}

function validateSettlement(context: SuccessfulSettlementRefund): RefundIdentity {
  const requirements = context.paymentRequirements;
  const network = getFriendlyNetworkName(requirements.network);
  const settlementNetwork = getFriendlyNetworkName(context.settlementNetwork);
  const isEvm = (SupportedEVMNetworks as readonly string[]).includes(network);
  const isSolana = (SupportedSVMNetworks as readonly string[]).includes(network);

  if (!isEvm && !isSolana) {
    throw new SettlementRefundError(
      'unsupported_network',
      staticFailureMessage('unsupported_network'),
      context
    );
  }

  const validAmount =
    /^\d+$/.test(requirements.amount) && BigInt(requirements.amount) > BigInt(0);
  const payToMatches =
    normalizeAddress(requirements.payTo, isEvm) ===
    normalizeAddress(context.merchantPayTo, isEvm);

  if (
    !context.settlementTransaction ||
    !context.settlementNetwork ||
    !context.payer ||
    !requirements.asset ||
    !validAmount ||
    settlementNetwork !== network ||
    !payToMatches
  ) {
    throw new SettlementRefundError(
      'settlement_invalid',
      staticFailureMessage('settlement_invalid'),
      context
    );
  }

  return {
    settlementTransaction: context.settlementTransaction,
    network,
    recipient: normalizeAddress(context.payer, isEvm),
    asset: normalizeAddress(requirements.asset, isEvm),
    amount: requirements.amount,
    payTo: normalizeAddress(requirements.payTo, isEvm),
  };
}

function logRefundEvent(
  event: string,
  identity: RefundIdentity,
  details: Record<string, unknown> = {}
): void {
  console.info(
    '[refund]',
    JSON.stringify({
      event,
      network: identity.network,
      settlementTransaction: identity.settlementTransaction,
      ...details,
    })
  );
}

function resultFromRecord(record: RefundRecord, duplicate: boolean): SettlementRefundResult {
  return {
    status: record.status,
    duplicate,
    refundTxHash: record.refundTransaction,
    attemptedSignatures: record.attemptedSignatures,
  };
}

export async function processSettlementRefund(
  context: SuccessfulSettlementRefund,
  dependencies: SettlementRefundDependencies = {}
): Promise<SettlementRefundResult> {
  const identity = validateSettlement(context);
  const boundRequirements: PaymentRequirements = {
    ...context.paymentRequirements,
    network: identity.network,
    asset: identity.asset,
    amount: identity.amount,
    payTo: identity.payTo,
  };
  const store = dependencies.store ?? getRefundStore();
  const executeRefund = dependencies.executeRefund ?? refund;

  let claim;
  try {
    claim = await store.claim(identity);
  } catch (error) {
    const category = error instanceof RefundStoreError ? error.category : 'unknown';
    throw new SettlementRefundError(
      category,
      staticFailureMessage(category),
      context,
      [],
      { cause: error }
    );
  }

  if (!claim.acquired) {
    logRefundEvent('duplicate_settlement', identity, {
      status: claim.record.status,
      attemptedSignatures: claim.record.attemptedSignatures,
    });
    return resultFromRecord(claim.record, true);
  }

  let current = claim.record;
  const transition = async (
    changes: Partial<Omit<RefundRecord, 'version' | 'revision' | 'fingerprint' | 'identity' | 'createdAt'>>
  ): Promise<void> => {
    const next: RefundRecord = {
      ...current,
      ...changes,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    const updated = await store.compareAndSet(current.revision, next);
    if (!updated) {
      throw new RefundStoreError('store_conflict', 'Refund state transition lost its claim');
    }
    current = next;
  };

  const executionOptions: RefundOptions = {
    solana: dependencies.refundOptions,
    onEvmSubmitting: async () => {
      await transition({ status: 'submitting' });
    },
    onSolanaSigned: async attempt => {
      await transition({
        status: 'signed',
        attemptedSignatures: [...current.attemptedSignatures, attempt.signature],
        solanaAttempts: [...current.solanaAttempts, attempt],
      });
      logRefundEvent('solana_transaction_signed', identity, {
        attemptedSignatures: current.attemptedSignatures,
      });
    },
  };

  try {
    const refundTransaction = await executeRefund(
      identity.recipient,
      boundRequirements,
      executionOptions
    );
    await transition({
      status: 'confirmed',
      refundTransaction,
      failure: undefined,
    });
    logRefundEvent('confirmed', identity, {
      refundTransaction,
      attemptedSignatures: current.attemptedSignatures,
    });
    return resultFromRecord(current, false);
  } catch (error) {
    const category: RefundFailureCategory =
      error instanceof RefundExecutionError
        ? error.category
        : error instanceof RefundStoreError
          ? error.category
          : 'unknown';
    const attemptedSignatures =
      error instanceof RefundExecutionError
        ? error.attemptedSignatures
        : current.attemptedSignatures;
    const uncertain =
      category === 'evm_submission' ||
      category === 'solana_rpc_unavailable' ||
      category === 'solana_confirmation_timeout';
    const message = staticFailureMessage(category);

    try {
      await transition({
        status: uncertain ? 'unknown' : 'failed',
        attemptedSignatures,
        failure: { category, message },
      });
    } catch {
      // If persistence itself failed, the existing claimed/signed state remains
      // fail-closed and prevents a second wallet operation.
    }

    console.error(
      '[refund]',
      JSON.stringify({
        event: 'failed',
        category,
        network: identity.network,
        settlementTransaction: identity.settlementTransaction,
        attemptedSignatures,
      })
    );

    throw new SettlementRefundError(category, message, context, attemptedSignatures, {
      cause: error,
    });
  }
}
