// Payment Router for Edge Functions
// Migrated from original Express.js architecture with sophisticated provider management
import { DaimoProvider } from './providers/daimo-provider.ts';
import { AquaProvider } from './providers/aqua-provider.ts';
import type { PaymentRequest, PaymentResponse, ProviderConfig, ChainConfig } from './types.ts';

// Complete chain configurations matching original architecture
const CHAIN_CONFIGS: ChainConfig[] = [
  // Daimo Provider Chains (Ethereum Ecosystem)
  { chainId: 1, name: 'Ethereum Mainnet', provider: 'daimo', enabled: true },
  { chainId: 10, name: 'Optimism', provider: 'daimo', enabled: true },
  { chainId: 137, name: 'Polygon', provider: 'daimo', enabled: true },
  { chainId: 42161, name: 'Arbitrum One', provider: 'daimo', enabled: true },
  { chainId: 8453, name: 'Base', provider: 'daimo', enabled: true },
  { chainId: 56, name: 'BSC', provider: 'daimo', enabled: true },
  { chainId: 43114, name: 'Avalanche', provider: 'daimo', enabled: true },
  { chainId: 250, name: 'Fantom', provider: 'daimo', enabled: true },
  { chainId: 314, name: 'Filecoin', provider: 'daimo', enabled: true },
  { chainId: 42220, name: 'Celo', provider: 'daimo', enabled: true },
  { chainId: 100, name: 'Gnosis', provider: 'daimo', enabled: true },
  { chainId: 1101, name: 'Polygon zkEVM', provider: 'daimo', enabled: true },
  { chainId: 59144, name: 'Linea', provider: 'daimo', enabled: true },
  { chainId: 5000, name: 'Mantle', provider: 'daimo', enabled: true },
  { chainId: 534352, name: 'Scroll', provider: 'daimo', enabled: true },
  { chainId: 324, name: 'zkSync', provider: 'daimo', enabled: true },

  // Aqua Provider Chains (Stellar Ecosystem)
  { chainId: 10001, name: 'Stellar', provider: 'aqua', enabled: true, tokens: ['XLM', 'USDC_XLM'] },
];

// Provider configurations
const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  daimo: {
    name: 'daimo',
    baseUrl: Deno.env.get('DAIMO_BASE_URL') || 'https://pay.daimo.com',
    apiKey: Deno.env.get('DAIMO_API_KEY'),
    timeout: 30000,
    enabled: true,
  },
  aqua: {
    name: 'aqua',
    baseUrl: Deno.env.get('AQUA_BASE_URL') || 'https://api.aqua.network',
    apiKey: Deno.env.get('AQUA_API_TOKEN'),
    timeout: 30000,
    enabled: true,
  },
};

export class PaymentRouter {
  private providers: Map<string, DaimoProvider | AquaProvider>;

  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize Daimo provider
    if (PROVIDER_CONFIGS.daimo.enabled) {
      this.providers.set('daimo', new DaimoProvider(PROVIDER_CONFIGS.daimo));
    }

    // Initialize Aqua provider
    if (PROVIDER_CONFIGS.aqua.enabled) {
      this.providers.set('aqua', new AquaProvider(PROVIDER_CONFIGS.aqua));
    }

    console.log(
      `[PaymentRouter] Initialized ${this.providers.size} providers:`,
      Array.from(this.providers.keys())
    );
  }

  async createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    const chainId = parseInt(paymentData.destination.chainId);
    const providerName = this.getProviderForChain(paymentData.destination.chainId);
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Provider ${providerName} not available for chain ${chainId}`);
    }

    console.log(`[PaymentRouter] Routing payment to ${providerName} for chain ${chainId}`);

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

    console.log(`[PaymentRouter] Getting payment from ${providerName} for payment ${paymentId}`);

    try {
      return await provider.getPayment(paymentId);
    } catch (error) {
      console.error(`[PaymentRouter] Error getting payment from ${providerName}:`, error);
      throw error;
    }
  }

  getProviderForChain(chainId: string): string {
    const chainIdNum = parseInt(chainId);
    const config = CHAIN_CONFIGS.find((c) => c.chainId === chainIdNum && c.enabled);

    if (!config) {
      console.warn(`[PaymentRouter] No config found for chain ${chainId}, using default provider`);
      return 'daimo'; // Default provider
    }

    const provider = this.providers.get(config.provider);
    if (!provider || !provider.isEnabled()) {
      console.warn(`[PaymentRouter] Provider ${config.provider} not available, using default`);
      return 'daimo'; // Fallback to default
    }

    return config.provider;
  }

  private validatePaymentRequest(paymentData: PaymentRequest, providerName: string): void {
    const { destination } = paymentData;

    // Validate required fields
    if (!destination.destinationAddress) {
      throw new Error('Destination address is required');
    }

    if (!destination.amountUnits || parseFloat(destination.amountUnits) <= 0) {
      throw new Error('Valid amount is required');
    }

    // Provider-specific validation
    if (providerName === 'aqua') {
      this.validateAquaRequest(paymentData);
    } else if (providerName === 'daimo') {
      this.validateDaimoRequest(paymentData);
    }
  }

  private validateAquaRequest(paymentData: PaymentRequest): void {
    const { destination } = paymentData;
    const provider = this.providers.get('aqua') as AquaProvider;

    // Validate Stellar address
    if (!provider.isValidStellarAddress(destination.destinationAddress)) {
      throw new Error('Invalid Stellar address format');
    }

    // Validate amount (Stellar supports up to 7 decimal places)
    if (!provider.isValidStellarAmount(destination.amountUnits)) {
      throw new Error('Invalid amount format for Stellar (max 7 decimal places)');
    }

    // Validate token symbol is provided for Aqua
    if (!destination.tokenSymbol) {
      throw new Error('Token symbol is required for Stellar payments');
    }

    // Validate supported tokens
    const supportedTokens = ['XLM', 'USDC_XLM', 'USDC'];
    if (!supportedTokens.includes(destination.tokenSymbol)) {
      throw new Error(
        `Unsupported token: ${destination.tokenSymbol}. Supported: ${supportedTokens.join(', ')}`
      );
    }
  }

  private validateDaimoRequest(paymentData: PaymentRequest): void {
    const { destination } = paymentData;

    // Validate Ethereum address format
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(destination.destinationAddress)) {
      throw new Error('Invalid Ethereum address format');
    }

    // Validate token address is provided for Daimo
    if (!destination.tokenAddress) {
      throw new Error('Token address is required for EVM payments');
    }

    if (!ethAddressRegex.test(destination.tokenAddress)) {
      throw new Error('Invalid token address format');
    }
  }

  // Health check for all providers
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

  // Get supported chains
  getSupportedChains(): ChainConfig[] {
    return CHAIN_CONFIGS.filter((chain) => {
      const provider = this.providers.get(chain.provider);
      return chain.enabled && provider && provider.isEnabled();
    });
  }

  // Get provider configurations (for status endpoint)
  getProviderConfigs(): Record<string, any> {
    const configs: Record<string, any> = {};

    for (const [name, provider] of this.providers) {
      const supportedChains = CHAIN_CONFIGS.filter((c) => c.provider === name && c.enabled).map(
        (c) => c.chainId
      );

      configs[name] = {
        name: provider.getName(),
        baseUrl: provider.getBaseUrl(),
        enabled: provider.isEnabled(),
        timeout: provider.getTimeout(),
        supportedChains,
      };
    }

    return configs;
  }
}
