export interface Amount {
    value: string;
    currency: {
        symbol: string;
        decimals: number;
    };
}

export interface NetworkIdentifier {
    blockchain: string;
    network: string;
}

export interface BlockIdentifier {
    index?: number;
    hash?: string;
}

export interface TransactionIdentifier {
    hash: string;
}

export interface Operation {
    operation_identifier: {
        index: number;
    };
    type: string;
    status: string;
    account: {
        address: string;
        metadata?: Record<string, any>;
    };
    amount: {
        value: string;
        currency: {
            symbol: string;
            decimals: number;
        };
    };
}

export interface Transaction {
    transaction_identifier: TransactionIdentifier;
    operations: Operation[];
}

export interface Block {
    block_identifier: BlockIdentifier;
    parent_block_identifier: BlockIdentifier;
    timestamp: number;
    transactions: Transaction[];
}

export interface NetworkStatus {
    current_block_identifier: BlockIdentifier;
    genesis_block_identifier: BlockIdentifier;
    current_block_timestamp: number;
}

export interface NetworkOptions {
    version: {
        rosetta_version: string;
        node_version: string;
        middleware_version: string;
    };
    allow: {
        operation_statuses: Array<{
            status: string;
            successful: boolean;
        }>;
        operation_types: string[];
        errors: Array<{
            code: number;
            message: string;
            retriable: boolean;
        }>;
        mempool_coins: boolean;
        transaction_hash_case: string;
    };
}

export interface PublicKey {
    hex_bytes: string;
    curve_type: string;
}

export interface ConstructionDeriveRequest {
    network_identifier: NetworkIdentifier;
    public_key: PublicKey;
    metadata?: Record<string, any>;
}

export interface ConstructionDeriveResponse {
    address: string;
    account_identifier?: {
        address: string;
    };
    metadata?: Record<string, any>;
}

export interface ConstructionPreprocessRequest {
    network_identifier: NetworkIdentifier;
    operations: Operation[];
    metadata?: Record<string, any>;
}

export interface ConstructionPreprocessResponse {
    options?: Record<string, any>;
    required_public_keys?: { address: string }[];
}

export interface ConstructionMetadataRequest {
    network_identifier: NetworkIdentifier;
    options?: Record<string, any>;
    public_keys?: PublicKey[];
}

export interface ConstructionMetadataResponse {
    metadata: Record<string, any>;
    suggested_fee?: Amount[];
}

export interface ConstructionPayloadsRequest {
    network_identifier: NetworkIdentifier;
    operations: Operation[];
    metadata?: Record<string, any>;
    public_keys?: PublicKey[];
}

export interface ConstructionPayloadsResponse {
    unsigned_transaction: string;
    payloads: {
        address: string;
        hex_bytes: string;
        signature_type: string;
    }[];
}

export interface ConstructionParseRequest {
    network_identifier: NetworkIdentifier;
    signed: boolean;
    transaction: string;
}

export interface ConstructionParseResponse {
    operations: Operation[];
    account_identifier_signers?: { address: string }[];
    metadata?: Record<string, any>;
}

export interface ConstructionCombineRequest {
    network_identifier: NetworkIdentifier;
    unsigned_transaction: string;
    signatures: {
        hex_bytes: string;
        public_key: PublicKey;
        signature_type: string;
    }[];
}

export interface ConstructionCombineResponse {
    signed_transaction: string;
}

export interface ConstructionHashRequest {
    network_identifier: NetworkIdentifier;
    signed_transaction: string;
}

export interface ConstructionHashResponse {
    transaction_identifier: TransactionIdentifier;
    metadata?: Record<string, any>;
}

export interface ConstructionSubmitRequest {
    network_identifier: NetworkIdentifier;
    signed_transaction: string;
}

export interface ConstructionSubmitResponse {
    transaction_identifier: TransactionIdentifier;
    metadata?: Record<string, any>;
}

export class MochimoRosettaClient {
    private baseUrl: string;
    private networkIdentifier: NetworkIdentifier;

    constructor(baseUrl: string = 'http://ip.leonapp.it:8081') {
        this.baseUrl = baseUrl;
        this.networkIdentifier = {
            blockchain: 'mochimo',
            network: 'mainnet'
        };
    }

