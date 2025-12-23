import { Program, web3 } from "@project-serum/anchor";
import { associatedAddress, TOKEN_PROGRAM_ID } from "@project-serum/anchor/dist/cjs/utils/token";
import { ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { calculateGlobalDataPda, calculateStakeEntryPda, calculateStakePoolPda, calculateEscrowA, calculateEscrowB } from "./pda";
import { WmpStaking } from "../idl/wmp_staking";

export async function getInitializeAccounts(admin: web3.PublicKey) {
    let globalDataPda = await calculateGlobalDataPda();
    return {
        admin,
        globalData: globalDataPda[0],
        systemProgram: web3.SystemProgram.programId
    }
}

export async function getSetStakePoolRewardsAccounts(admin: web3.PublicKey, stakePool: web3.PublicKey) {
    return {
        admin,
        stakePool
    }
}

export async function getCreateStakePoolAccounts(
    creator: web3.PublicKey,
    mintA: web3.PublicKey,
    mintB: web3.PublicKey,
    id: number) {
    let globalDataPda = await calculateGlobalDataPda();
    let stakePoolPda = await calculateStakePoolPda(id);
    let escrowA = await calculateEscrowA(creator, mintA, stakePoolPda[0]);
    let escrowB = await calculateEscrowB(creator, mintB, stakePoolPda[0]);

    return {
        creator: creator,
        mintA: mintA,
        mintB: mintB,
        globalData: globalDataPda[0],
        escrowA: escrowA[0],
        escrowB: escrowB[0],
        stakePool: stakePoolPda[0],
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY
    }
}

export async function getCreateStakeEntryAccounts(
    user: web3.PublicKey,
    stakePool: web3.PublicKey) {
    let globalDataPda = await calculateGlobalDataPda();
    let stakeEntryPda = await calculateStakeEntryPda(user, stakePool);

    return {
        user: user,
        globalData: globalDataPda[0],
        stakePool: stakePool,
        stakeEntry: stakeEntryPda[0],
        systemProgram: web3.SystemProgram.programId
    }
}

export async function getStakeAccounts(
    user: web3.PublicKey,
    stakePool: web3.PublicKey,
    mintA: web3.PublicKey,
    program: Program<WmpStaking>) {
    let stakeEntryPda = await calculateStakeEntryPda(user, stakePool);
    let escrowA = await calculateEscrowA(user, mintA, stakePool);
    let stakerTokenA = await associatedAddress({mint: mintA, owner: user});
    
    let stakePoolData = await program.account.stakePool.fetchNullable(stakePool);
    if (!stakePoolData) {
        throw new Error("Stake pool not found");
    }
    let admin = stakePoolData.creator;
    
    // Calculate admin's token account for mintA
    let adminTokenAccount = await associatedAddress({mint: mintA, owner: admin});
    
    return {
        staker: user,
        stakePool: stakePool,
        stakeEntry: stakeEntryPda[0],
        stakerTokenA: stakerTokenA,
        escrowA: escrowA[0],
        adminTokenAccount: adminTokenAccount,
        mintA: mintA,
        tokenProgram: TOKEN_PROGRAM_ID
    }
}

export async function getUnstakeAccounts(
    user: web3.PublicKey,
    stakePool: web3.PublicKey,
    mintA: web3.PublicKey,
    program: Program<WmpStaking>) {
    let stakeEntryPda = await calculateStakeEntryPda(user, stakePool);
    let escrowA = await calculateEscrowA(user, mintA, stakePool);
    let stakerTokenA = await associatedAddress({mint: mintA, owner: user});

    let stakePoolData = await program.account.stakePool.fetchNullable(stakePool);
    if (!stakePoolData) {
        throw new Error("Stake pool not found");
    }
    let admin = stakePoolData.creator;
    
    // Calculate admin's token account for mintA
    let adminTokenAccount = await associatedAddress({mint: mintA, owner: admin});
    
    return {
        staker: user,
        stakePool: stakePool,
        stakeEntry: stakeEntryPda[0],
        stakerTokenA: stakerTokenA,
        escrowA: escrowA[0],
        adminTokenAccount: adminTokenAccount,
        mintA: mintA,
        tokenProgram: TOKEN_PROGRAM_ID
    }
}

export async function getClaimRewardsAccounts(
    user: web3.PublicKey,
    stakePool: web3.PublicKey,
    mintB: web3.PublicKey) {
    let stakeEntryPda = await calculateStakeEntryPda(user, stakePool);
    let escrowB = await calculateEscrowB(user, mintB, stakePool);
    let stakerB = await associatedAddress({mint: mintB, owner: user});
    return {
        staker: user,
        stakePool: stakePool,
        stakeEntry: stakeEntryPda[0],
        stakerB: stakerB,
        escrowB: escrowB[0],
        mintB: mintB,
        tokenProgram: TOKEN_PROGRAM_ID
    }
}