import { AnchorProvider, Program, web3 } from "@project-serum/anchor";
import { AppState } from "./state";
import { getPhantomAdapter } from "./walletAdapter";
import phantomAdapter from "@solana/wallet-adapter-phantom";
import * as artifacts from "../idl/wmp_staking";
import { WMP_STAKING_PROGRAM_ID } from "../program/program-id";
import { calculateStakeEntryPda } from "../program/pda";
import { createClaimRewardsIx, createStakeEntryIx, createStakeIx, createUnstakeIx, setProgram } from "../program/instructions";
import { tokenAmount } from "../program/utils";
import { render } from "./render";
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } from "@solana/spl-token";

export function registerHandlers() {
    document.querySelector("#connect-wallet button")?.addEventListener("click", connectWalletHahdler);
    
    // Find the stake button - it's the .btn-primary button that comes before the unstake card
    const stakingSection = document.querySelector(".staking-section");
    if (stakingSection) {
        const stakeButton = stakingSection.querySelector(".btn-primary");
        const unstakeButton = stakingSection.querySelector(".btn-secondary");
        
        stakeButton?.addEventListener("click", stakeHandler);
        unstakeButton?.addEventListener("click", unstakeHandler);
    }
    
    document.querySelector("#get-rewards")?.addEventListener("click", getRewardsHandler);
}

async function connectWalletHahdler() {
    let adapter = getPhantomAdapter();
    if (!adapter) {
        alert("Phantom wallet is not installed. Please install Phantom wallet to continue.");
        return;
    }
    
    await adapter.connect();

    AppState.adapter = adapter;
    let provider = new AnchorProvider(AppState.connection, adapter, {commitment: "confirmed"});
    
    AppState.provider = provider;
    AppState.program = new Program<artifacts.WmpStaking>(artifacts.IDL, WMP_STAKING_PROGRAM_ID, provider);
    AppState.walletConnected = true;
    setProgram(AppState.program);
    render();
}

async function stakeHandler() {
    let amount = parseFloat((document.querySelector('input[name="stake-amount"]') as HTMLInputElement).value);
    let [stakeEntryAddress, _] = await calculateStakeEntryPda(AppState.adapter.publicKey, AppState.stakePoolAddress);
    let stakeEntry = await AppState.program.account.stakeEntry.fetchNullable(stakeEntryAddress);
    let tx = new web3.Transaction();
    if (stakeEntry == null) {
        let stakeEntryIx = await createStakeEntryIx(AppState.adapter.publicKey, AppState.stakePoolAddress);
        tx.add(stakeEntryIx);
    }

    let stakeIx = await createStakeIx(AppState.adapter.publicKey, AppState.tokenAAddress, tokenAmount(amount), AppState.stakePoolAddress);
    tx.add(stakeIx);

    let hash = await sendTransaction(tx);
    await AppState.connection.confirmTransaction(hash);

    render();
}

async function unstakeHandler() {
    let amount = parseFloat((document.querySelector('input[name="unstake-amount"]') as HTMLInputElement).value);

    let unstakeIx = await createUnstakeIx(AppState.adapter.publicKey, AppState.tokenAAddress, tokenAmount(amount), AppState.stakePoolAddress);
    let tx = new web3.Transaction().add(unstakeIx);

    let hash = await sendTransaction(tx);
    await AppState.connection.confirmTransaction(hash);

    render();
}

async function getRewardsHandler() {
    let tx = new web3.Transaction();
    if (!AppState.tokenBBalance) {
        let associatedAddress = await getAssociatedTokenAddress(AppState.tokenBAddress, AppState.adapter.publicKey);
        let ix = createAssociatedTokenAccountInstruction(AppState.adapter.publicKey, associatedAddress, AppState.adapter.publicKey, AppState.tokenBAddress);
        tx.add(ix);
    }

    let ix = await createClaimRewardsIx(AppState.adapter.publicKey, AppState.tokenBAddress, AppState.stakePoolAddress);
    tx.add(ix);

    let hash = await sendTransaction(tx);
    await AppState.connection.confirmTransaction(hash);

    render();
}

export async function sendTransaction(transaction: web3.Transaction): Promise<string> {
    transaction.recentBlockhash = (await AppState.connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = AppState.adapter.publicKey;

    let tx = await AppState.adapter.signTransaction(transaction);
    return await AppState.connection.sendRawTransaction(tx.serialize(), {skipPreflight: true});
}
