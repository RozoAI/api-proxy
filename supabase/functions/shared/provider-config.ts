// Provider Configuration for Edge Functions
// Easy switching between providers by modifying this file

export const PROVIDER_CONFIG = {
  // Primary provider - set to 'payment-manager' to use only Payment Manager
  primaryProvider: 'payment-manager',

  // Enable/disable specific providers
  providers: {
    'payment-manager': {
      enabled: true,
      name: 'payment-manager',
      baseUrl:
        Deno.env.get('PAYMENT_MANAGER_BASE_URL') || 'https://rozo-payment-manager.example.com',
      apiKey: Deno.env.get('PAYMENT_MANAGER_API_KEY'),
      timeout: 30000,
    },
    daimo: {
      enabled: false, // Set to true to enable Daimo
      name: 'daimo',
      baseUrl: Deno.env.get('DAIMO_BASE_URL') || 'https://pay.daimo.com',
      apiKey: Deno.env.get('DAIMO_API_KEY'),
      timeout: 30000,
    },
    aqua: {
      enabled: false, // Set to true to enable Aqua
      name: 'aqua',
      baseUrl: Deno.env.get('AQUA_BASE_URL') || 'https://api.aqua.network',
      apiKey: Deno.env.get('AQUA_API_TOKEN'),
      timeout: 30000,
    },
  },

  // Chain routing configuration
  // Set to 'payment-manager' to route all chains to Payment Manager
  chainRouting: {
    defaultProvider: 'payment-manager',
    // Override specific chains if needed
    overrides: {
      // Example: '10001': 'aqua', // Route Stellar to Aqua
      // Example: '1': 'daimo',    // Route Ethereum to Daimo
    },
  },

  // Webhook configuration
  webhooks: {
    'payment-manager': {
      enabled: true,
      withdrawalIntegration: false, // No withdrawal for Payment Manager
    },
    daimo: {
      enabled: false,
      withdrawalIntegration: true,
    },
    aqua: {
      enabled: false,
      withdrawalIntegration: true,
    },
  },

  // Rozo Rewards API configuration
  rozorewards: {
    baseUrl: 'https://api.rozo.ai/v1',
    token: Deno.env.get('ROZOREWARD_TOKEN') || 'your-rozoreward-token-here',
  },
};

// Helper function to get provider for a chain
export function getProviderForChain(chainId: string): string {
  const override = PROVIDER_CONFIG.chainRouting.overrides[chainId];
  if (override && PROVIDER_CONFIG.providers[override]?.enabled) {
    return override;
  }
  return PROVIDER_CONFIG.chainRouting.defaultProvider;
}

// Helper function to check if provider is enabled
export function isProviderEnabled(providerName: string): boolean {
  return PROVIDER_CONFIG.providers[providerName]?.enabled || false;
}

// Helper function to get provider config
export function getProviderConfig(providerName: string) {
  return PROVIDER_CONFIG.providers[providerName];
}
