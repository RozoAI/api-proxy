/**
 * Chain Configuration
 * Maps chain IDs to providers and supported tokens
 */

export interface ChainConfig {
  chainId: number;
  name: string;
  provider: string;
  fallbackProvider?: string;
  enabled: boolean;
  tokens?: string[];
  description?: string;
}

export interface TokenConfig {
  symbol: string;
  name: string;
  address?: string;
  decimals: number;
  chainId: number;
  provider: string;
}

// Comprehensive chain configurations
export const chainConfigs: ChainConfig[] = [
  // Ethereum Mainnet
  {
    chainId: 1,
    name: 'Ethereum',
    provider: 'daimo',
    enabled: true,
    tokens: ['ETH', 'USDC', 'USDT', 'DAI', 'WETH'],
    description: 'Ethereum mainnet',
  },

  // Optimism
  {
    chainId: 10,
    name: 'Optimism',
    provider: 'daimo',
    enabled: true,
    tokens: ['ETH', 'USDC', 'USDT', 'DAI', 'WETH'],
    description: 'Optimism L2',
  },

  // Polygon
  {
    chainId: 137,
    name: 'Polygon',
    provider: 'daimo',
    enabled: true,
    tokens: ['MATIC', 'USDC', 'USDT', 'DAI', 'WMATIC'],
    description: 'Polygon PoS',
  },

  // Arbitrum One
  {
    chainId: 42161,
    name: 'Arbitrum One',
    provider: 'daimo',
    enabled: true,
    tokens: ['ETH', 'USDC', 'USDT', 'DAI', 'WETH'],
    description: 'Arbitrum One L2',
  },

  // Base
  {
    chainId: 8453,
    name: 'Base',
    provider: 'daimo',
    enabled: true,
    tokens: ['ETH', 'USDC', 'USDT', 'DAI', 'WETH'],
    description: 'Base L2',
  },

  // BSC
  {
    chainId: 56,
    name: 'BNB Smart Chain',
    provider: 'daimo',
    enabled: true,
    tokens: ['BNB', 'USDC', 'USDT', 'BUSD', 'WBNB'],
    description: 'BNB Smart Chain',
  },

  // Avalanche C-Chain
  {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    provider: 'daimo',
    enabled: true,
    tokens: ['AVAX', 'USDC', 'USDT', 'DAI', 'WAVAX'],
    description: 'Avalanche C-Chain',
  },

  // Fantom
  {
    chainId: 250,
    name: 'Fantom',
    provider: 'daimo',
    enabled: true,
    tokens: ['FTM', 'USDC', 'USDT', 'DAI', 'WFTM'],
    description: 'Fantom Opera',
  },

  // Filecoin
  {
    chainId: 314,
    name: 'Filecoin',
    provider: 'daimo',
    enabled: true,
    tokens: ['FIL', 'USDC', 'USDT'],
    description: 'Filecoin mainnet',
  },

  // Celo
  {
    chainId: 42220,
    name: 'Celo',
    provider: 'daimo',
    enabled: true,
    tokens: ['CELO', 'USDC', 'USDT', 'cUSD', 'cEUR'],
    description: 'Celo mainnet',
  },

  // Gnosis Chain
  {
    chainId: 100,
    name: 'Gnosis Chain',
    provider: 'daimo',
    enabled: true,
    tokens: ['XDAI', 'USDC', 'USDT', 'WXDAI'],
    description: 'Gnosis Chain (formerly xDai)',
  },

  // Polygon zkEVM
  {
    chainId: 1101,
    name: 'Polygon zkEVM',
    provider: 'daimo',
    enabled: true,
    tokens: ['ETH', 'USDC', 'USDT', 'DAI'],
    description: 'Polygon zkEVM',
  },

  // Linea
  {
    chainId: 59144,
    name: 'Linea',
    provider: 'daimo',
    enabled: true,
    tokens: ['ETH', 'USDC', 'USDT', 'DAI'],
    description: 'Linea mainnet',
  },

  // Mantle
  {
    chainId: 5000,
    name: 'Mantle',
    provider: 'daimo',
    enabled: true,
    tokens: ['MNT', 'USDC', 'USDT', 'DAI'],
    description: 'Mantle mainnet',
  },

  // Scroll
  {
    chainId: 534352,
    name: 'Scroll',
    provider: 'daimo',
    enabled: true,
    tokens: ['ETH', 'USDC', 'USDT', 'DAI'],
    description: 'Scroll mainnet',
  },

  // zkSync Era
  {
    chainId: 324,
    name: 'zkSync Era',
    provider: 'daimo',
    enabled: true,
    tokens: ['ETH', 'USDC', 'USDT', 'DAI'],
    description: 'zkSync Era mainnet',
  },

  // ===== AQUA PROVIDER CHAINS =====

  // Stellar (Single Chain ID for Aqua)
  {
    chainId: 10001,
    name: 'Stellar',
    provider: 'aqua',
    enabled: true,
    tokens: ['XLM', 'USDC_XLM'],
    description: 'Stellar via Aqua Payment Detection Service',
  },

  // ===== FUTURE AQUA CHAINS =====
  // These can be enabled when you add more chains to Aqua

  // Example: Solana (if you add it to Aqua later)
  {
    chainId: 10002,
    name: 'Solana',
    provider: 'aqua',
    enabled: false, // Disabled until implemented
    tokens: ['SOL'],
    description: 'Solana via Aqua Payment Detection Service',
  },

  // Example: Cardano (if you add it to Aqua later)
  {
    chainId: 10003,
    name: 'Cardano',
    provider: 'aqua',
    enabled: false, // Disabled until implemented
    tokens: ['ADA'],
    description: 'Cardano via Aqua Payment Detection Service',
  },
];

