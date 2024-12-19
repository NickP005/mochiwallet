


export interface NetworkNode {
    ip: string
    port: number
    status: string
    version: string
  }
  
  export interface BlockchainInfo {
    block: number
    bnum: number
    bhash: string
    timestamp: number
    difficulty: number
    transactions: number
  }
  
  export interface Balance {
    address: string
    balance: string
    tag?: string
  }
  
  export interface Transaction {
    transaction: string
    recipients?: number
  }
  
  export interface ApiResponse<T> {
    status: 'success' | 'error'
    data?: T
    error?: string
  } 
  
  // Define Rosetta API interfaces
  interface NetworkIdentifier {
  blockchain: string;
  network: string;
  }
  
  interface RosettaState {
  isInitialized: boolean;
  networkIdentifier: NetworkIdentifier;
  networkOptions: any;
  nodeVersion: string;
  nodeUrl: string;
  currentBlock?: {
    index: number;
    hash: string;
  };
  }
  
  // Basic Promise-like implementation
  class SimplePromise {
  private callbacks: ((value: any) => any)[] = [];
  private errorHandlers: ((error: any) => any)[] = [];
  private value: any = null;
  private error: any = null;
  private settled = false;
  
  constructor(executor: (
    resolve: (value: any) => void,
    reject: (reason: any) => void
  ) => void) {
    try {
      executor(
        (value: any) => this.resolve(value),
        (error: any) => this.reject(error)
      );
    } catch (e) {
      this.reject(e);
    }
  }
  
  resolve(value: any) {
    if (this.settled) return;
    this.settled = true;
    this.value = value;
    this.callbacks.forEach(cb => {
      try {
        const result = cb(value);
        if (result && typeof result.then === 'function') {
          result.then((v: any) => this.value = v);
        } else {
          this.value = result;
        }
      } catch (e) {
        this.reject(e);
      }
    });
  }
  
  reject(error: any) {
    if (this.settled) return;
    this.settled = true;
    this.error = error;
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (e) {
        console.error('Error in error handler:', e);
      }
    });
  }
  
  then(callback: (value: any) => any) {
    return new SimplePromise((resolve, reject) => {
      const wrappedCallback = (value: any) => {
        try {
          const result = callback(value);
          if (result && typeof result.then === 'function') {
            result.then(resolve).catch(reject);
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(e);
        }
      };
  
      if (this.settled && !this.error) {
        wrappedCallback(this.value);
      } else {
        this.callbacks.push(wrappedCallback);
      }
    });
  }
  
  catch(handler: (error: any) => any) {
    return new SimplePromise((resolve, reject) => {
      const wrappedHandler = (error: any) => {
        try {
          const result = handler(error);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      };
  
      if (this.settled && this.error) {
        wrappedHandler(this.error);
      } else {
        this.errorHandlers.push(wrappedHandler);
      }
    });
  }
  
  static resolve(value?: any) {
    return new SimplePromise((resolve) => resolve(value));
  }
  }
  
  // Global state for Rosetta API
  export const RosettaAPI = {
  state: {
    isInitialized: false,
    networkIdentifier: {
      blockchain: "mochimo",
      network: "mainnet"
    },
    networkOptions: null,
    nodeVersion: "",
    nodeUrl: "http://ip.leonapp.it:8081"
  } as RosettaState,
  
  initialize() {
    return new SimplePromise((resolve) => {
      this.callEndpoint('/network/list', {})
        .then((networkList) => {
          const network = networkList.network_identifiers[0];
          return this.callEndpoint('/network/options', {
            network_identifier: network
          }).then((networkOptions) => {
            return this.callEndpoint('/network/status', {
              network_identifier: network
            }).then((networkStatus) => {
              this.state.networkIdentifier = network;
              this.state.networkOptions = networkOptions;
              this.state.nodeVersion = networkOptions.version.node_version;
              this.state.currentBlock = networkStatus.current_block_identifier;
              this.state.isInitialized = true;
              resolve(true);
            });
          });
        })
        .catch((error) => {
          console.error('Failed to initialize Rosetta API:', error);
          resolve(false);
        });
    });
  },
  
  callEndpoint(endpoint: string, body: any) {
    return new SimplePromise((resolve: (value: any) => void, reject: (reason: any) => void) => {
      fetch(`${this.state.nodeUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => resolve(data))
      .catch((error) => reject(error));
    });
  }
  };
  
  
  export class MochimoService {
  static ensureInitialized() {
    if (!RosettaAPI.state.isInitialized) {
      return RosettaAPI.initialize();
    }
    return SimplePromise.resolve();
  }
  
  // Network endpoints based on main.go routes
  static getNetworkList() {
    return this.ensureInitialized().then(() => {
      return RosettaAPI.callEndpoint('/network/list', {})
        .then(response => response.network_identifiers);
    });
  }
  
  static getNetworkStatus() {
    return this.ensureInitialized().then(() => {
      return RosettaAPI.callEndpoint('/network/status', {
        network_identifier: RosettaAPI.state.networkIdentifier
      }).then(response => ({
        block: response.current_block_identifier.index,
        bnum: response.current_block_identifier.index,
        bhash: response.current_block_identifier.hash,
        timestamp: response.current_block_timestamp,
        difficulty: 0, // Not provided by Rosetta API
        transactions: 0 // Would need separate block query
      }));
    });
  }
  
  static getNetworkOptions() {
    return this.ensureInitialized().then(() => {
      return RosettaAPI.callEndpoint('/network/options', {
        network_identifier: RosettaAPI.state.networkIdentifier
      });
    });
  }
  
  static getBlock(blockNumber) {
    return this.ensureInitialized().then(() => {
      return RosettaAPI.callEndpoint('/block', {
        network_identifier: RosettaAPI.state.networkIdentifier,
        block_identifier: {
          index: blockNumber
        }
      }).then(response => ({
        block: response.block.block_identifier.index,
        bnum: response.block.block_identifier.index,
        bhash: response.block.block_identifier.hash,
        timestamp: response.block.timestamp,
        difficulty: 0, // Not provided by Rosetta API
        transactions: response.block.transactions.length,
      }));
    });
  }
  
  static getBalance(address) {
    return this.ensureInitialized().then(() => {
      return RosettaAPI.callEndpoint('/account/balance', {
        network_identifier: RosettaAPI.state.networkIdentifier,
        account_identifier: { address }
      }).then(response => ({
        address,
        balance: response.balances[0].value
      }));
    });
  }
  
  static pushTransaction(signedTx) {
    return this.ensureInitialized().then(() => {
      return RosettaAPI.callEndpoint('/construction/submit', {
        network_identifier: RosettaAPI.state.networkIdentifier,
        signed_transaction: signedTx
      }).then(response => ({
        status: 'success',
        data: response
      })).catch(error => ({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    });
  }
  
  static getMempoolTransactions() {
    return this.ensureInitialized().then(() => {
      return RosettaAPI.callEndpoint('/mempool', {
        network_identifier: RosettaAPI.state.networkIdentifier
      }).then(response => response.transaction_identifiers.map((tx) => tx.hash));
    });
  }
  }
  
  // Example usage with promises
  function example() {
  RosettaAPI.initialize()
    .then(() => {
      if (!RosettaAPI.state.isInitialized) {
        throw new Error("Failed to initialize Rosetta API");
      }
      return MochimoService.getNetworkList();
    })
    .then((networks) => {
      console.log("Available networks:", networks);
      return MochimoService.getNetworkStatus();
    })
    .then((status) => {
      console.log("Current network status:", status);
      return MochimoService.getBalance("0x0135306fa8b44d0bf87aedfc");
    })
    .then((balance) => {
      console.log("Account balance:", balance);
      return MochimoService.getMempoolTransactions();
    })
    .then((mempoolTxs) => {
      console.log("Mempool transactions:", mempoolTxs);
      return MochimoService.getBlock(12345);
    })
    .then((block) => {
      console.log("Block info:", block);
    })
    .catch((error) => {
      console.error("Error in example:", error);
    });
  }
  
  example();