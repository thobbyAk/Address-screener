import type { DataSource } from './types'
import {
  EtherscanBalanceResponse,
  EtherscanCodeResponse,
  EtherscanTokenTransfer,
  EtherscanTransaction,
  EtherscanTxListResponse,
} from './types'

const BASE_URL = 'https://api.etherscan.io/v2/api'

// CHAIN_ID is hardcoded to Ethereum mainnet (1).
// Etherscan V2 supports many EVM chains via this parameter, so passing it as an
// argument here is all that's needed to support Polygon (137), BSC (56), etc.
// Non-EVM chains (Bitcoin, Solana) would need a separate file — e.g. mempool.ts —
// that exports the same three functions: getBalance, getTransactions, isContract.
const CHAIN_ID = '1' // Ethereum mainnet

function apiKey(): string {
  const key = process.env.ETHERSCAN_API_KEY
  if (!key) throw new Error('ETHERSCAN_API_KEY is not set in environment')
  return key
}

async function get<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(BASE_URL)
  url.searchParams.set('chainid', CHAIN_ID)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('apikey', apiKey())

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Etherscan HTTP error: ${res.status}`)
  return res.json() as Promise<T>
}

export async function getBalance(address: string): Promise<string> {
  const data = await get<EtherscanBalanceResponse>({
    module: 'account',
    action: 'balance',
    address,
    tag: 'latest',
  })
  if (data.status !== '1') throw new Error(`Balance fetch failed: ${data.result}`)
  return data.result
}

async function fetchTxList(params: Record<string, string>, label: string): Promise<EtherscanTransaction[]> {
  const data = await get<EtherscanTxListResponse>({
    ...params,
    startblock: '0',
    endblock: '99999999',
    sort: 'asc',
  })
  if (data.status === '0') {
    if (data.message === 'No transactions found') return []
    throw new Error(`${label} fetch failed: ${data.result}`)
  }
  return data.result as EtherscanTransaction[]
}

export async function getTransactions(address: string): Promise<EtherscanTransaction[]> {
  const [normal, internal, tokens] = await Promise.all([
    fetchTxList({ module: 'account', action: 'txlist', address }, 'Normal tx'),
    fetchTxList({ module: 'account', action: 'txlistinternal', address }, 'Internal tx'),
    fetchTxList({ module: 'account', action: 'tokentx', address }, 'Token transfer') as Promise<EtherscanTokenTransfer[]>,
  ])

  // Internal txs share a hash with their parent normal tx — deduplicate before merging
  const seen = new Set<string>()
  return [...normal, ...internal, ...tokens]
    .filter(tx => {
      if (seen.has(tx.hash)) return false
      seen.add(tx.hash)
      return true
    })
    .sort((a, b) => parseInt(a.timeStamp) - parseInt(b.timeStamp))
}

export async function isContract(address: string): Promise<boolean> {
  const data = await get<EtherscanCodeResponse>({
    module: 'proxy',
    action: 'eth_getCode',
    address,
    tag: 'latest',
  })
  return data.result !== '0x' && data.result !== '0x0'
}

// TODO: accept chainId as a parameter to support other EVM chains (Polygon=137, BSC=56).
export const etherscanSource: DataSource = { getBalance, getTransactions, isContract }