// Token configurations with detailed information
export const tokenConfigs: TokenConfig[] = [
  // Ethereum Mainnet Tokens
  { symbol: 'ETH', name: 'Ethereum', decimals: 18, chainId: 1, provider: 'daimo' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 1, provider: 'daimo' },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 1, provider: 'daimo' },
  { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chainId: 1, provider: 'daimo' },
  { symbol: 'WETH', name: 'Wrapped Ethereum', decimals: 18, chainId: 1, provider: 'daimo' },

  // Optimism Tokens
  { symbol: 'ETH', name: 'Ethereum', decimals: 18, chainId: 10, provider: 'daimo' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 10, provider: 'daimo' },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 10, provider: 'daimo' },
  { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chainId: 10, provider: 'daimo' },
  { symbol: 'WETH', name: 'Wrapped Ethereum', decimals: 18, chainId: 10, provider: 'daimo' },

  // Polygon Tokens
  { symbol: 'MATIC', name: 'Polygon', decimals: 18, chainId: 137, provider: 'daimo' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 137, provider: 'daimo' },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 137, provider: 'daimo' },
  { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chainId: 137, provider: 'daimo' },
  { symbol: 'WMATIC', name: 'Wrapped Polygon', decimals: 18, chainId: 137, provider: 'daimo' },

  // Base Tokens
  { symbol: 'ETH', name: 'Ethereum', decimals: 18, chainId: 8453, provider: 'daimo' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 8453, provider: 'daimo' },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 8453, provider: 'daimo' },
  { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chainId: 8453, provider: 'daimo' },
  { symbol: 'WETH', name: 'Wrapped Ethereum', decimals: 18, chainId: 8453, provider: 'daimo' },

  // BSC Tokens
  { symbol: 'BNB', name: 'BNB', decimals: 18, chainId: 56, provider: 'daimo' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 18, chainId: 56, provider: 'daimo' },
  { symbol: 'USDT', name: 'Tether USD', decimals: 18, chainId: 56, provider: 'daimo' },
  { symbol: 'BUSD', name: 'Binance USD', decimals: 18, chainId: 56, provider: 'daimo' },
  { symbol: 'WBNB', name: 'Wrapped BNB', decimals: 18, chainId: 56, provider: 'daimo' },

  // Avalanche Tokens
  { symbol: 'AVAX', name: 'Avalanche', decimals: 18, chainId: 43114, provider: 'daimo' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 43114, provider: 'daimo' },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 43114, provider: 'daimo' },
  { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chainId: 43114, provider: 'daimo' },
  { symbol: 'WAVAX', name: 'Wrapped Avalanche', decimals: 18, chainId: 43114, provider: 'daimo' },

  // Fantom Tokens
  { symbol: 'FTM', name: 'Fantom', decimals: 18, chainId: 250, provider: 'daimo' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 250, provider: 'daimo' },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 250, provider: 'daimo' },
  { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, chainId: 250, provider: 'daimo' },
  { symbol: 'WFTM', name: 'Wrapped Fantom', decimals: 18, chainId: 250, provider: 'daimo' },

  // Filecoin Tokens
  { symbol: 'FIL', name: 'Filecoin', decimals: 18, chainId: 314, provider: 'daimo' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 314, provider: 'daimo' },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 314, provider: 'daimo' },

  // Celo Tokens
  { symbol: 'CELO', name: 'Celo', decimals: 18, chainId: 42220, provider: 'daimo' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 42220, provider: 'daimo' },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 42220, provider: 'daimo' },
  { symbol: 'cUSD', name: 'Celo Dollar', decimals: 18, chainId: 42220, provider: 'daimo' },
  { symbol: 'cEUR', name: 'Celo Euro', decimals: 18, chainId: 42220, provider: 'daimo' },

  // Gnosis Chain Tokens
  { symbol: 'XDAI', name: 'xDai', decimals: 18, chainId: 100, provider: 'daimo' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 100, provider: 'daimo' },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, chainId: 100, provider: 'daimo' },
  { symbol: 'WXDAI', name: 'Wrapped xDai', decimals: 18, chainId: 100, provider: 'daimo' },

  // ===== AQUA PROVIDER TOKENS =====

  // Stellar Tokens (same chain, different symbols)
  { symbol: 'XLM', name: 'Stellar Lumens', decimals: 7, chainId: 10001, provider: 'aqua' },
  { symbol: 'USDC_XLM', name: 'USD Coin (Stellar)', decimals: 7, chainId: 10001, provider: 'aqua' },
];

