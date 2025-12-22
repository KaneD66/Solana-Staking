# Solana Staking Platform

A modern, beautiful UI for staking Solana tokens with three different staking pools.

## Features

- 🎨 Modern, responsive UI with dark mode support
- 🔌 Solana wallet integration (Phantom, Solflare)
- 📊 Three staking pools:
  - Pool 1: Stake RONALDO → Earn USDC
  - Pool 2: Stake MESSI → Earn USDC
  - Pool 3: Stake USDC → Earn USDC
- 💰 Stake, Unstake, and Claim functionality
- 📈 Estimated rewards display
- ⚡ Quick input buttons (20%, 50%, MAX)
- 🔒 Secure wallet connection

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout with wallet provider
│   ├── page.tsx             # Main page with three staking pools
│   └── globals.css          # Global styles
├── components/
│   ├── WalletProvider.tsx   # Solana wallet adapter provider
│   └── StakingPool.tsx      # Staking pool component
└── package.json
```

## Next Steps

The UI is ready! Next, you'll need to:

1. **Connect to Anchor Program**: Integrate the Anchor contract for actual staking transactions
2. **Fetch Real Balances**: Replace mock data with actual wallet and contract balance fetching
3. **Implement Transactions**: Connect stake/unstake/claim functions to your Anchor program
4. **Calculate Rewards**: Implement real-time reward calculation based on your staking logic

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **@solana/wallet-adapter** - Wallet integration
- **@solana/web3.js** - Solana blockchain interaction

## Development

The project uses:
- Next.js App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Solana Wallet Adapter for wallet connections

## Notes

- Currently uses mock data for balances and rewards
- Wallet connection is functional
- All transaction handlers are ready for Anchor integration
- UI is fully responsive and supports dark mode

