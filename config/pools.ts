import { web3 } from "@project-serum/anchor";

export interface PoolConfig {
  poolId: number;
  depositTokenMint: web3.PublicKey;
  rewardsTokenMint: web3.PublicKey;
  poolAddress: web3.PublicKey;
}

// Token addresses
const RONALDO_TOKEN = new web3.PublicKey("7afWHBHqnD8haciY1Nc8c9ZqiUTsGJJdxPyjUupjeqRB");
const MESSI_TOKEN = new web3.PublicKey("FS9TJ5QXGampybVRh439SKWb8fogtaYaBi8JzmzXCBLH");
const USDC_TOKEN = new web3.PublicKey("FZQzoktboHoszYrY92wMsbtH6cSzBjdScvwPaEuG3buv");

// Pool addresses (already created on Solana)
const RONALDO_STAKE_POOL_ADDRESS = new web3.PublicKey("FRw7Rryv77ks4Q41kgihdKZWsq5fvunYPZnZVFgvCbRy");
const MESSI_STAKE_POOL_ADDRESS = new web3.PublicKey("217XCPcaqnG5s26xnQ5LZ7bd4tAMqP8gUyk37CncdzvV");
const USDC_STAKE_POOL_ADDRESS = new web3.PublicKey("6oVuUywwbNaL61YNJoLeUM7W5fumSvmWXWGDoVVxuSwe");

export const POOLS: PoolConfig[] = [
  {
    poolId: 1,
    depositTokenMint: RONALDO_TOKEN,
    rewardsTokenMint: USDC_TOKEN,
    poolAddress: RONALDO_STAKE_POOL_ADDRESS,
  },
  {
    poolId: 2,
    depositTokenMint: MESSI_TOKEN,
    rewardsTokenMint: USDC_TOKEN,
    poolAddress: MESSI_STAKE_POOL_ADDRESS,
  },
  {
    poolId: 3,
    depositTokenMint: USDC_TOKEN,
    rewardsTokenMint: USDC_TOKEN,
    poolAddress: USDC_STAKE_POOL_ADDRESS,
  },
];

export function getPoolConfig(poolId: number): PoolConfig {
  const pool = POOLS.find(p => p.poolId === poolId);
  if (!pool) {
    throw new Error(`Pool with ID ${poolId} not found`);
  }
  return pool;
}

