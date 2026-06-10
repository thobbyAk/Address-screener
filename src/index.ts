import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { etherscanSource } from './etherscan'
import type { DataSource, ScreeningRow } from './types'

function isValidAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}

function weiToEth(wei: string): string {
  const ETH = BigInt('1000000000000000000')
  const whole = BigInt(wei) / ETH
  const remainder = BigInt(wei) % ETH
  const decimals = remainder.toString().padStart(18, '0').slice(0, 6)
  return `${whole}.${decimals}`
}

function toIsoDate(unixTimestamp: string): string {
  return new Date(parseInt(unixTimestamp, 10) * 1000).toISOString().slice(0, 10)
}

function toCSV(row: ScreeningRow): string {
  const header = 'address,balance_eth,tx_count,first_seen,unique_counterparties,is_contract'
  const values = [
    row.address,
    row.balance_eth,
    row.tx_count,
    row.first_seen,
    row.unique_counterparties,
    row.is_contract,
  ].join(',')
  return `${header}\n${values}\n`
}


async function screen(address: string, source: DataSource): Promise<ScreeningRow> {
  console.log(`Screening ${address}...`)

  const [balanceWei, txs, contract] = await Promise.all([
    source.getBalance(address),
    source.getTransactions(address),
    source.isContract(address),
  ])

  const counterparties = new Set<string>()
  for (const tx of txs) {
    if (tx.from.toLowerCase() !== address.toLowerCase()) counterparties.add(tx.from.toLowerCase())
    if (tx.to && tx.to.toLowerCase() !== address.toLowerCase()) counterparties.add(tx.to.toLowerCase())
  }

  return {
    address,
    balance_eth: weiToEth(balanceWei),
    tx_count: txs.length,
    first_seen: txs.length > 0 ? toIsoDate(txs[0].timeStamp) : 'N/A',
    unique_counterparties: counterparties.size,
    is_contract: contract,
  }
}

async function main() {
  const address = process.argv[2]
  // TODO: parse a --chain flag (eth, polygon) and select the source here.
  const source = etherscanSource

  if (!address) {
    console.error('Usage: npx ts-node src/index.ts <ethereum-address>')
    process.exit(1)
  }

  // TODO: address validation is Ethereum-specific (0x + 40 hex chars).
  // Each chain has its own format — move this into the DataSource so the right
  // validator is selected automatically when the source is selected.
  if (!isValidAddress(address)) {
    console.error(`Invalid Ethereum address: ${address}`)
    process.exit(1)
  }

  const row = await screen(address, source)
  const csv = toCSV(row)

  const outPath = path.resolve('output.csv')
  fs.writeFileSync(outPath, csv, 'utf8')

  console.log(csv)
  console.log(`Saved to ${outPath}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
