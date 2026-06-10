
// DataSource defines the contract any data source must satisfy.
// To add a new chain (e.g. Bitcoin via mempool.space, Solana via Helius),
// create a new file that exports an object with these three functions and
// pass it into screen()
export interface DataSource {
  getBalance(address: string): Promise<string>
  getTransactions(address: string): Promise<{ timeStamp: string; from: string; to: string }[]>
  isContract(address: string): Promise<boolean>
}

export interface EtherscanBalanceResponse {
  status: '1' | '0'
  message: string
  result: string 
}

export interface EtherscanTransaction {
  blockNumber: string
  timeStamp: string 
  hash: string
  from: string
  to: string
  value: string 
  isError: '0' | '1'
}

export interface EtherscanTxListResponse {
  status: '1' | '0'
  message: string
  result: EtherscanTransaction[] | string 
}

export interface EtherscanTokenTransfer extends EtherscanTransaction {
  tokenName: string
  tokenSymbol: string
  tokenDecimal: string
  contractAddress: string
}

export interface EtherscanCodeResponse {
  status: '1' | '0'
  message: string
  result: string 
}

export interface ScreeningRow {
  address: string
  balance_eth: string
  tx_count: number
  first_seen: string 
  unique_counterparties: number
  is_contract: boolean
}
