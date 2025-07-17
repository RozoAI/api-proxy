/**
 * Routing Configuration
 * Defines how requests are routed between different providers
 */

import { CHAIN_IDS } from './chains';
import { PROVIDER_NAMES } from './providers';

export interface RoutingRule {
  chainId: number;
  provider: string;
  fallbackProvider?: string;
  enabled: boolean;
  priority: number;
  description?: string;
}

export interface RoutingConfig {
  defaultProvider: string;
  enableFallback: boolean;
  maxRetries: number;
  timeout: number;
  enableHealthChecks: boolean;
  healthCheckInterval: number; // in milliseconds
}

// Default routing configuration
export const routingConfig: RoutingConfig = {
  defaultProvider: PROVIDER_NAMES.DAIMO,
  enableFallback: true,
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  enableHealthChecks: true,
  healthCheckInterval: 60000, // 1 minute
};

// Routing rules based on chain ID
export const routingRules: RoutingRule[] = [
  // Daimo Provider Chains (existing chains)
  {
    chainId: CHAIN_IDS.ETHEREUM,
    provider: PROVIDER_NAMES.DAIMO,
    enabled: true,
    priority: 1,
    description: 'Ethereum mainnet via Daimo',
  },
  {
    chainId: CHAIN_IDS.OPTIMISM,
    provider: PROVIDER_NAMES.DAIMO,
    enabled: true,
    priority: 1,
    description: 'Optimism L2 via Daimo',
  },
  {
    chainId: CHAIN_IDS.POLYGON,
    provider: PROVIDER_NAMES.DAIMO,
    enabled: true,
    priority: 1,
    description: 'Polygon PoS via Daimo',
  },
  {
    chainId: CHAIN_IDS.ARBITRUM,
    provider: PROVIDER_NAMES.DAIMO,
    enabled: true,
    priority: 1,
    description: 'Arbitrum One via Daimo',
  },
  {
    chainId: CHAIN_IDS.BASE,
    provider: PROVIDER_NAMES.DAIMO,
    enabled: true,
    priority: 1,
    description: 'Base L2 via Daimo',
  },
  {
    chainId: CHAIN_IDS.BSC,
    provider: PROVIDER_NAMES.DAIMO,
    enabled: true,
    priority: 1,
    description: 'BNB Smart Chain via Daimo',
  },
  {
    chainId: CHAIN_IDS.AVALANCHE,
    provider: PROVIDER_NAMES.DAIMO,
    enabled: true,
    priority: 1,
    description: 'Avalanche C-Chain via Daimo',
  },
  {
    chainId: CHAIN_IDS.FANTOM,
    provider: PROVIDER_NAMES.DAIMO,
    enabled: true,
    priority: 1,
    description: 'Fantom Opera via Daimo',
  },
  {
    chainId: CHAIN_IDS.FILECOIN,
    provider: PROVIDER_NAMES.DAIMO,
    enabled: true,
    priority: 1,
    description: 'Filecoin mainnet via Daimo',
  },
  {
    chainId: CHAIN_IDS.CELO,
    provider: PROVIDER_NAMES.DAIMO,
    enabled: true,
    priority: 1,
    description: 'Celo mainnet via Daimo',
  },
  {
    chainId: CHAIN_IDS.GNOSIS,
    provider: PROVIDER_NAMES.DAIMO,
    enabled: true,
    priority: 1,
    description: 'Gnosis Chain via Daimo',
  },
  {
    chainId: CHAIN_IDS.POLYGON_ZKEVM,
    provider: PROVIDER_NAMES.DAIMO,
    enabled: true,
    priority: 1,
    description: 'Polygon zkEVM via Daimo',
  },
  {
    chainId: CHAIN_IDS.LINEA,
    provider: PROVIDER_NAMES.DAIMO,
    enabled: true,
    priority: 1,
    description: 'Linea mainnet via Daimo',
  },
  {
    chainId: CHAIN_IDS.MANTLE,
    provider: PROVIDER_NAMES.DAIMO,
    enabled: true,
    priority: 1,
    description: 'Mantle mainnet via Daimo',
  },
  {
    chainId: CHAIN_IDS.SCROLL,
    provider: PROVIDER_NAMES.DAIMO,
    enabled: true,
    priority: 1,
    description: 'Scroll mainnet via Daimo',
  },
  {
    chainId: CHAIN_IDS.ZKSYNC,
    provider: PROVIDER_NAMES.DAIMO,
    enabled: true,
    priority: 1,
    description: 'zkSync Era via Daimo',
  },

  // Aqua Provider Chains (new chains for Stellar)
  {
    chainId: CHAIN_IDS.STELLAR,
    provider: PROVIDER_NAMES.AQUA,
    enabled: true,
    priority: 1,
    description: 'Stellar via Aqua Payment Detection Service',
  },
];

