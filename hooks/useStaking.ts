import { useState, useCallback, useEffect } from "react";
import { web3, Program, AnchorProvider } from "@project-serum/anchor";

import { calculateStakeEntryPda } from "@/program/pda";
import { fromTokenAmount, tokenAmount } from "@/program/utils";
import { getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { createStakeEntryIx, createStakeIx, createUnstakeIx, createClaimRewardsIx, setProgram } from "@/program/instructions";

import { WmpStaking, IDL } from "@/idl/wmp_staking";
import { WMP_STAKING_PROGRAM_ID } from "@/program/program-id";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

const TOKEN_A_ADDRESS = new web3.PublicKey("FZQzoktboHoszYrY92wMsbtH6cSzBjdScvwPaEuG3buv");
const TOKEN_B_ADDRESS = new web3.PublicKey("7afWHBHqnD8haciY1Nc8c9ZqiUTsGJJdxPyjUupjeqRB");
const STAKE_POOL_ADDRESS = new web3.PublicKey("6djiwf1CDgdDr5nbPxYSs3jGASFKkFLNLKSnV381KgP5");


export interface StakingState {
    walletBalance: number,
    stakedBalance: number,
    estimatedBalance: number,
    tokenBBalance: number,
    isLoading: boolean,
    program: Program<WmpStaking> | null,
}

export function useStaking() {
    const { publicKey, connected, signTransaction } = useWallet();
    const { connection } = useConnection();
    const [state, setState] = useState<StakingState>({
        walletBalance: 0,
        stakedBalance: 0,
        estimatedBalance: 0,
        tokenBBalance: 0,
        isLoading: false,
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
            setState(prev => ({ ...prev, isLoading: true }))

            // Fetch token A balance
            const tokenAAddress = await getAssociatedTokenAddress(TOKEN_A_ADDRESS, publicKey)
            let tokenABalance = 0
            try {
                const account = await getAccount(connection, tokenAAddress)
                tokenABalance = Number(account.amount) / 1e9
            } catch { }

            // Fetch token B balance
            const tokenBAddress = await getAssociatedTokenAddress(TOKEN_B_ADDRESS, publicKey)
            let tokenBBalance = 0
            try {
                const account = await getAccount(connection, tokenBAddress)
                tokenBBalance = Number(account.amount) / 1e9
            } catch { }

            // Fetch stake entry data
            const [stakeEntryAddress] = await calculateStakeEntryPda(publicKey, STAKE_POOL_ADDRESS)
            const stakeEntryData = await (state.program.account as any).stakeEntry.fetchNullable(stakeEntryAddress)

            let stakedBalance = 0
            let estimatedRewards = 0

            if (stakeEntryData) {
                stakedBalance = fromTokenAmount(stakeEntryData.balance)

                // Calculate estimated rewards
                const stakePoolData = await (state.program.account as any).stakePool.fetchNullable(STAKE_POOL_ADDRESS)
                if (stakePoolData) {
                    const interval = (Date.now() / 1e3) - stakePoolData.lastUpdateTimestamp.toNumber()
                    const rewardsPerToken = fromTokenAmount(stakePoolData.rewardsPerTokenStored) +
                        (interval * fromTokenAmount(stakePoolData.rewardsPerSecond) / fromTokenAmount(stakePoolData.balance))
                    const prevRewardsPerToken = fromTokenAmount(stakeEntryData.rewardsPerTokenPaid)
                    estimatedRewards = fromTokenAmount(stakeEntryData.rewards) +
                        (rewardsPerToken - prevRewardsPerToken) * fromTokenAmount(stakeEntryData.balance)
                }
            }

            setState(prev => ({
                ...prev,
                walletBalance: tokenABalance,
                stakedBalance,
                estimatedBalance: estimatedRewards,
                tokenBBalance,
                isLoading: false,
            }))
        } catch (error) {
            console.error('Error loading state:', error)
            setState(prev => ({ ...prev, isLoading: false }))
        }
    }, [connected, publicKey, connection, state.program])

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
          setState(prev => ({ ...prev, isLoading: true }))
    
          const [stakeEntryAddress] = await calculateStakeEntryPda(publicKey, STAKE_POOL_ADDRESS)
          const stakeEntry = await (state.program.account as any).stakeEntry.fetchNullable(stakeEntryAddress)
    
          const tx = new web3.Transaction()
          
          if (!stakeEntry) {
            const stakeEntryIx = await createStakeEntryIx(publicKey, STAKE_POOL_ADDRESS)
            tx.add(stakeEntryIx)
          }
    
          const stakeIx = await createStakeIx(
            publicKey,
            TOKEN_A_ADDRESS,
            tokenAmount(amount),
            STAKE_POOL_ADDRESS
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
        } finally {
          setState(prev => ({ ...prev, isLoading: false }))
        }
      }, [connected, publicKey, state.program, signTransaction, connection, loadState])
    
      const unstake = useCallback(async (amount: number) => {
        if (!connected || !publicKey || !state.program || !signTransaction) {
          throw new Error('Wallet not connected')
        }
    
        try {
          setState(prev => ({ ...prev, isLoading: true }))
    
          const unstakeIx = await createUnstakeIx(
            publicKey,
            TOKEN_A_ADDRESS,
            tokenAmount(amount),
            STAKE_POOL_ADDRESS
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
        } finally {
          setState(prev => ({ ...prev, isLoading: false }))
        }
      }, [connected, publicKey, state.program, signTransaction, connection, loadState])
    
      const claimRewards = useCallback(async () => {
        if (!connected || !publicKey || !state.program || !signTransaction) {
          throw new Error('Wallet not connected')
        }
    
        try {
          setState(prev => ({ ...prev, isLoading: true }))
    
          const tx = new web3.Transaction()
    
          // Create associated token account if needed
          if (!state.tokenBBalance) {
            const associatedAddress = await getAssociatedTokenAddress(TOKEN_B_ADDRESS, publicKey)
            const ix = createAssociatedTokenAccountInstruction(
              publicKey,
              associatedAddress,
              publicKey,
              TOKEN_B_ADDRESS
            )
            tx.add(ix)
          }
    
          const claimIx = await createClaimRewardsIx(
            publicKey,
            TOKEN_B_ADDRESS,
            STAKE_POOL_ADDRESS
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
        } finally {
          setState(prev => ({ ...prev, isLoading: false }))
        }
      }, [connected, publicKey, state.program, state.tokenBBalance, signTransaction, connection, loadState])
    
    return {
        ...state,
        loadState,
        stake,
        unstake,
        claimRewards,
    }
}