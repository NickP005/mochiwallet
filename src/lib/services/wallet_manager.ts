

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
        console.log(`Sending request to ${this.baseUrl}${endpoint}`);
        console.log('Request data:', JSON.stringify(data, null, 2));
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
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

    async constructionDerive(publicKey: string): Promise<any> {
        return this.post('/construction/derive', {
            network_identifier: this.networkIdentifier,
            public_key: { hex_bytes: publicKey }
        });
    }
}