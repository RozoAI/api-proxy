// Payment Router for Edge Functions
// Modified to use Payment Manager as the primary provider while keeping pluggable architecture
import { PROVIDER_CONFIG, getProviderForChain } from './provider-config.ts';
import { AquaProvider } from './providers/aqua-provider.ts';
import { DaimoProvider } from './providers/daimo-provider.ts';
import { PaymentManagerProvider } from './providers/payment-manager-provider.ts';
import type { ChainConfig, PaymentRequest, PaymentResponse, ProviderConfig } from './types.ts';

export const SOLANA_CHAIN_ID = '900';
export const POLYGON_CHAIN_ID = '137';

// Updated chain configurations - Payment Manager is now the primary provider
const CHAIN_CONFIGS: ChainConfig[] = [
  // Payment Manager Provider - Primary provider for all chains
  { chainId: 1, name: 'Ethereum Mainnet', provider: 'payment-manager', enabled: true },
  { chainId: 11155111, name: 'Sepolia Testnet', provider: 'payment-manager', enabled: true },
  { chainId: 10, name: 'Optimism', provider: 'payment-manager', enabled: true },
  { chainId: 42161, name: 'Arbitrum One', provider: 'payment-manager', enabled: true },
  { chainId: 8453, name: 'Base', provider: 'payment-manager', enabled: true },
  { chainId: 56, name: 'BSC', provider: 'payment-manager', enabled: true },
  { chainId: 137, name: 'Polygon', provider: 'payment-manager', enabled: true },
  { chainId: 80001, name: 'Mumbai Testnet', provider: 'payment-manager', enabled: true },
  { chainId: 900, name: 'Solana Mainnet', provider: 'payment-manager', enabled: true },
  { chainId: 901, name: 'Solana Devnet', provider: 'payment-manager', enabled: true },
  { chainId: 1500, name: 'Stellar Mainnet', provider: 'payment-manager', enabled: true },
  { chainId: 1501, name: 'Stellar Testnet', provider: 'payment-manager', enabled: true },

  // Legacy providers - disabled by default but can be enabled if needed
  // Daimo Provider Chains (Ethereum Ecosystem) - DISABLED
  { chainId: 1, name: 'Ethereum Mainnet (Daimo)', provider: 'daimo', enabled: false },
  { chainId: 10, name: 'Optimism (Daimo)', provider: 'daimo', enabled: false },
  { chainId: 42161, name: 'Arbitrum One (Daimo)', provider: 'daimo', enabled: false },
  { chainId: 8453, name: 'Base (Daimo)', provider: 'daimo', enabled: false },
  { chainId: 56, name: 'BSC (Daimo)', provider: 'daimo', enabled: false },
  { chainId: 137, name: 'Polygon (Daimo)', provider: 'daimo', enabled: false },

  // Aqua Provider Chains (Stellar Ecosystem) - DISABLED
  {
    chainId: 1500,
    name: 'Stellar Mainnet (Aqua)',
    provider: 'aqua',
    enabled: false,
    tokens: ['XLM', 'USDC_XLM'],
  },
];

export class PaymentRouter {
  private providers: Map<string, DaimoProvider | AquaProvider | PaymentManagerProvider>;

  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize providers based on configuration
    Object.entries(PROVIDER_CONFIG.providers).forEach(([name, config]) => {
      if (config.enabled) {
        switch (name) {
          case 'payment-manager':
            this.providers.set(name, new PaymentManagerProvider(config as ProviderConfig));
            break;
          case 'daimo':
            this.providers.set(name, new DaimoProvider(config as ProviderConfig));
            break;
          case 'aqua':
            this.providers.set(name, new AquaProvider(config as ProviderConfig));
            break;
        }
      }
    });

    console.log(
      `[PaymentRouter] Initialized ${this.providers.size} providers:`,
      Array.from(this.providers.keys())
    );
  }

  async createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    const chainId = parseInt(paymentData.preferredChain);
    const providerName = this.getProviderForChain(paymentData.preferredChain);
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Provider ${providerName} not available for chain ${chainId}`);
    }

    console.log(
      `[PaymentRouter] Routing payment to ${providerName} for preferred chain ${chainId}, preferred token ${paymentData.preferredToken}`
    );

    // Validate request based on provider
    this.validatePaymentRequest(paymentData, providerName);

    try {
      return await provider.createPayment(paymentData);
    } catch (error) {
      console.error(`[PaymentRouter] Error creating payment with ${providerName}:`, error);
      throw error;
    }
  }

  async getPayment(paymentId: string, chainId: string): Promise<PaymentResponse> {
    const providerName = this.getProviderForChain(chainId);
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Provider ${providerName} not available for chain ${chainId}`);
    }

    try {
      return await provider.getPayment(paymentId);
    } catch (error) {
      console.error(`[PaymentRouter] Error getting payment with ${providerName}:`, error);
      throw error;
    }
  }

  getProviderForChain(chainId: string): string {
    // Use the configuration helper function
    return getProviderForChain(chainId);
  }

  private validatePaymentRequest(paymentData: PaymentRequest, providerName: string): void {
    // Common validations
    if (!paymentData.display?.intent) {
      throw new Error('Payment intent is required');
    }

    if (
      !paymentData.destination?.amountUnits ||
      parseFloat(paymentData.destination.amountUnits) <= 0
    ) {
      throw new Error('Valid amount is required');
    }

    // Provider-specific validations
    switch (providerName) {
      case 'payment-manager':
        this.validatePaymentManagerRequest(paymentData);
        break;
      case 'daimo':
        this.validateDaimoRequest(paymentData);
        break;
      case 'aqua':
        this.validateAquaRequest(paymentData);
        break;
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  private validatePaymentManagerRequest(paymentData: PaymentRequest): void {
    // Payment Manager supports all chains now
    // No specific chain validation needed
  }

  private validateDaimoRequest(paymentData: PaymentRequest): void {
    // Daimo supports all EVM chains and tokens
    const supportedChains = [
      1, 10, 137, 42161, 8453, 56, 43114, 250, 314, 42220, 100, 1101, 59144, 5000, 534352, 324,
    ];
    const chainId = parseInt(paymentData.preferredChain);

    if (!supportedChains.includes(chainId)) {
      throw new Error(`Daimo does not support chain ID: ${chainId}`);
    }
  }

  private validateAquaRequest(paymentData: PaymentRequest): void {
    // Aqua only supports Stellar (10001)
    if (paymentData.preferredChain !== '10001') {
      throw new Error('Aqua only supports Stellar (chain ID: 10001)');
    }

    // Validate token
    const supportedTokens = ['XLM', 'USDC_XLM'];
    if (!supportedTokens.includes(paymentData.preferredToken)) {
      throw new Error(`Aqua does not support token: ${paymentData.preferredToken}`);
    }
  }

  async checkProvidersHealth(): Promise<Record<string, any>> {
    const healthResults: Record<string, any> = {};

    for (const [name, provider] of this.providers) {
      try {
        healthResults[name] = await provider.healthCheck();
      } catch (error) {
        healthResults[name] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: new Date().toISOString(),
        };
      }
    }

    return healthResults;
  }

  getSupportedChains(): ChainConfig[] {
    return CHAIN_CONFIGS.filter((chain) => chain.enabled);
  }

  getProviderConfigs(): Record<string, any> {
    return PROVIDER_CONFIG.providers;
  }
}
