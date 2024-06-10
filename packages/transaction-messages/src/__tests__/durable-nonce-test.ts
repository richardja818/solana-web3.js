import '@solana/test-matchers/toBeFrozenObject';

import { Address } from '@solana/addresses';
import { AccountRole, IInstruction, ReadonlySignerAccount, WritableAccount } from '@solana/instructions';
import type { Blockhash } from '@solana/rpc-types';

import { TransactionMessageWithBlockhashLifetime } from '../blockhash';
import {
    assertIsDurableNonceTransactionMessage,
    Nonce,
    setTransactionMessageLifetimeUsingDurableNonce,
    TransactionMessageWithDurableNonceLifetime,
} from '../durable-nonce';
import { BaseTransactionMessage } from '../transaction-message';

function createMockAdvanceNonceAccountInstruction<
    TNonceAccountAddress extends string = string,
    TNonceAuthorityAddress extends string = string,
>({
    nonceAccountAddress,
    nonceAuthorityAddress,
}: {
    nonceAccountAddress: Address<TNonceAccountAddress>;
    nonceAuthorityAddress: Address<TNonceAuthorityAddress>;
}): TransactionMessageWithDurableNonceLifetime['instructions'][0] {
    return {
        accounts: [
            { address: nonceAccountAddress, role: AccountRole.WRITABLE } as WritableAccount<TNonceAccountAddress>,
            {
                address:
                    'SysvarRecentB1ockHashes11111111111111111111' as Address<'SysvarRecentB1ockHashes11111111111111111111'>,
                role: AccountRole.READONLY,
            },
            {
                address: nonceAuthorityAddress,
                role: AccountRole.READONLY_SIGNER,
            } as ReadonlySignerAccount<TNonceAuthorityAddress>,
        ],
        data: new Uint8Array([4, 0, 0, 0]) as TransactionMessageWithDurableNonceLifetime['instructions'][0]['data'],
        programAddress: '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>,
    };
}

describe('assertIsDurableNonceTransactionMessage()', () => {
    let durableNonceTx: BaseTransactionMessage & TransactionMessageWithDurableNonceLifetime;
    const NONCE_CONSTRAINT = {
        nonce: '123' as Nonce,
        nonceAccountAddress: '123' as Address,
        nonceAuthorityAddress: '123' as Address,
    };
    beforeEach(() => {
        durableNonceTx = {
            instructions: [createMockAdvanceNonceAccountInstruction(NONCE_CONSTRAINT)],
            lifetimeConstraint: {
                nonce: NONCE_CONSTRAINT.nonce,
            } as TransactionMessageWithDurableNonceLifetime['lifetimeConstraint'],
            version: 0,
        } as const;
    });
    it('throws when supplied a transaction with a nonce lifetime constraint but no instructions', () => {
        expect(() => {
            assertIsDurableNonceTransactionMessage({
                ...durableNonceTx,
                instructions: [],
            });
        }).toThrow();
    });
    it('throws when supplied a transaction with a nonce lifetime constraint but an instruction at index 0 for a program other than the system program', () => {
        expect(() => {
            assertIsDurableNonceTransactionMessage({
                ...durableNonceTx,
                instructions: [
                    {
                        ...durableNonceTx.instructions[0],
                        programAddress: '32JTd9jz5xGuLegzVouXxfzAVTiJYWMLrg6p8RxbV5xc' as Address,
                    },
                ],
                lifetimeConstraint: {
                    nonce: NONCE_CONSTRAINT.nonce,
                } as TransactionMessageWithDurableNonceLifetime['lifetimeConstraint'],
            });
        }).toThrow();
    });
    it('throws when supplied a transaction with a nonce lifetime constraint but a system program instruction at index 0 for something other than the `AdvanceNonceAccount` instruction', () => {
        expect(() => {
            assertIsDurableNonceTransactionMessage({
                ...durableNonceTx,
                instructions: [
                    {
                        ...durableNonceTx.instructions[0],
                        data: new Uint8Array([2, 0, 0, 0]), // Transfer instruction
                    },
                ],
                lifetimeConstraint: {
                    nonce: NONCE_CONSTRAINT.nonce,
                } as TransactionMessageWithDurableNonceLifetime['lifetimeConstraint'],
            });
        }).toThrow();
    });
    it('throws when supplied a transaction with a nonce lifetime constraint but a system program instruction at index 0 with malformed accounts', () => {
        expect(() => {
            assertIsDurableNonceTransactionMessage({
                ...durableNonceTx,
                instructions: [
                    {
                        ...durableNonceTx.instructions[0],
                        accounts: [],
                    },
                ],
                lifetimeConstraint: {
                    nonce: NONCE_CONSTRAINT.nonce,
                } as TransactionMessageWithDurableNonceLifetime['lifetimeConstraint'],
            });
        }).toThrow();
    });
    it('throws when supplied a transaction with an `AdvanceNonceAccount` instruction at index 0 but no lifetime constraint', () => {
        expect(() => {
            assertIsDurableNonceTransactionMessage({
                ...durableNonceTx,
                lifetimeConstraint: undefined,
            });
        }).toThrow();
    });
    it('throws when supplied a transaction with an `AdvanceNonceAccount` instruction at index 0 but a blockhash lifetime constraint', () => {
        expect(() => {
            assertIsDurableNonceTransactionMessage({
                ...durableNonceTx,
                lifetimeConstraint: {
                    blockhash: '123' as Blockhash,
                    lastValidBlockHeight: 123n,
                } as TransactionMessageWithBlockhashLifetime['lifetimeConstraint'],
            } as BaseTransactionMessage);
        }).toThrow();
    });
    it('does not throw when supplied a durable nonce transaction', () => {
        expect(() => {
            assertIsDurableNonceTransactionMessage({ ...durableNonceTx });
        }).not.toThrow();
    });
    it('does not throw when the nonce authority is a writable signer', () => {
        const advanceDurableNonceInstruction = createMockAdvanceNonceAccountInstruction(NONCE_CONSTRAINT);
        const { accounts } = advanceDurableNonceInstruction;
        const updatedInstruction: IInstruction = {
            ...advanceDurableNonceInstruction,
            accounts: [
                accounts[0],
                accounts[1],
                {
                    ...accounts[2],
                    role: AccountRole.WRITABLE_SIGNER,
                },
            ],
        };
        const transaction = {
            instructions: [updatedInstruction],
            lifetimeConstraint: {
                nonce: NONCE_CONSTRAINT.nonce,
            } as TransactionMessageWithDurableNonceLifetime['lifetimeConstraint'],
            version: 0,
        } as const;
        expect(() => {
            assertIsDurableNonceTransactionMessage({ ...transaction });
        }).not.toThrow();
    });
});

