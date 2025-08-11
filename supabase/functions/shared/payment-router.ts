// Payment Router for Edge Functions
// Migrated from original Express.js architecture with sophisticated provider management
import { AquaProvider } from './providers/aqua-provider.ts';
import { DaimoProvider } from './providers/daimo-provider.ts';
import { PaymentManagerProvider } from './providers/payment-manager-provider.ts';
import type { ChainConfig, PaymentRequest, PaymentResponse, ProviderConfig } from './types.ts';

export const SOLANA_CHAIN_ID = '10002';
export const POLYGON_CHAIN_ID = '137';

// Complete chain configurations matching original architecture
const CHAIN_CONFIGS: ChainConfig[] = [
  // Daimo Provider Chains (Ethereum Ecosystem)
  { chainId: 1, name: 'Ethereum Mainnet', provider: 'daimo', enabled: true },
  { chainId: 10, name: 'Optimism', provider: 'daimo', enabled: true },
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
  {
    chainId: 10001,
    name: 'Stellar',
    provider: 'aqua',
    enabled: true,
    tokens: ['XLM', 'USDC_XLM'],
  },

  // Payment Manager Provider Chains (Solana Ecosystem)
  {
    chainId: parseInt(SOLANA_CHAIN_ID),
    name: 'Solana',
    provider: 'payment-manager',
    enabled: true,
    tokens: ['USDC'],
  },

  { chainId: 137, name: 'Polygon', provider: 'payment-manager', enabled: true },
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
  'payment-manager': {
    name: 'payment-manager',
    baseUrl: Deno.env.get('PAYMENT_MANAGER_BASE_URL') || 'https://rozo-payment-manager.example.com',
    apiKey: Deno.env.get('PAYMENT_MANAGER_API_KEY'),
    timeout: 30000,
    enabled: true,
  },
};

export class PaymentRouter {
  private providers: Map<string, DaimoProvider | AquaProvider | PaymentManagerProvider>;

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

    // Initialize Payment Manager provider
    if (PROVIDER_CONFIGS['payment-manager'].enabled) {
      this.providers.set(
        'payment-manager',
        new PaymentManagerProvider(PROVIDER_CONFIGS['payment-manager'])
      );
    }

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
    const chainConfig = CHAIN_CONFIGS.find(
      (chain) => chain.chainId.toString() === chainId.toString()
    );

    if (!chainConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    if (!chainConfig.enabled) {
      throw new Error(`Chain ${chainId} is disabled`);
    }

    return chainConfig.provider;
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
      case 'daimo':
        this.validateDaimoRequest(paymentData);
        break;
      case 'aqua':
        this.validateAquaRequest(paymentData);
        break;
      case 'payment-manager':
        this.validatePaymentManagerRequest(paymentData);
        break;
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
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

  private validatePaymentManagerRequest(paymentData: PaymentRequest): void {
    // Payment Manager only supports Solana (SOLANA_CHAIN_ID)
    if (
      !(
        paymentData.preferredChain == SOLANA_CHAIN_ID ||
        paymentData.preferredChain == POLYGON_CHAIN_ID
      )
    ) {
      throw new Error('Payment Manager only supports Solana and Polygon');
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
    return PROVIDER_CONFIGS;
  }
}