    private async post<T>(endpoint: string, data: any): Promise<T> {
        //console.log(`Sending request to ${this.baseUrl}${endpoint}`);
        console.log('Request data:', JSON.stringify(data, null, 2));
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify(data),
        });

        const responseData = await response.json();
        console.log('Response:', JSON.stringify(responseData, null, 2));

        if (!response.ok) {
            throw new Error(`API Error: ${JSON.stringify(responseData)}`);
        }

        return responseData;
    }

    async initialize(): Promise<{status: NetworkStatus, options: NetworkOptions}> {
        const [status, options] = await Promise.all([
            this.getNetworkStatus(),
            this.getNetworkOptions()
        ]);
        return { status, options };
    }

    async getNetworkStatus(): Promise<NetworkStatus> {
        return this.post<NetworkStatus>('/network/status', {
            network_identifier: this.networkIdentifier
        });
    }

    async getNetworkOptions(): Promise<NetworkOptions> {
        return this.post<NetworkOptions>('/network/options', {
            network_identifier: this.networkIdentifier
        });
    }

    async getBlock(identifier: BlockIdentifier): Promise<{ block: Block }> {
        return this.post<{ block: Block }>('/block', {
            network_identifier: this.networkIdentifier,
            block_identifier: identifier
        });
    }

    async getAccountBalance(address: string): Promise<any> {
        return this.post('/account/balance', {
            network_identifier: this.networkIdentifier,
            account_identifier: { address }
        });
    }

    async constructionDerive(publicKey: string, curveType: string = 'wotsp'): Promise<ConstructionDeriveResponse> {
        const request: ConstructionDeriveRequest = {
            network_identifier: this.networkIdentifier,
            public_key: {
                hex_bytes: publicKey,
                curve_type: curveType
            }
        };

        return this.post<ConstructionDeriveResponse>('/construction/derive', request);
    }

    async constructionPreprocess(operations: Operation[], metadata?: Record<string, any>): Promise<ConstructionPreprocessResponse> {
        const request: ConstructionPreprocessRequest = {
            network_identifier: this.networkIdentifier,
            operations,
            metadata
        };
        return this.post<ConstructionPreprocessResponse>('/construction/preprocess', request);
    }

    async constructionMetadata(options?: Record<string, any>, publicKeys?: PublicKey[]): Promise<ConstructionMetadataResponse> {
        const request: ConstructionMetadataRequest = {
            network_identifier: this.networkIdentifier,
            options,
            public_keys: publicKeys
        };
        return this.post<ConstructionMetadataResponse>('/construction/metadata', request);
    }

    async constructionPayloads(
        operations: Operation[], 
        metadata?: Record<string, any>,
        publicKeys?: PublicKey[]
    ): Promise<ConstructionPayloadsResponse> {
        const request: ConstructionPayloadsRequest = {
            network_identifier: this.networkIdentifier,
            operations,
            metadata,
            public_keys: publicKeys
        };
        return this.post<ConstructionPayloadsResponse>('/construction/payloads', request);
    }

    async constructionParse(
        transaction: string,
        signed: boolean
    ): Promise<ConstructionParseResponse> {
        const request: ConstructionParseRequest = {
            network_identifier: this.networkIdentifier,
            signed,
            transaction
        };
        return this.post<ConstructionParseResponse>('/construction/parse', request);
    }

    async constructionCombine(
        unsignedTransaction: string,
        signatures: { hex_bytes: string; public_key: PublicKey; signature_type: string }[]
    ): Promise<ConstructionCombineResponse> {
        const request: ConstructionCombineRequest = {
            network_identifier: this.networkIdentifier,
            unsigned_transaction: unsignedTransaction,
            signatures
        };
        return this.post<ConstructionCombineResponse>('/construction/combine', request);
    }

    async constructionHash(signedTransaction: string): Promise<ConstructionHashResponse> {
        const request: ConstructionHashRequest = {
            network_identifier: this.networkIdentifier,
            signed_transaction: signedTransaction
        };
        return this.post<ConstructionHashResponse>('/construction/hash', request);
    }

    async constructionSubmit(signedTransaction: string): Promise<ConstructionSubmitResponse> {
        const request: ConstructionSubmitRequest = {
            network_identifier: this.networkIdentifier,
            signed_transaction: signedTransaction
        };
        return this.post<ConstructionSubmitResponse>('/construction/submit', request);
    }
}