// Utility functions for routing
export const getRoutingRule = (chainId: number): RoutingRule | undefined => {
  return routingRules.find((rule) => rule.chainId === chainId && rule.enabled);
};

export const getRoutingProviderForChain = (chainId: number): string => {
  const rule = getRoutingRule(chainId);
  return rule?.provider || routingConfig.defaultProvider;
};

export const isChainRouted = (chainId: number): boolean => {
  return getRoutingRule(chainId) !== undefined;
};

export const getEnabledRoutingRules = (): RoutingRule[] => {
  return routingRules.filter((rule) => rule.enabled);
};

export const getRoutingRulesByProvider = (provider: string): RoutingRule[] => {
  return routingRules.filter((rule) => rule.provider === provider && rule.enabled);
};

// Dynamic routing configuration from environment variables
export const getDynamicRoutingConfig = (): RoutingConfig => {
  const config = { ...routingConfig };

  // Override default provider if specified
  if (process.env.DEFAULT_PROVIDER) {
    config.defaultProvider = process.env.DEFAULT_PROVIDER;
  }

  // Override fallback setting
  if (process.env.ENABLE_FALLBACK !== undefined) {
    config.enableFallback = process.env.ENABLE_FALLBACK === 'true';
  }

  // Override max retries
  if (process.env.MAX_RETRIES) {
    const maxRetries = parseInt(process.env.MAX_RETRIES, 10);
    if (!isNaN(maxRetries) && maxRetries >= 0) {
      config.maxRetries = maxRetries;
    }
  }

  // Override timeout
  if (process.env.ROUTING_TIMEOUT) {
    const timeout = parseInt(process.env.ROUTING_TIMEOUT, 10);
    if (!isNaN(timeout) && timeout > 0) {
      config.timeout = timeout;
    }
  }

  // Override health check settings
  if (process.env.ENABLE_HEALTH_CHECKS !== undefined) {
    config.enableHealthChecks = process.env.ENABLE_HEALTH_CHECKS === 'true';
  }

  if (process.env.HEALTH_CHECK_INTERVAL) {
    const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL, 10);
    if (!isNaN(interval) && interval > 0) {
      config.healthCheckInterval = interval;
    }
  }

  return config;
};

// Chain ID to provider mapping for quick lookup
export const createChainProviderMap = (): Map<number, string> => {
  const map = new Map<number, string>();

  for (const rule of routingRules) {
    if (rule.enabled) {
      map.set(rule.chainId, rule.provider);
    }
  }

  return map;
};

// Provider to chain IDs mapping for reverse lookup
export const createProviderChainMap = (): Map<string, number[]> => {
  const map = new Map<string, number[]>();

  for (const rule of routingRules) {
    if (rule.enabled) {
      const chains = map.get(rule.provider) || [];
      chains.push(rule.chainId);
      map.set(rule.provider, chains);
    }
  }

  return map;
};

// Export the dynamic configuration
export const dynamicRoutingConfig = getDynamicRoutingConfig();
export const chainProviderMap = createChainProviderMap();
export const providerChainMap = createProviderChainMap();