describe('setTransactionMessageLifetimeUsingDurableNonce', () => {
    let baseTx: BaseTransactionMessage;
    const NONCE_CONSTRAINT_A = {
        nonce: '123' as Nonce,
        nonceAccountAddress: '123' as Address,
        nonceAuthorityAddress: '123' as Address,
    };
    const NONCE_CONSTRAINT_B = {
        nonce: '456' as Nonce,
        nonceAccountAddress: '456' as Address,
        nonceAuthorityAddress: '456' as Address,
    };
    beforeEach(() => {
        baseTx = {
            instructions: [{ programAddress: '32JTd9jz5xGuLegzVouXxfzAVTiJYWMLrg6p8RxbV5xc' as Address }],
            version: 0,
        };
    });
    it('sets the lifetime constraint on the transaction to the supplied durable nonce constraint', () => {
        const durableNonceTxWithConstraintA = setTransactionMessageLifetimeUsingDurableNonce(
            NONCE_CONSTRAINT_A,
            baseTx,
        );
        expect(durableNonceTxWithConstraintA).toHaveProperty('lifetimeConstraint', { nonce: NONCE_CONSTRAINT_A.nonce });
    });
    it('prepends an `AdvanceNonceAccount` instruction', () => {
        const durableNonceTxWithConstraintA = setTransactionMessageLifetimeUsingDurableNonce(
            NONCE_CONSTRAINT_A,
            baseTx,
        );
        expect(durableNonceTxWithConstraintA.instructions).toEqual([
            createMockAdvanceNonceAccountInstruction(NONCE_CONSTRAINT_A),
            baseTx.instructions[0],
        ]);
    });
    it('freezes the prepended `AdvanceNonceAccount` instruction', () => {
        const durableNonceTxWithConstraintA = setTransactionMessageLifetimeUsingDurableNonce(
            NONCE_CONSTRAINT_A,
            baseTx,
        );
        expect(durableNonceTxWithConstraintA.instructions[0]).toBeFrozenObject();
    });
    describe('given a transaction with an advance nonce account instruction but no nonce lifetime constraint', () => {
        it('does not modify an `AdvanceNonceAccount` instruction if the existing one matches the constraint added', () => {
            const instruction = createMockAdvanceNonceAccountInstruction(NONCE_CONSTRAINT_A);
            instruction.accounts[2].role = AccountRole.WRITABLE_SIGNER;
            const transaction: BaseTransactionMessage = {
                ...baseTx,
                instructions: [instruction, baseTx.instructions[0]],
            };
            const durableNonceTxWithConstraintA = setTransactionMessageLifetimeUsingDurableNonce(
                NONCE_CONSTRAINT_A,
                transaction,
            );
            expect(durableNonceTxWithConstraintA.instructions).toEqual([instruction, baseTx.instructions[0]]);
        });
        describe('when the existing `AdvanceNonceAccount` instruction does not match the constraint added', () => {
            it('replaces the existing instruction', () => {
                const transaction: BaseTransactionMessage = {
                    ...baseTx,
                    instructions: [
                        createMockAdvanceNonceAccountInstruction(NONCE_CONSTRAINT_B),
                        baseTx.instructions[0],
                    ],
                };
                const durableNonceTxWithConstraintA = setTransactionMessageLifetimeUsingDurableNonce(
                    NONCE_CONSTRAINT_A,
                    transaction,
                );
                expect(durableNonceTxWithConstraintA.instructions).toEqual([
                    createMockAdvanceNonceAccountInstruction(NONCE_CONSTRAINT_A),
                    baseTx.instructions[0],
                ]);
            });

            it('freezes the replacement instruction', () => {
                const transaction: BaseTransactionMessage = {
                    ...baseTx,
                    instructions: [
                        createMockAdvanceNonceAccountInstruction(NONCE_CONSTRAINT_B),
                        baseTx.instructions[0],
                    ],
                };
                const durableNonceTxWithConstraintA = setTransactionMessageLifetimeUsingDurableNonce(
                    NONCE_CONSTRAINT_A,
                    transaction,
                );
                expect(durableNonceTxWithConstraintA.instructions[0]).toBeFrozenObject();
            });
        });
    });
    describe('given a durable nonce transaction', () => {
        let durableNonceTxWithConstraintA: BaseTransactionMessage & TransactionMessageWithDurableNonceLifetime;
        beforeEach(() => {
            durableNonceTxWithConstraintA = {
                ...baseTx,
                instructions: [
                    createMockAdvanceNonceAccountInstruction(NONCE_CONSTRAINT_A),
                    { programAddress: '32JTd9jz5xGuLegzVouXxfzAVTiJYWMLrg6p8RxbV5xc' as Address },
                ],
                lifetimeConstraint: { nonce: NONCE_CONSTRAINT_A.nonce },
                version: 0,
            };
        });
        it('sets the new durable nonce constraint on the transaction when it differs from the existing one', () => {
            const durableNonceTxWithConstraintB = setTransactionMessageLifetimeUsingDurableNonce(
                NONCE_CONSTRAINT_B,
                durableNonceTxWithConstraintA,
            );
            expect(durableNonceTxWithConstraintB).toHaveProperty('lifetimeConstraint', {
                nonce: NONCE_CONSTRAINT_B.nonce,
            });
        });
        it('replaces the advance nonce account instruction when it differs from the existing one', () => {
            const durableNonceTxWithConstraintB = setTransactionMessageLifetimeUsingDurableNonce(
                NONCE_CONSTRAINT_B,
                durableNonceTxWithConstraintA,
            );
            expect(durableNonceTxWithConstraintB.instructions).toEqual([
                createMockAdvanceNonceAccountInstruction(NONCE_CONSTRAINT_B),
                durableNonceTxWithConstraintA.instructions[1],
            ]);
        });
        it('freezes the replacement advance nonce account instruction', () => {
            const durableNonceTxWithConstraintB = setTransactionMessageLifetimeUsingDurableNonce(
                NONCE_CONSTRAINT_B,
                durableNonceTxWithConstraintA,
            );
            expect(durableNonceTxWithConstraintB.instructions[0]).toBeFrozenObject();
        });
        it('returns the original transaction when trying to set the same durable nonce constraint again', () => {
            const txWithSameNonceLifetimeConstraint = setTransactionMessageLifetimeUsingDurableNonce(
                NONCE_CONSTRAINT_A,
                durableNonceTxWithConstraintA,
            );
            expect(durableNonceTxWithConstraintA).toBe(txWithSameNonceLifetimeConstraint);
        });
    });
    it('freezes the object', () => {
        const durableNonceTx = setTransactionMessageLifetimeUsingDurableNonce(NONCE_CONSTRAINT_A, baseTx);
        expect(durableNonceTx).toBeFrozenObject();
    });
    it('freezes the instructions array', () => {
        const durableNonceTx = setTransactionMessageLifetimeUsingDurableNonce(NONCE_CONSTRAINT_A, baseTx);
        expect(durableNonceTx.instructions).toBeFrozenObject();
    });
    it('freezes the nonce lifetime', () => {
        const durableNonceTx = setTransactionMessageLifetimeUsingDurableNonce(NONCE_CONSTRAINT_A, baseTx);
        expect(durableNonceTx.lifetimeConstraint).toBeFrozenObject();
    });
});