// Utility functions
export const getChainConfig = (chainId: number): ChainConfig | undefined => {
  return chainConfigs.find((chain) => chain.chainId === chainId);
};

export const getProviderForChain = (chainId: number): string | null => {
  const chain = getChainConfig(chainId);
  return chain?.enabled ? chain.provider : null;
};

export const getTokensForChain = (chainId: number): string[] => {
  const chain = getChainConfig(chainId);
  return chain?.tokens || [];
};

export const isChainEnabled = (chainId: number): boolean => {
  const chain = getChainConfig(chainId);
  return chain?.enabled || false;
};

export const getEnabledChains = (): ChainConfig[] => {
  return chainConfigs.filter((chain) => chain.enabled);
};

export const getChainsByProvider = (provider: string): ChainConfig[] => {
  return chainConfigs.filter((chain) => chain.provider === provider && chain.enabled);
};

// Chain ID constants for easy reference
export const CHAIN_IDS = {
  // Daimo Provider Chains
  ETHEREUM: 1,
  OPTIMISM: 10,
  POLYGON: 137,
  ARBITRUM: 42161,
  BASE: 8453,
  BSC: 56,
  AVALANCHE: 43114,
  FANTOM: 250,
  FILECOIN: 314,
  CELO: 42220,
  GNOSIS: 100,
  POLYGON_ZKEVM: 1101,
  LINEA: 59144,
  MANTLE: 5000,
  SCROLL: 534352,
  ZKSYNC: 324,

  // Aqua Provider Chains
  STELLAR: 10001,

  // Future Aqua Chains (disabled)
  SOLANA: 10002,
  CARDANO: 10003,
} as const;

// Provider constants
export const PROVIDERS = {
  DAIMO: 'daimo',
  AQUA: 'aqua',
} as const;

export type ProviderType = (typeof PROVIDERS)[keyof typeof PROVIDERS];
export type ChainIdType = (typeof CHAIN_IDS)[keyof typeof CHAIN_IDS];
