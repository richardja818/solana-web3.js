import { SOLANA_ERROR__TRANSACTION__EXPECTED_BLOCKHASH_LIFETIME, SolanaError } from '@solana/errors';
import { assertIsBlockhash, type Blockhash } from '@solana/rpc-types';

import { TransactionMessageWithDurableNonceLifetime } from './durable-nonce';
import { BaseTransactionMessage } from './transaction-message';

type BlockhashLifetimeConstraint = Readonly<{
    blockhash: Blockhash;
    lastValidBlockHeight: bigint;
}>;

export interface TransactionMessageWithBlockhashLifetime {
    readonly lifetimeConstraint: BlockhashLifetimeConstraint;
}

export function isTransactionMessageWithBlockhashLifetime(
    transaction: BaseTransactionMessage | (BaseTransactionMessage & TransactionMessageWithBlockhashLifetime),
): transaction is BaseTransactionMessage & TransactionMessageWithBlockhashLifetime {
    const lifetimeConstraintShapeMatches =
        'lifetimeConstraint' in transaction &&
        typeof transaction.lifetimeConstraint.blockhash === 'string' &&
        typeof transaction.lifetimeConstraint.lastValidBlockHeight === 'bigint';
    if (!lifetimeConstraintShapeMatches) return false;
    try {
        assertIsBlockhash(transaction.lifetimeConstraint.blockhash);
        return true;
    } catch {
        return false;
    }
}

export function assertIsTransactionMessageWithBlockhashLifetime(
    transaction: BaseTransactionMessage | (BaseTransactionMessage & TransactionMessageWithBlockhashLifetime),
): asserts transaction is BaseTransactionMessage & TransactionMessageWithBlockhashLifetime {
    if (!isTransactionMessageWithBlockhashLifetime(transaction)) {
        throw new SolanaError(SOLANA_ERROR__TRANSACTION__EXPECTED_BLOCKHASH_LIFETIME);
    }
}

export function setTransactionMessageLifetimeUsingBlockhash<
    TTransaction extends BaseTransactionMessage & TransactionMessageWithDurableNonceLifetime,
>(
    blockhashLifetimeConstraint: BlockhashLifetimeConstraint,
    transaction: TTransaction,
): Omit<TTransaction, 'lifetimeConstraint'> & TransactionMessageWithBlockhashLifetime;

export function setTransactionMessageLifetimeUsingBlockhash<
    TTransaction extends BaseTransactionMessage | (BaseTransactionMessage & TransactionMessageWithBlockhashLifetime),
>(
    blockhashLifetimeConstraint: BlockhashLifetimeConstraint,
    transaction: TTransaction,
): TransactionMessageWithBlockhashLifetime & TTransaction;

export function setTransactionMessageLifetimeUsingBlockhash(
    blockhashLifetimeConstraint: BlockhashLifetimeConstraint,
    transaction: BaseTransactionMessage | (BaseTransactionMessage & TransactionMessageWithBlockhashLifetime),
) {
    if (
        'lifetimeConstraint' in transaction &&
        transaction.lifetimeConstraint.blockhash === blockhashLifetimeConstraint.blockhash &&
        transaction.lifetimeConstraint.lastValidBlockHeight === blockhashLifetimeConstraint.lastValidBlockHeight
    ) {
        return transaction;
    }
    const out = {
        ...transaction,
        lifetimeConstraint: blockhashLifetimeConstraint,
    };
    Object.freeze(out);
    return out;
}
