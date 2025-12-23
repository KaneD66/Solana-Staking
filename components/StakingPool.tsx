'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useStaking } from '@/hooks/useStaking'

interface StakingPoolProps {
  poolId: number
  depositToken: string
  rewardsToken: string
}

export default function StakingPool({ poolId, depositToken, rewardsToken }: StakingPoolProps) {
  const { walletBalance, stakedBalance, estimatedBalance, tokenBBalance, isLoading, program, stake, unstake, claimRewards } = useStaking()
  const { connected, publicKey } = useWallet()
  const [amount, setAmount] = useState('')

  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < 0) {
      setAmount('')
      return
    }
    setAmount(value)
  }

  const setPercentage = (percentage: number) => {
    const amount = (walletBalance * percentage) / 100
    setAmount(amount.toFixed(2))
  }

  const setMax = () => {
    setAmount(walletBalance.toString())
  }

  const handleStake = async () => {
    if (!connected || !publicKey) return
    if (!amount || parseFloat(amount) <= 0) return
    if (parseFloat(amount) > walletBalance) return

    try {
      await stake(parseFloat(amount))
      setAmount('')
    } catch (error) {
      console.error('Stake error:', error)
    }
  }

  const handleUnstake = async () => {
    if (!connected || !publicKey) return
    if (!amount || parseFloat(amount) <= 0) return
    if (parseFloat(amount) > stakedBalance) return

    try {
      await unstake(parseFloat(amount))
      setAmount('')
    } catch (error) {
      console.error('Unstake error:', error)
    }
  }

  const handleClaim = async () => {
    if (!connected || !publicKey) return
    if (estimatedBalance <= 0) return

    try {
      await claimRewards()
    } catch (error) {
      console.error('Claim error:', error)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Pool {poolId}
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Deposit:</span>
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
            {depositToken.toUpperCase()}
          </span>
          <span className="mx-2">→</span>
          <span className="font-medium">Rewards:</span>
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
            {rewardsToken.toUpperCase()}
          </span>
        </div>
      </div>

      {!connected ? (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Connect your wallet to start staking
          </p>
          <WalletMultiButton className="!bg-primary-600 hover:!bg-primary-700" />
        </div>
      ) : (
        <>
          {/* Staked Balance */}
          <div className="mb-6">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Staked Balance
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stakedBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {depositToken.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Input and Action Buttons */}
          <div className="mb-6">
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={isLoading}
                />
                <button
                  onClick={setMax}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
                  disabled={isLoading || walletBalance === 0}
                >
                  MAX
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPercentage(20)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition"
                  disabled={isLoading || walletBalance === 0}
                >
                  20%
                </button>
                <button
                  onClick={() => setPercentage(50)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition"
                  disabled={isLoading || walletBalance === 0}
                >
                  50%
                </button>
                <button
                  onClick={() => setPercentage(100)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition"
                  disabled={isLoading || walletBalance === 0}
                >
                  MAX
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleStake}
                  disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > walletBalance}
                  className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Stake
                </button>
                <button
                  onClick={handleUnstake}
                  disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > stakedBalance}
                  className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Unstake
                </button>
              </div>
            </div>
          </div>

          {/* Estimated Rewards and Claim */}
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Estimated Rewards
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {estimatedBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {rewardsToken.toUpperCase()}
              </p>
            </div>
            <button
              onClick={handleClaim}
              disabled={estimatedBalance <= 0}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Claim {estimatedBalance.toFixed(2)} {rewardsToken.toUpperCase()}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

