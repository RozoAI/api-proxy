// Provider Status Edge Function
// Original API Compatible: GET /api/providers/status
import '../shared/deno-types.ts';
import '../shared/deno-stdlib.d.ts';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../shared/cors.ts';
import { PaymentRouter } from '../shared/payment-router.ts';

const paymentRouter = new PaymentRouter();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
          message: 'Only GET requests are supported',
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get provider configurations and health status
    const providerConfigs = paymentRouter.getProviderConfigs();
    const providerHealth = await paymentRouter.checkProvidersHealth();

    // Merge configuration with health status
    const providers = Object.keys(providerConfigs).map((name) => ({
      ...providerConfigs[name],
      healthCheck: providerHealth[name] || {
        status: 'unknown',
        lastCheck: new Date().toISOString(),
        responseTime: 0,
      },
    }));

    const supportedChains = paymentRouter.getSupportedChains();

    const response = {
      providers,
      routing: {
        defaultProvider: 'daimo',
        chainMappings: Object.fromEntries(
          supportedChains
            .filter((chain) => chain.provider !== 'daimo')
            .map((chain) => [chain.chainId.toString(), chain.provider])
        ),
        supportedChains: supportedChains.map((chain) => ({
          chainId: chain.chainId,
          name: chain.name,
          provider: chain.provider,
          enabled: chain.enabled,
          tokens: chain.tokens || [],
        })),
      },
      stats: {
        totalProviders: providers.length,
        healthyProviders: providers.filter((p) => p.healthCheck.status === 'healthy').length,
        supportedChains: supportedChains.length,
        enabledChains: supportedChains.filter((c) => c.enabled).length,
      },
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[ProviderStatus] Error getting provider status:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to get provider status',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
