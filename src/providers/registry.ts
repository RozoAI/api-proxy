/**
 * Provider Registry System
 * Manages registration and routing of payment providers
 */

import { PaymentProvider, ProviderStatus } from '../types/provider';
import { getChainConfig, getEnabledChains } from '../config/chains';

export class ProviderRegistry {
  private providers: Map<string, PaymentProvider> = new Map();
  private chainProviderMap: Map<number, PaymentProvider> = new Map();
  private healthStatus: Map<string, boolean> = new Map();

  /**
   * Register a new payment provider
   */
  registerProvider(provider: PaymentProvider): void {
    if (this.providers.has(provider.name)) {
      console.warn(`Provider ${provider.name} is already registered, overwriting...`);
    }

    this.providers.set(provider.name, provider);

    // Update chain mapping
    for (const chainId of provider.supportedChains) {
      this.chainProviderMap.set(chainId, provider);
    }

    console.log(
      `[Registry] Registered provider: ${provider.name} for chains: ${provider.supportedChains.join(', ')}`
    );
  }

  /**
   * Unregister a payment provider
   */
  unregisterProvider(providerName: string): void {
    const provider = this.providers.get(providerName);
    if (!provider) {
      console.warn(`Provider ${providerName} not found for unregistration`);
      return;
    }

    // Remove from providers map
    this.providers.delete(providerName);

    // Remove from chain mapping
    for (const chainId of provider.supportedChains) {
      if (this.chainProviderMap.get(chainId)?.name === providerName) {
        this.chainProviderMap.delete(chainId);
      }
    }

    // Remove health status
    this.healthStatus.delete(providerName);

    console.log(`[Registry] Unregistered provider: ${providerName}`);
  }

  /**
   * Get provider for a specific chain ID
   */
  getProviderForChain(chainId: number): PaymentProvider | null {
    // First check if we have a direct mapping
    const provider = this.chainProviderMap.get(chainId);
    if (provider) {
      return provider;
    }

    // Check if chain is configured but provider not registered
    const chainConfig = getChainConfig(chainId);
    if (chainConfig && chainConfig.enabled) {
      console.warn(
        `[Registry] Chain ${chainId} configured for provider ${chainConfig.provider} but provider not registered`
      );
    }

    return null;
  }

  /**
   * Get default provider (highest priority)
   */
  getDefaultProvider(): PaymentProvider | null {
    if (this.providers.size === 0) {
      return null;
    }

    // Return provider with highest priority (lowest number)
    let defaultProvider: PaymentProvider | null = null;
    let highestPriority = Infinity;

    for (const provider of this.providers.values()) {
      if (provider.priority < highestPriority) {
        highestPriority = provider.priority;
        defaultProvider = provider;
      }
    }

    return defaultProvider;
  }

  /**
   * Get all healthy providers
   */
  async getHealthyProviders(): Promise<PaymentProvider[]> {
    const healthyProviders: PaymentProvider[] = [];

    for (const provider of this.providers.values()) {
      try {
        const isHealthy = await provider.isHealthy();
        this.healthStatus.set(provider.name, isHealthy);

        if (isHealthy) {
          healthyProviders.push(provider);
        }
      } catch (error) {
        console.error(`[Registry] Health check failed for ${provider.name}:`, error);
        this.healthStatus.set(provider.name, false);
      }
    }

    return healthyProviders;
  }

  /**
   * Get status of all providers
   */
  async getProviderStatus(): Promise<ProviderStatus[]> {
    const status: ProviderStatus[] = [];

    for (const provider of this.providers.values()) {
      const isHealthy = this.healthStatus.get(provider.name) ?? false;

      status.push({
        name: provider.name,
        enabled: true, // All registered providers are enabled
        healthy: isHealthy,
        supportedChains: provider.supportedChains,
        lastCheck: new Date(),
      });
    }

    return status;
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): PaymentProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider by name
   */
  getProviderByName(name: string): PaymentProvider | null {
    return this.providers.get(name) || null;
  }

  /**
   * Check if provider is registered
   */
  isProviderRegistered(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get all supported chain IDs
   */
  getSupportedChains(): number[] {
    return Array.from(this.chainProviderMap.keys());
  }

  /**
   * Update health status for a provider
   */
  updateHealthStatus(providerName: string, isHealthy: boolean): void {
    this.healthStatus.set(providerName, isHealthy);
  }

  /**
   * Get health status for a provider
   */
  getHealthStatus(providerName: string): boolean {
    return this.healthStatus.get(providerName) ?? false;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalProviders: number;
    healthyProviders: number;
    supportedChains: number;
    totalChains: number;
  } {
    const healthyProviders = Array.from(this.healthStatus.values()).filter(Boolean).length;
    const enabledChains = getEnabledChains();

    return {
      totalProviders: this.providers.size,
      healthyProviders,
      supportedChains: this.chainProviderMap.size,
      totalChains: enabledChains.length,
    };
  }
}
