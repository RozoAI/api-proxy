/**
 * Provider Configuration Management
 * Manages provider configurations with environment variable support
 */

import { ProviderConfig } from '../types/provider';

// Provider configurations with environment variable support
export const providerConfigs: Record<string, ProviderConfig> = {
  daimo: {
    name: 'daimo',
    baseUrl: 'https://pay.daimo.com',
    apiKey: process.env.DAIMO_API_KEY,
    timeout: parseInt(process.env.DAIMO_TIMEOUT || '30000', 10),
    retries: parseInt(process.env.DAIMO_RETRIES || '3', 10),
    enabled: process.env.DAIMO_ENABLED !== 'false', // Default to true
    priority: parseInt(process.env.DAIMO_PRIORITY || '1', 10),
    description: 'Daimo Pay - Primary payment provider for most chains'
  },
  
  aqua: {
    name: 'aqua',
    baseUrl: process.env.AQUA_BASE_URL || 'https://your-aqua-service.com',
    timeout: parseInt(process.env.AQUA_TIMEOUT || '30000', 10),
    retries: parseInt(process.env.AQUA_RETRIES || '3', 10),
    enabled: process.env.AQUA_ENABLED !== 'false', // Default to true
    priority: parseInt(process.env.AQUA_PRIORITY || '2', 10),
    description: 'Aqua Payment Detection Service - For Stellar and future chains'
  }
};

// Provider constants
export const PROVIDER_NAMES = {
  DAIMO: 'daimo',
  AQUA: 'aqua'
} as const;

export type ProviderName = typeof PROVIDER_NAMES[keyof typeof PROVIDER_NAMES];

// Utility functions
export const getProviderConfig = (providerName: string): ProviderConfig | undefined => {
  return providerConfigs[providerName];
};

export const getEnabledProviders = (): ProviderConfig[] => {
  return Object.values(providerConfigs).filter(provider => provider.enabled);
};

export const isProviderEnabled = (providerName: string): boolean => {
  const provider = getProviderConfig(providerName);
  return provider?.enabled || false;
};

export const getProviderPriority = (providerName: string): number => {
  const provider = getProviderConfig(providerName);
  return provider?.priority || 999; // High number for unknown providers
};

export const getDefaultProvider = (): ProviderConfig | null => {
  const enabledProviders = getEnabledProviders();
  if (enabledProviders.length === 0) return null;
  
  // Return the provider with highest priority (lowest number)
  return enabledProviders.reduce((prev, current) => 
    prev.priority < current.priority ? prev : current
  );
};

// Environment variable validation
export const validateProviderConfigs = (): string[] => {
  const errors: string[] = [];
  
  for (const [name, config] of Object.entries(providerConfigs)) {
    if (config.enabled) {
      if (!config.baseUrl) {
        errors.push(`Provider ${name}: baseUrl is required`);
      }
      
      if (name === 'daimo' && !config.apiKey) {
        errors.push(`Provider ${name}: DAIMO_API_KEY environment variable is required`);
      }
      
      if (config.timeout <= 0) {
        errors.push(`Provider ${name}: timeout must be greater than 0`);
      }
      
      if (config.retries < 0) {
        errors.push(`Provider ${name}: retries must be 0 or greater`);
      }
    }
  }
  
  return errors;
};

// Configuration override from environment
export const getProviderConfigWithOverrides = (providerName: string): ProviderConfig | undefined => {
  const config = getProviderConfig(providerName);
  if (!config) return undefined;

  // Create a copy to avoid mutating the original
  const overriddenConfig = { ...config };

  // Override with environment variables if they exist
  const envPrefix = providerName.toUpperCase();
  
  if (process.env[`${envPrefix}_BASE_URL`]) {
    overriddenConfig.baseUrl = process.env[`${envPrefix}_BASE_URL`]!;
  }
  
  if (process.env[`${envPrefix}_API_KEY`]) {
    overriddenConfig.apiKey = process.env[`${envPrefix}_API_KEY`]!;
  }
  
  if (process.env[`${envPrefix}_TIMEOUT`]) {
    const timeout = parseInt(process.env[`${envPrefix}_TIMEOUT`]!, 10);
    if (!isNaN(timeout) && timeout > 0) {
      overriddenConfig.timeout = timeout;
    }
  }
  
  if (process.env[`${envPrefix}_RETRIES`]) {
    const retries = parseInt(process.env[`${envPrefix}_RETRIES`]!, 10);
    if (!isNaN(retries) && retries >= 0) {
      overriddenConfig.retries = retries;
    }
  }
  
  if (process.env[`${envPrefix}_ENABLED`] !== undefined) {
    overriddenConfig.enabled = process.env[`${envPrefix}_ENABLED`] === 'true';
  }
  
  if (process.env[`${envPrefix}_PRIORITY`]) {
    const priority = parseInt(process.env[`${envPrefix}_PRIORITY`]!, 10);
    if (!isNaN(priority)) {
      overriddenConfig.priority = priority;
    }
  }

  return overriddenConfig;
};

// Get all provider configs with overrides
export const getAllProviderConfigsWithOverrides = (): Record<string, ProviderConfig> => {
  const overriddenConfigs: Record<string, ProviderConfig> = {};
  
  for (const providerName of Object.keys(providerConfigs)) {
    const overriddenConfig = getProviderConfigWithOverrides(providerName);
    if (overriddenConfig) {
      overriddenConfigs[providerName] = overriddenConfig;
    }
  }
  
  return overriddenConfigs;
};

// Configuration validation on startup
export const validateAllConfigurations = (): { isValid: boolean; errors: string[] } => {
  const errors = validateProviderConfigs();
  
  // Additional validations can be added here
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Log configuration on startup
export const logProviderConfigurations = (): void => {
  console.log('\n=== Provider Configurations ===');
  
  for (const [name, config] of Object.entries(providerConfigs)) {
    console.log(`\n${name.toUpperCase()}:`);
    console.log(`  Enabled: ${config.enabled}`);
    console.log(`  Base URL: ${config.baseUrl}`);
    console.log(`  Timeout: ${config.timeout}ms`);
    console.log(`  Retries: ${config.retries}`);
    console.log(`  Priority: ${config.priority}`);
    console.log(`  API Key: ${config.apiKey ? '***configured***' : 'not configured'}`);
  }
  
  console.log('\n===============================\n');
}; 