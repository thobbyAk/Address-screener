# Address Screener

A CLI script that accepts an Ethereum wallet address and outputs a CSV containing the address balance and four signals useful for compliance screening.

## Setup

```bash
npm install
cp .env.example .env
```

Get an API key at [etherscan.io](https://etherscan.io/myapikey) and add it to `.env`:

```
ETHERSCAN_API_KEY=your_key_here
```

## Usage

```bash
npx ts-node src/index.ts <ethereum-address>
```

**Example:**

```bash
npx ts-node src/index.ts 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

Output is printed to the terminal and saved to `output.csv`.

## Output columns

| Column | Description |
|---|---|
| `address` | The queried Ethereum address |
| `balance_eth` | Current ETH balance |
| `tx_count` | Total number of transactions |
| `first_seen` | Date of the first transaction (ISO 8601) |
| `unique_counterparties` | Number of distinct addresses interacted with |
| `is_contract` | Whether this is a smart contract or a user wallet (EOA) |

### Why these columns?

**`tx_count`** — Volume signal. An address with zero transactions and a large balance was recently funded, which is a red flag. An address with hundreds of thousands of transactions is likely an exchange. Transaction count is one of the first things a compliance analyst would check.

**`first_seen`** — Age signal. A fresh address (hours or days old) receiving a large sum is a major red flag. Long-standing addresses have behavioural history that supports or undermines risk assessment.

**`unique_counterparties`** — Network role proxy. Mixer addresses have very distinctive counterparty patterns. An address with 50,000 unique counterparties is almost certainly an exchange. An address with two counterparties that received a large inbound transfer warrants closer scrutiny. This single number gives a quick sense of the address's role in the network.

**`is_contract`** — Address type signal. Smart contracts and user wallets (EOAs) are fundamentally different entities requiring different analysis paths. Many sanctioned addresses — Tornado Cash, certain bridges — are smart contracts. Knowing the type upfront shapes how you investigate the address.

## Design decisions

**Why Ethereum?** Ethereum gives richer per-address compliance signals than Bitcoin. The contract vs EOA distinction is EVM-specific and directly relevant to compliance work — many sanctioned addresses are smart contracts. Ethers.js is also a tool I use in production (Botanix bridge dapp, Bink).

**Why Etherscan?** Etherscan is purpose-built for Ethereum analytics queries. Three endpoints cover all four columns. The free tier (5 calls/sec, 100k/day) is sufficient. Alchemy and Infura are excellent but are node providers — better suited for contract interactions than data queries.

**Why three files?** The task asked for a small, clear submission. One file per concern: types, API client, and orchestration.

**Why no CSV library?** Six columns, one row. Building the string manually is simpler than adding a dependency for ten lines of formatting.

## TODOs

Given more time, I would add:

- **Sanctions list check** — compare counterparties against OFAC SDN and other known flagged addresses
- **Tornado Cash interaction** — flag if any counterparty is a known mixer contract (e.g. TC router at `0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b`)
- **ERC-20 token holdings** — additional signal surface; large stablecoin balances with no ETH history is a pattern
- **Batch mode** — accept a file of addresses, output a multi-row CSV
- **Retry logic + rate limiting** — for production use against Etherscan's API
- **Multi-chain support** — Bitcoin (UTXO-based, good for amount tracing), Solana, others
