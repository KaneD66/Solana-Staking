import { useState, useCallback, useEffect } from "react";
import { web3, Program, AnchorProvider } from "@project-serum/anchor";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

import { calculateStakeEntryPda } from "@/program/pda";
import { fromTokenAmount, tokenAmount } from "@/program/utils";
import { getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction, getMint } from "@solana/spl-token";
import { createStakeEntryIx, createStakeIx, createUnstakeIx, createClaimRewardsIx, setProgram } from "@/program/instructions";

import { WmpStaking, IDL } from "@/idl/wmp_staking";
import { WMP_STAKING_PROGRAM_ID } from "@/program/program-id";
import { getPoolConfig } from "@/config/pools";

export interface StakingState {
  walletBalance: number,
  stakedBalance: number,
  estimatedBalance: number,
  tokenBBalance: number,
  apy: number,
  program: Program<WmpStaking> | null,
}

export function useStaking(poolId: number) {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [state, setState] = useState<StakingState>({
    walletBalance: 0,
    stakedBalance: 0,
    estimatedBalance: 0,
    tokenBBalance: 0,
    apy: 0,
    program: null
  });
  // Initialize program when wallet connects
  useEffect(() => {
    if (connected && publicKey && connection && signTransaction) {
      const wallet = {
        publicKey,
        signTransaction: signTransaction!,
        signAllTransactions: async (txs: web3.Transaction[]) => {
          const signed: web3.Transaction[] = []
          for (const tx of txs) {
            signed.push(await signTransaction!(tx))
          }
          return signed
        },
      }

      const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' })

      // Create program instance - matching the pattern from src/handlers.ts
      // Using type assertion to work around TypeScript constructor overload issue
      const ProgramConstructor = Program as any
      const program = new ProgramConstructor(
        IDL,
        WMP_STAKING_PROGRAM_ID,
        provider
      ) as Program<WmpStaking>

      setProgram(program)
      setState(prev => ({ ...prev, program }))
    }
  }, [connected, publicKey, connection, signTransaction])

  const loadState = useCallback(async () => {
    if (!connected || !publicKey || !state.program) return

    try {
      const poolConfig = getPoolConfig(poolId)
      const { depositTokenMint, rewardsTokenMint, poolAddress } = poolConfig

      // Fetch token A balance (deposit token)
      const tokenAAddress = await getAssociatedTokenAddress(depositTokenMint, publicKey)
      let tokenABalance = 0
      try {
        const account = await getAccount(connection, tokenAAddress)
        const mintInfo = await getMint(connection, depositTokenMint)
        tokenABalance = Number(account.amount) / (10 ** mintInfo.decimals)
      } catch { }

      // Fetch token B balance (rewards token)
      const tokenBAddress = await getAssociatedTokenAddress(rewardsTokenMint, publicKey)
      let tokenBBalance = 0
      try {
        const account = await getAccount(connection, tokenBAddress)
        const mintInfo = await getMint(connection, rewardsTokenMint)
        tokenBBalance = Number(account.amount) / (10 ** mintInfo.decimals)
      } catch { }

      // Fetch stake entry data
      const [stakeEntryAddress] = await calculateStakeEntryPda(publicKey, poolAddress)
      const stakeEntryData = await (state.program.account as any).stakeEntry.fetchNullable(stakeEntryAddress)

      // Fetch stake pool data for APY calculation
      const stakePoolData = await (state.program.account as any).stakePool.fetchNullable(poolAddress)

      let stakedBalance = 0
      let estimatedRewards = 0
      let apy = 0

      if (stakeEntryData) {
        stakedBalance = fromTokenAmount(stakeEntryData.balance)

        // Calculate estimated rewards
        if (stakePoolData) {
          const poolBalance = fromTokenAmount(stakePoolData.balance)
          const interval = (Date.now() / 1e3) - stakePoolData.lastUpdateTimestamp.toNumber()
          
          // Calculate current rewards per token
          let rewardsPerToken = fromTokenAmount(stakePoolData.rewardsPerTokenStored)
          if (poolBalance > 0) {
            // Only add new rewards if pool has balance (avoid division by zero)
            rewardsPerToken += (interval * fromTokenAmount(stakePoolData.rewardsPerSecond) / poolBalance)
          }
          
          const prevRewardsPerToken = fromTokenAmount(stakeEntryData.rewardsPerTokenPaid)
          const entryBalance = fromTokenAmount(stakeEntryData.balance)
          
          // Calculate estimated rewards
          estimatedRewards = fromTokenAmount(stakeEntryData.rewards) +
            (rewardsPerToken - prevRewardsPerToken) * entryBalance
          
          // Ensure estimatedRewards is not NaN
          if (isNaN(estimatedRewards) || !isFinite(estimatedRewards)) {
            estimatedRewards = fromTokenAmount(stakeEntryData.rewards)
          }
        }
      }

      // Calculate APY: (rewardsPerSecond * 3600 * 365) / poolBalance
      if (stakePoolData) {
        const poolBalance = fromTokenAmount(stakePoolData.balance)
        const rewardsPerSecond = fromTokenAmount(stakePoolData.rewardsPerSecond)
        
        if (poolBalance > 0) {
          // APY formula as specified: (rewardsPerSecond * 3600 * 365) / poolBalance
          const annualRewards = rewardsPerSecond * 3600 * 365
          apy = (annualRewards / poolBalance) * 100 // Convert to percentage
          
          // Ensure APY is not NaN or Infinity
          if (isNaN(apy) || !isFinite(apy)) {
            apy = 0
          }
        }
      }

      setState(prev => ({
        ...prev,
        walletBalance: tokenABalance,
        stakedBalance,
        estimatedBalance: estimatedRewards,
        tokenBBalance,
        apy,
      }))
    } catch (error) {
      console.error('Error loading state:', error)
    }
  }, [connected, publicKey, connection, state.program, poolId])

  // Refresh state periodically
  useEffect(() => {
    if (!connected || !publicKey || !state.program) return

    loadState()
    const interval = setInterval(loadState, 5000)
    return () => clearInterval(interval)
  }, [loadState, connected, publicKey, state.program])

  const stake = useCallback(async (amount: number) => {
    if (!connected || !publicKey || !state.program || !signTransaction) {
      throw new Error('Wallet not connected')
    }

    try {
      const poolConfig = getPoolConfig(poolId)
      const { depositTokenMint, poolAddress } = poolConfig

      const [stakeEntryAddress] = await calculateStakeEntryPda(publicKey, poolAddress)
      const stakeEntry = await (state.program.account as any).stakeEntry.fetchNullable(stakeEntryAddress)

      const tx = new web3.Transaction()

      if (!stakeEntry) {
        const stakeEntryIx = await createStakeEntryIx(publicKey, poolAddress)
        tx.add(stakeEntryIx)
      }

      const stakeIx = await createStakeIx(
        publicKey,
        depositTokenMint,
        tokenAmount(amount),
        poolAddress
      )
      tx.add(stakeIx)

      const blockhash = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash.blockhash
      tx.feePayer = publicKey

      const signedTx = await signTransaction(tx)
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
      })
      await connection.confirmTransaction(signature)

      await loadState()
    } catch (error) {
      console.error('Stake error:', error)
      throw error
    }
  }, [connected, publicKey, state.program, signTransaction, connection, loadState, poolId])

  const unstake = useCallback(async (amount: number) => {
    if (!connected || !publicKey || !state.program || !signTransaction) {
      throw new Error('Wallet not connected')
    }

    try {
      const poolConfig = getPoolConfig(poolId)
      const { depositTokenMint, poolAddress } = poolConfig

      const unstakeIx = await createUnstakeIx(
        publicKey,
        depositTokenMint,
        tokenAmount(amount),
        poolAddress
      )

      const tx = new web3.Transaction().add(unstakeIx)
      const blockhash = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash.blockhash
      tx.feePayer = publicKey

      const signedTx = await signTransaction(tx)
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
      })
      await connection.confirmTransaction(signature)

      await loadState()
    } catch (error) {
      console.error('Unstake error:', error)
      throw error
    }
  }, [connected, publicKey, state.program, signTransaction, connection, loadState, poolId])

  const claimRewards = useCallback(async () => {
    if (!connected || !publicKey || !state.program || !signTransaction) {
      throw new Error('Wallet not connected')
    }

    try {
      const poolConfig = getPoolConfig(poolId)
      const { rewardsTokenMint, poolAddress } = poolConfig

      const tx = new web3.Transaction()

      // Create associated token account if needed
      if (!state.tokenBBalance) {
        const associatedAddress = await getAssociatedTokenAddress(rewardsTokenMint, publicKey)
        const ix = createAssociatedTokenAccountInstruction(
          publicKey,
          associatedAddress,
          publicKey,
          rewardsTokenMint
        )
        tx.add(ix)
      }

      const claimIx = await createClaimRewardsIx(
        publicKey,
        rewardsTokenMint,
        poolAddress
      )
      tx.add(claimIx)

      const blockhash = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash.blockhash
      tx.feePayer = publicKey

      const signedTx = await signTransaction(tx)
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
      })
      await connection.confirmTransaction(signature)

      await loadState()
    } catch (error) {
      console.error('Claim rewards error:', error)
      throw error
    }
  }, [connected, publicKey, state.program, state.tokenBBalance, signTransaction, connection, loadState, poolId])

  return {
    ...state,
    loadState,
    stake,
    unstake,
    claimRewards,
  }
}