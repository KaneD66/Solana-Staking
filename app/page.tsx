'use client'

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import StakingPool from '@/components/StakingPool'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Solana Staking Platform
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Stake your tokens and earn rewards
              </p>
            </div>
            <div className="flex items-center gap-4">
              <WalletMultiButton className="!bg-primary-600 hover:!bg-primary-700 !rounded-lg" />
            </div>
          </div>
        </header>

        {/* Staking Pools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pool 1: Ronaldo → USDC */}
          <StakingPool
            poolId={1}
            depositToken="ronaldo"
            rewardsToken="usdc"
          />

          {/* Pool 2: Messi → USDC */}
          <StakingPool
            poolId={2}
            depositToken="messi"
            rewardsToken="usdc"
          />

          {/* Pool 3: USDC → USDC */}
          <StakingPool
            poolId={3}
            depositToken="usdc"
            rewardsToken="usdc"
          />
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Connect Wallet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Connect your Solana wallet to get started
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Stake Tokens
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a pool and stake your tokens
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Earn Rewards
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Claim your rewards anytime
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

