export const typeTypeDefs = /* GraphQL */ `
    enum AccountEncoding {
        BASE_58
        BASE_64
        BASE_64_ZSTD
    }

    scalar Address

    scalar Base58EncodedBytes

    scalar Base64EncodedBytes

    scalar Base64ZstdEncodedBytes

    scalar BigInt

    enum Commitment {
        CONFIRMED
        FINALIZED
        PROCESSED
    }

    enum CommitmentWithoutProcessed {
        CONFIRMED
        FINALIZED
    }

    input DataSlice {
        offset: Int!
        length: Int!
    }

    scalar Epoch

    scalar Hash

    scalar Lamports

    input ProgramAccountsFilter {
        bytes: BigInt
        dataSize: BigInt
        encoding: AccountEncoding
        offset: BigInt
    }

    type ReturnData {
        data: Base64EncodedBytes
        programId: Address
    }

    type Reward {
        commission: Int
        lamports: Lamports
        postBalance: BigInt
        pubkey: Address
        rewardType: String
    }

    scalar Signature

    scalar Slot

    enum SplTokenDefaultAccountState {
        FROZEN
        INITIALIZED
        UNINITIALIZED
    }

    type TokenAmount {
        amount: BigInt
        decimals: Int
        uiAmount: BigInt
        uiAmountString: String
    }

    type TokenBalance {
        accountIndex: Int
        mint: Account
        owner: Account
        programId: Address
        uiTokenAmount: TokenAmount
    }

    enum TransactionEncoding {
        BASE_58
        BASE_64
    }
`;
